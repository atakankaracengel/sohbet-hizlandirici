(() => {
  const CONFIG_KEY = 'cgpt_scroll_config_v1';
  const EXTRA_KEY = 'cgpt_scroll_extra_v1';
  const DEFAULTS = { enabled: true, limit: 30, chunkSize: 10, autoTrim: true, showToolbar: false };
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function sanitize(raw) {
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
      limit: clamp(Number(raw.limit) || DEFAULTS.limit, 1, 5000),
      chunkSize: clamp(Number(raw.chunkSize) || DEFAULTS.chunkSize, 1, 100),
      autoTrim: typeof raw.autoTrim === 'boolean' ? raw.autoTrim : DEFAULTS.autoTrim,
      showToolbar: typeof raw.showToolbar === 'boolean' ? raw.showToolbar : DEFAULTS.showToolbar
    };
  }
  let settings = (() => {
    try { const raw = localStorage.getItem(CONFIG_KEY); return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULTS }; }
    catch { return { ...DEFAULTS }; }
  })();
  let lastStatus = { layoutSupported: null, totalMessages: 0, renderedMessages: 0, hiddenMessages: 0, hasOlderMessages: false, extraMessages: 0, active: !!(settings.enabled && settings.autoTrim) };

  function parseExtra() {
    try { if (sessionStorage.getItem('cgptscroll_showall')) { sessionStorage.removeItem('cgptscroll_showall'); return 4990; } } catch {}
    try { const raw = localStorage.getItem(EXTRA_KEY); if (!raw) return 0; const p = JSON.parse(raw); if (!p || p.url !== location.href) return 0; return clamp(Number(p.extra) || 0, 0, 1000); } catch { return 0; }
  }
  function postStatus(patch) {
    lastStatus = { ...lastStatus, ...patch, active: !!(settings.enabled && settings.autoTrim) };
    window.postMessage({ source: 'cgpt_scroll_main', type: 'cgptscroll-status', payload: lastStatus }, location.origin);
  }
  function isConversationGet(url, method) {
    return method === 'GET' && /\/backend-api\/(f\/)?conversation\//.test(url) && !/\/backend-api\/(f\/)?conversations(\/|\?|$)/.test(url);
  }
  function isMessageNode(n) { return Boolean(n && typeof n === 'object' && n.message && typeof n.message === 'object'); }
  function isVisibleMessage(n) { if (!isMessageNode(n)) return false; const r = n.message.author?.role; return r === 'user' || r === 'assistant'; }
  function buildPath(mapping, current) {
    const path = [], guard = new Set(); let id = current;
    while (id && mapping[id] && !guard.has(id)) { guard.add(id); path.unshift(id); id = mapping[id].parent; }
    return path;
  }
  function cloneNode(n) { return JSON.parse(JSON.stringify(n)); }
  function trimConversationPayload(payload) {
    if (!payload || !payload.mapping || !payload.current_node) return null;
    const mapping = payload.mapping;
    const path = buildPath(mapping, payload.current_node); if (!path.length) return null;
    const bubblePath = path.filter(id => isVisibleMessage(mapping[id]));
    const extra = parseExtra();
    const keepCount = clamp(settings.limit + extra, 1, 5000);
    let startIndex = 0;
    if (bubblePath.length > keepCount) { const firstKept = bubblePath[bubblePath.length - keepCount]; const idx = path.indexOf(firstKept); startIndex = idx >= 0 ? idx : 0; }
    const keptPath = path.slice(startIndex), keptSet = new Set(keptPath);
    const newMapping = {};
    for (let i = 0; i < keptPath.length; i++) {
      const id = keptPath[i], src = mapping[id]; if (!src) continue;
      const node = cloneNode(src);
      node.children = Array.isArray(node.children) ? node.children.filter(c => keptSet.has(c)) : [];
      if (i === 0) node.parent = null; else if (!keptSet.has(node.parent)) node.parent = keptPath[i-1] || null;
      newMapping[id] = node;
    }
    const rendered = keptPath.filter(id => isVisibleMessage(mapping[id])).length;
    const total = bubblePath.length, hidden = Math.max(0, total - rendered);
    return {
      json: { ...payload, mapping: newMapping, current_node: keptSet.has(payload.current_node) ? payload.current_node : keptPath[keptPath.length-1], root: keptPath[0] },
      status: { layoutSupported: true, totalMessages: total, renderedMessages: rendered, hiddenMessages: hidden, hasOlderMessages: hidden > 0, extraMessages: extra }
    };
  }
  function resetExtraAfterNewPrompt(url, method) {
    if (method !== 'POST') return; if (!/\/backend-api\/(f\/)?conversation(\?|$)/.test(url)) return;
    try { localStorage.setItem(EXTRA_KEY, JSON.stringify({ url: location.href, extra: 0 })); } catch {}
  }
  function patchFetch() {
    if (window.__cgptscrollFetchPatched) return; window.__cgptscrollFetchPatched = true;
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const input = args[0], init = args[1] || {};
      const url = input instanceof Request ? input.url : String(input);
      const method = (init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
      resetExtraAfterNewPrompt(url, method);
      if (!(settings.enabled && settings.autoTrim && isConversationGet(url, method))) return orig(...args);
      const response = await orig(...args);
      try {
        const text = await response.clone().text(), parsed = JSON.parse(text), trimmed = trimConversationPayload(parsed);
        if (!trimmed) { postStatus({ layoutSupported: false }); return response; }
        postStatus(trimmed.status);
        const headers = new Headers(response.headers); headers.delete('content-length'); headers.delete('content-encoding');
        return new Response(JSON.stringify(trimmed.json), { status: response.status, statusText: response.statusText, headers });
      } catch { postStatus({ layoutSupported: false }); return response; }
    };
  }
  const _push = history.pushState.bind(history);
  history.pushState = function(...args) { _push(...args); window.postMessage({ source: 'cgpt_scroll_main', type: 'cgptscroll-navigation', url: location.href }, location.origin); };
  window.addEventListener('popstate', () => window.postMessage({ source: 'cgpt_scroll_main', type: 'cgptscroll-navigation', url: location.href }, location.origin));
  window.addEventListener('cgptscroll-config', e => {
    const inc = e?.detail; if (!inc || typeof inc !== 'object') return;
    settings = sanitize({ ...settings, ...inc });
    postStatus({ active: !!(settings.enabled && settings.autoTrim) });
  });
  window.addEventListener('cgptscroll-request-status', () => postStatus({}));
  patchFetch(); postStatus({});
})();