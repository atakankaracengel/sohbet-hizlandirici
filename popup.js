(() => {
  const DEFAULTS = { enabled: true, limit: 30, chunkSize: 10, autoTrim: true, showToolbar: false };
  const $ = s => document.querySelector(s);

  function storageArea() { return chrome.storage.sync || chrome.storage.local; }
  function t(key, subs) { try { return chrome.i18n.getMessage(key, subs) || key; } catch { return key; } }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function isSupportedUrl(url) {
    if (typeof url !== 'string') return false;
    try { const u = new URL(url); return u.protocol === 'https:' && (u.hostname === 'chatgpt.com' || u.hostname === 'chat.openai.com'); }
    catch { return false; }
  }
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const msg = t(el.getAttribute('data-i18n'));
      if (msg) el.textContent = msg;
    });
  }

  async function loadSettings() {
    try {
      const raw = await storageArea().get(DEFAULTS);
      return {
        enabled:     typeof raw.enabled === 'boolean'     ? raw.enabled     : DEFAULTS.enabled,
        limit:       clamp(Number(raw.limit)     || DEFAULTS.limit,     1, 5000),
        chunkSize:   clamp(Number(raw.chunkSize) || DEFAULTS.chunkSize, 1, 100),
        autoTrim:    typeof raw.autoTrim === 'boolean'    ? raw.autoTrim    : DEFAULTS.autoTrim,
        showToolbar: typeof raw.showToolbar === 'boolean' ? raw.showToolbar : DEFAULTS.showToolbar
      };
    } catch { return { ...DEFAULTS }; }
  }
  async function saveSettings(p) { try { await storageArea().set(p); } catch {} }
  async function pushSettings() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isSupportedUrl(tab.url)) return;
    try { const s = await loadSettings(); await chrome.tabs.sendMessage(tab.id, { type: 'settingsUpdated', payload: s }); } catch {}
  }

  async function refreshRuntime() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isSupportedUrl(tab.url)) return;
    try {
      const r = await chrome.tabs.sendMessage(tab.id, { type: 'getStatus' });
      if (r?.ok) updateStatusChip(r), updateStats(r);
      else updateStatusChip({ layoutSupported: false }), updateStats(null);
    } catch { updateStatusChip({ layoutSupported: false }), updateStats(null); }
  }

  function updateStatusChip(rt) {
    const dot = $('#statusDot'), text = $('#statusText');
    const supported = rt && rt.layoutSupported;
    const enabled = rt ? rt.enabled : true;
    if (supported === null || supported === undefined) {
      dot.className = 'strip-dot strip-dot--wait';
      text.textContent = 'Hazırlanıyor';
      return;
    }
    if (!supported) {
      dot.className = 'strip-dot strip-dot--off';
      text.textContent = t('layoutUnsupported');
      return;
    }
    if (!enabled) {
      dot.className = 'strip-dot strip-dot--off';
      text.textContent = t('statusPaused');
      return;
    }
    dot.className = 'strip-dot';
    text.textContent = t('statusActive');
  }
  function updateStats(rt) {
    const r = rt?.renderedMessages ?? 0, total = rt?.totalMessages ?? 0, hidden = rt?.hiddenMessages ?? 0;
    $('#renderedCount').textContent = total ? r : '—';
    $('#totalCount').textContent = total || '—';
    $('#memorySaved').textContent = total ? hidden : '—';
    const fill = $('#progressFill'), info = $('#progressInfo'), info2 = $('#progressInfo2');
    if (total > 0) {
      fill.style.width = Math.round(r / total * 100) + '%';
      info.classList.remove('empty');
      info.textContent = `${r} rendered`;
      info2.textContent = `${hidden} hidden`;
    } else {
      fill.style.width = '0%';
      info.classList.add('empty');
      info.textContent = t('progressInfoEmpty');
      info2.textContent = '';
    }
  }

  function bindStepper(inputId, min, max, onChange) {
    const input = $('#' + inputId);
    const dec = $('#' + inputId.replace('Display', 'Dec'));
    const inc = $('#' + inputId.replace('Display', 'Inc'));
    const commit = async () => { const v = clamp(parseInt(input.value, 10) || min, min, max); input.value = v; await onChange(v); };
    dec?.addEventListener('click', async () => { input.value = clamp((parseInt(input.value, 10) || min) - 1, min, max); await commit(); });
    inc?.addEventListener('click', async () => { input.value = clamp((parseInt(input.value, 10) || min) + 1, min, max); await commit(); });
    input.addEventListener('change', commit);
  }

  async function bindUI() {
    const s = await loadSettings();
    $('#enabled').checked = !!s.enabled;
    $('#limitDisplay').value = s.limit;
    $('#chunkDisplay').value = s.chunkSize;
    $('#limitHint').textContent = t('limitSub') + ' · ' + t('messagesVisible', [String(s.limit)]);

    $('#enabled').addEventListener('change', async e => {
      await saveSettings({ enabled: e.target.checked });
      await pushSettings();
      await refreshRuntime();
    });
    bindStepper('limitDisplay', 1, 5000, async v => {
      await saveSettings({ limit: v });
      $('#limitHint').textContent = t('limitSub') + ' · ' + t('messagesVisible', [String(v)]);
      await pushSettings();
    });
    bindStepper('chunkDisplay', 1, 100, async v => {
      await saveSettings({ chunkSize: v });
      await pushSettings();
    });

    $('#trimNow').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && isSupportedUrl(tab.url)) {
        try { await chrome.tabs.sendMessage(tab.id, { type: 'trimNow' }); } catch {}
      }
      window.close();
    });
    $('#loadOlder').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && isSupportedUrl(tab.url)) {
        try { await chrome.tabs.sendMessage(tab.id, { type: 'loadOlder' }); } catch {}
      }
      window.close();
    });
    $('#hotReload').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && isSupportedUrl(tab.url)) chrome.tabs.reload(tab.id);
      window.close();
    });
    $('#resetDefaults').addEventListener('click', async () => {
      await saveSettings(DEFAULTS);
      await pushSettings();
      const f = await loadSettings();
      $('#enabled').checked = f.enabled;
      $('#limitDisplay').value = f.limit;
      $('#chunkDisplay').value = f.chunkSize;
      $('#limitHint').textContent = t('limitSub') + ' · ' + t('messagesVisible', [String(f.limit)]);
      await refreshRuntime();
    });
    $('#openChatgpt').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://chatgpt.com/' });
      window.close();
    });
  }

  (async () => {
    applyI18n();
    await bindUI();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && isSupportedUrl(tab.url)) {
      await refreshRuntime();
    } else {
      $('#mainView').classList.add('hidden');
      $('#blockedView').classList.remove('hidden');
    }
  })();
})();