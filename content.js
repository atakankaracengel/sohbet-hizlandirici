(() => {
  const CONFIG_KEY     = 'cgpt_scroll_config_v1';
  const EXTRA_KEY      = 'cgpt_scroll_extra_v1';
  const TOAST_ID       = 'cgptscroll-toast';
  const BANNER_ID      = 'cgptscroll-banner';
  const MINI_ID        = 'cgptscroll-banner-mini';
  const DISMISSED_KEY  = 'cgptscroll_banner_dismissed';
  const TOAST_COOLDOWN = 30000;
  const BANNER_THRESHOLD = 280;

  const DEFAULTS = {
    enabled:     true,
    limit:       30,
    chunkSize:   10,
    autoTrim:    true,
    showToolbar: false
  };

  let settings = { ...DEFAULTS };
  let settingsLoaded = false;
  let lastStatus = {
    layoutSupported:  null,
    totalMessages:    0,
    renderedMessages: 0,
    hiddenMessages:   0,
    hasOlderMessages: false,
    extraMessages:    0,
    active:           false
  };
  let visibilityToastShown = false;
  let lastToastAt = 0;

  function storageArea() { return chrome.storage.sync || chrome.storage.local; }
  function t(key, subs) { try { return chrome.i18n.getMessage(key, subs) || key; } catch { return key; } }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function sanitize(raw) {
    return {
      enabled:     typeof raw.enabled === 'boolean'     ? raw.enabled     : DEFAULTS.enabled,
      limit:       clamp(Number(raw.limit)     || DEFAULTS.limit,     1, 5000),
      chunkSize:   clamp(Number(raw.chunkSize) || DEFAULTS.chunkSize, 1, 100),
      autoTrim:    typeof raw.autoTrim === 'boolean'    ? raw.autoTrim    : DEFAULTS.autoTrim,
      showToolbar: typeof raw.showToolbar === 'boolean' ? raw.showToolbar : DEFAULTS.showToolbar
    };
  }

  function showToast(text) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.innerHTML = `
        <span class="toast-bar"></span>
        <div class="toast-body">
          <div class="toast-title">Optimize Edildi</div>
          <div class="toast-msg"></div>
        </div>
        <span class="toast-mark">✓</span>
      `;
      document.documentElement.appendChild(toast);
    }
    toast.querySelector('.toast-msg').textContent = text || 'Eski mesajlar arka plana alındı';
    toast.classList.remove('hide');
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
    }, 2800);
  }

  function maybeShowActiveToast() {
    if (document.hidden) return;
    if (!(settings.enabled && settings.autoTrim)) return;
    if (lastStatus.layoutSupported === false) return;
    const now = Date.now();
    if (visibilityToastShown || now - lastToastAt < TOAST_COOLDOWN) return;
    visibilityToastShown = true;
    lastToastAt = now;
    showToast(t('activeToast'));
  }

  function dispatchConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(settings)); } catch {}
    window.dispatchEvent(new CustomEvent('cgptscroll-config', { detail: settings }));
  }

  function notifyStatusRequest() {
    window.dispatchEvent(new Event('cgptscroll-request-status'));
  }

  function applySettings(next) {
    settings = sanitize({ ...settings, ...next });
    dispatchConfig();
  }

  function getExtraForCurrentUrl() {
    try {
      const raw = localStorage.getItem(EXTRA_KEY);
      if (!raw) return 0;
      const p = JSON.parse(raw);
      if (!p || p.url !== location.href) return 0;
      return clamp(Number(p.extra) || 0, 0, 1000);
    } catch { return 0; }
  }

  function setExtraForCurrentUrl(extra) {
    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify({
        url: location.href,
        extra: clamp(Number(extra) || 0, 0, 1000)
      }));
    } catch {}
  }

  function isBannerDismissed() {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  }
  function setBannerDismissed(v) {
    try { if (v) localStorage.setItem(DISMISSED_KEY, '1'); else localStorage.removeItem(DISMISSED_KEY); } catch {}
  }
  function showAll() {
    try { sessionStorage.setItem('cgptscroll_showall', '1'); } catch {}
    location.reload();
  }

  function getBanner() {
    let b = document.getElementById(BANNER_ID);
    if (b) return b;
    b = document.createElement('div');
    b.id = BANNER_ID;
    b.innerHTML = `
      <span class="banner-bar"></span>
      <div class="banner-body">
        <div class="banner-tag">// gizli</div>
        <div class="banner-text">
          <span class="banner-count"></span>
          <span class="banner-suffix"></span>
        </div>
      </div>
      <button class="banner-btn">${t('showAllBtn')}</button>
      <button class="banner-close" aria-label="kapat">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><line x1="2" y1="2" x2="9" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="9" y1="2" x2="2" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    `;

    b.querySelector('.banner-btn').addEventListener('click', showAll);
    b.querySelector('.banner-close').addEventListener('click', () => {
      setBannerDismissed(true);
      b.classList.remove('show');
      updateMini();
    });

    document.documentElement.appendChild(b);
    return b;
  }

  function getMini() {
    let m = document.getElementById(MINI_ID);
    if (m) return m;
    m = document.createElement('button');
    m.id = MINI_ID;
    m.innerHTML = `<span class="mini-dot"></span><span class="mini-num"></span>`;
    m.addEventListener('click', () => {
      setBannerDismissed(false);
      updateMini();
      updateBanner();
    });
    document.documentElement.appendChild(m);
    return m;
  }

  function updateMini() {
    const hidden = lastStatus.hiddenMessages || 0;
    const mini = getMini();
    if (isBannerDismissed() && hidden > 0 && settings.enabled && settings.autoTrim) {
      mini.querySelector('.mini-num').textContent = String(hidden);
      mini.classList.add('show');
    } else {
      mini.classList.remove('show');
    }
  }

  function updateBanner() {
    const hidden = lastStatus.hiddenMessages || 0;
    const nearTop = window.scrollY < BANNER_THRESHOLD;
    if (hidden > 0 && nearTop && settings.enabled && settings.autoTrim && !isBannerDismissed()) {
      const b = getBanner();
      b.querySelector('.banner-count').textContent = String(hidden);
      b.querySelector('.banner-suffix').textContent = t('bannerSuffix');
      b.classList.add('show');
    } else {
      const b = document.getElementById(BANNER_ID);
      if (b) b.classList.remove('show');
    }
    updateMini();
  }

  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.source !== 'cgpt_scroll_main') return;
    if (e.data.type === 'cgptscroll-status' && e.data.payload) {
      lastStatus = { ...lastStatus, ...e.data.payload };
      updateBanner();
    }
    if (e.data.type === 'cgptscroll-navigation') {
      lastStatus = {
        layoutSupported: null, totalMessages: 0, renderedMessages: 0,
        hiddenMessages: 0, hasOlderMessages: false, extraMessages: 0, active: false
      };
      visibilityToastShown = false;
      updateBanner();
      updateMini();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityToastShown = false;
      return;
    }
    maybeShowActiveToast();
    notifyStatusRequest();
  });

  window.addEventListener('scroll', updateBanner, { passive: true });

  function buildStatusResponse() {
    return {
      ok:               true,
      layoutSupported:  settingsLoaded ? lastStatus.layoutSupported : null,
      enabled:          settings.enabled,
      autoTrim:         settings.autoTrim,
      limit:            settings.limit,
      totalMessages:    lastStatus.totalMessages,
      renderedMessages: lastStatus.renderedMessages,
      hiddenMessages:   lastStatus.hiddenMessages,
      hasOlderMessages: lastStatus.hasOlderMessages,
      extraMessages:    lastStatus.extraMessages,
      processing:       false
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return false;

    if (message.type === 'settingsUpdated') {
      applySettings(message.payload || {});
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'showActiveToast') {
      if (settingsLoaded) {
        notifyStatusRequest();
        setTimeout(maybeShowActiveToast, 200);
      }
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'trimNow') {
      storageArea().get(DEFAULTS).then(raw => {
        applySettings(raw);
        settingsLoaded = true;
        setExtraForCurrentUrl(0);
        location.reload();
      });
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'loadOlder') {
      setExtraForCurrentUrl(getExtraForCurrentUrl() + settings.chunkSize);
      location.reload();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'getStatus') {
      if (!settingsLoaded) {
        sendResponse(buildStatusResponse());
        return false;
      }
      sendResponse(buildStatusResponse());
      return false;
    }

    return false;
  });

  (async () => {
    try {
      const raw = await storageArea().get(DEFAULTS);
      applySettings(raw);
      settingsLoaded = true;
      notifyStatusRequest();
      if (!document.hidden) maybeShowActiveToast();
    } catch (e) {
      console.error('[ChatGPT Scroll] init failed:', e);
      settingsLoaded = true;
    }
  })();
})();