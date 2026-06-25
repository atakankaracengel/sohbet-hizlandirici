const DEFAULTS = { enabled: true, limit: 30, chunkSize: 10, autoTrim: true, showToolbar: false };

function storageArea() {
  return chrome.storage.sync || chrome.storage.local;
}

function isSupportedUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'chatgpt.com' || u.hostname === 'chat.openai.com');
  } catch {
    return false;
  }
}

async function getSettings() {
  try {
    const raw = await storageArea().get(DEFAULTS);
    return {
      enabled:     typeof raw.enabled === 'boolean'     ? raw.enabled     : DEFAULTS.enabled,
      limit:       Number.isFinite(raw.limit)           ? raw.limit       : DEFAULTS.limit,
      chunkSize:   Number.isFinite(raw.chunkSize)       ? raw.chunkSize   : DEFAULTS.chunkSize,
      autoTrim:    typeof raw.autoTrim === 'boolean'    ? raw.autoTrim    : DEFAULTS.autoTrim,
      showToolbar: typeof raw.showToolbar === 'boolean' ? raw.showToolbar : DEFAULTS.showToolbar
    };
  } catch {
    return { ...DEFAULTS };
  }
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

async function broadcastSettings() {
  const settings = await getSettings();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter(t => t.id && isSupportedUrl(t.url))
      .map(t => sendToTab(t.id, { type: 'settingsUpdated', payload: settings }))
  );
}

async function maybeShowActiveToast() {
  const settings = await getSettings();
  if (!settings.enabled) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && isSupportedUrl(tab.url)) {
    await sendToTab(tab.id, { type: 'showActiveToast' });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const store = storageArea();
    const raw = await store.get(DEFAULTS);
    await store.set({
      enabled:     typeof raw.enabled === 'boolean'     ? raw.enabled     : DEFAULTS.enabled,
      limit:       Number.isFinite(raw.limit)           ? raw.limit       : DEFAULTS.limit,
      chunkSize:   Number.isFinite(raw.chunkSize)       ? raw.chunkSize   : DEFAULTS.chunkSize,
      autoTrim:    typeof raw.autoTrim === 'boolean'    ? raw.autoTrim    : DEFAULTS.autoTrim,
      showToolbar: typeof raw.showToolbar === 'boolean' ? raw.showToolbar : DEFAULTS.showToolbar
    });
  } catch (e) {
    console.error('[CGPT Scroll] init storage failed:', e);
  }
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  const expected = chrome.storage.sync ? 'sync' : 'local';
  if (areaName !== expected) return;
  if (Object.keys(changes).some(k => k in DEFAULTS)) {
    await broadcastSettings();
  }
});

chrome.tabs.onActivated.addListener(() => { maybeShowActiveToast(); });
chrome.windows.onFocusChanged.addListener(w => {
  if (w !== chrome.windows.WINDOW_ID_NONE) maybeShowActiveToast();
});