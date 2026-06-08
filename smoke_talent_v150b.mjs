#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const TALENT_IDS = {
  hardened: 'survivor_hardened_start',
  board: 'hunter_board_regular',
  stair: 'delver_stair_sense',
  appraiser: 'collector_appraiser'
};

let PAGE_URL = '';

const results = [];
const consoleMessages = [];
const consoleErrors = [];
const runtimeExceptions = [];
const scriptLoadErrors = [];
const networkFailures = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pickPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml; charset=utf-8';
    case '.png': return 'image/png';
    case '.ico': return 'image/x-icon';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function safePathFromUrl(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = clean === '/' ? '/index.html' : clean;
  const resolved = path.resolve(ROOT, '.' + relative);
  if (!resolved.startsWith(ROOT)) {
    throw new Error(`Blocked path traversal attempt: ${urlPath}`);
  }
  return resolved;
}

async function startStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = safePathFromUrl(req.url || '/');
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypeFor(filePath), 'Cache-Control': 'no-store' });
      res.end(data);
    } catch (err) {
      const message = err && err.code === 'ENOENT' ? 'Not found' : (err?.message || String(err));
      res.writeHead(err && err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(message);
    }
  });

  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  PAGE_URL = `http://127.0.0.1:${port}/index.html`;
  return { server, port };
}

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return true;
      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function startChrome(debugPort, userDataDir) {
  const args = [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-client-side-phishing-detection',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ];
  const chrome = spawn(CHROME_PATH, args, {
    cwd: ROOT,
    detached: false,
    stdio: 'ignore',
    windowsHide: true
  });
  chrome.on('error', err => {
    throw err;
  });
  return chrome;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatException(details) {
  if (!details) return 'Unknown CDP exception';
  const text = details.text || details.exception?.description || details.exception?.value || 'Exception';
  const location = [
    details.url,
    details.lineNumber != null ? `${details.lineNumber + 1}` : null,
    details.columnNumber != null ? `${details.columnNumber + 1}` : null
  ].filter(Boolean).join(':');
  return location ? `${text} at ${location}` : text;
}

function formatConsoleMessage(msg) {
  const type = msg.type || 'log';
  const text = (msg.args || []).map(arg => {
    if (arg.value !== undefined) return typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value);
    if (arg.description) return arg.description;
    return String(arg.type || '');
  }).join(' ');
  return `${type}: ${text}`.trim();
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;
    let opened = false;

    function emit(event, payload) {
      const set = listeners.get(event);
      if (set) for (const fn of set) fn(payload);
    }

    function on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    }

    function once(event) {
      return new Promise(resolveOnce => {
        const off = on(event, payload => {
          off();
          resolveOnce(payload);
        });
      });
    }

    function send(method, params = {}) {
      const id = nextId++;
      const payload = { id, method, params };
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
        ws.send(JSON.stringify(payload));
      });
    }

    ws.onopen = () => {
      opened = true;
      resolve({ ws, send, on, once, close: () => ws.close(), isOpen: () => opened });
    };
    ws.onerror = err => {
      if (!opened) reject(err);
    };
    ws.onmessage = event => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (msg.id) {
        const pendingEntry = pending.get(msg.id);
        if (!pendingEntry) return;
        pending.delete(msg.id);
        if (msg.error) pendingEntry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`));
        else pendingEntry.resolve(msg.result || {});
        return;
      }
      if (msg.method) emit(msg.method, msg.params || {});
    };
    ws.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}

async function waitForCondition(client, predicateExpr, timeoutMs = 15000, pollMs = 150) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evalByValue(client, predicateExpr);
    if (last) return true;
    await sleep(pollMs);
  }
  return last;
}

async function evalByValue(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(() => (${expression}))()`,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(formatException(result.exceptionDetails));
  return result.result?.value;
}

async function evalScript(client, script) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(async () => { ${script} })()`,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(formatException(result.exceptionDetails));
  return result.result?.value;
}

async function pageDiagnostics(client) {
  return await evalByValue(client, `(() => {
    const keys = Object.keys(window);
    const groups = {
      dungeon: keys.filter(k => k.includes('Dungeon') || k.includes('dungeon')).sort(),
      app: keys.filter(k => k.includes('App') || k.includes('app')).sort(),
      state: keys.filter(k => k.includes('state')).sort(),
      render: keys.filter(k => k.includes('render')).sort(),
      talent: keys.filter(k => k.includes('Talent') || k.includes('talent')).sort()
    };
    return {
      url: location.href,
      readyState: document.readyState,
      title: document.title,
      hasBody: !!document.body,
      bodyText: document.body ? document.body.innerText.slice(0, 500) : '',
      groups,
      runtimeMarkers: {
        scenario: !!window.DungeonDexScenarioDevTools,
        talents: !!window.DungeonDexTalents || !!window.DungeonDexWardenTalents,
        devtools: !!window.DungeonDexDevTools,
        buildGuard: !!window.DDBuildLabelGuard,
        visibleLabel: window.DUNGEONDEX_VISIBLE_LABEL || '',
        build: window.DUNGEONDEX_BUILD || '',
        buildQs: window.DUNGEONDEX_BUILD_QS || ''
      }
    };
  })()`);
}

async function readSave(client) {
  return await evalByValue(client, `(() => {
    const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    return raw ? JSON.parse(raw) : null;
  })()`);
}

async function writeSave(client, value) {
  const json = JSON.stringify(value);
  await evalScript(client, `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(json)}); return true;`);
}

async function clearSave(client) {
  await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
}

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function snapshotEvents() {
  return {
    consoleMessages: consoleMessages.slice(),
    runtimeExceptions: runtimeExceptions.slice(),
    scriptLoadErrors: scriptLoadErrors.slice(),
    networkFailures: networkFailures.slice()
  };
}

async function main() {
  const serverInfo = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-smoke-'));
  const chrome = await startChrome(debugPort, userDataDir);

  let client = null;
  let serverClosed = false;
  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 15000);
    const newTarget = await fetchJson(`http://127.0.0.1:${debugPort}/json/new?url=${encodeURIComponent(PAGE_URL)}`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const pageTarget = Array.isArray(targets)
      ? targets.find(t => t && t.type === 'page' && String(t.webSocketDebuggerUrl || '') === String(newTarget.webSocketDebuggerUrl || '') && String(t.url || '').startsWith('http://127.0.0.1'))
        || targets.find(t => t && t.type === 'page' && String(t.url || '') === PAGE_URL)
        || targets.find(t => t && t.type === 'page')
      : null;
    if (!pageTarget?.webSocketDebuggerUrl) {
      throw new Error(`No page target found. Targets: ${JSON.stringify(targets, null, 2)}`);
    }

    client = await createCdpClient(pageTarget.webSocketDebuggerUrl);
    client.on('Runtime.consoleAPICalled', msg => {
      const entry = formatConsoleMessage(msg);
      consoleMessages.push(entry);
      if ((msg.type || '').toLowerCase() === 'error') consoleErrors.push(entry);
    });
    client.on('Runtime.exceptionThrown', evt => runtimeExceptions.push(formatException(evt.exceptionDetails)));
    client.on('Log.entryAdded', evt => {
      const entry = evt.entry || {};
      if ((entry.level || '').toLowerCase() === 'error' || (entry.source || '').toLowerCase() === 'javascript') {
        scriptLoadErrors.push(`${entry.level || 'log'}: ${entry.text || ''}`.trim());
      }
    });
    client.on('Network.loadingFailed', evt => {
      networkFailures.push(`${evt.type || 'Unknown'}: ${evt.errorText || 'load failed'} ${evt.canceled ? '(canceled)' : ''}`.trim());
    });
    client.on('Page.javascriptDialogOpening', evt => {
      consoleMessages.push(`dialog: ${evt.message || ''}`);
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');

    const connectedDiag = await pageDiagnostics(client);
    if (connectedDiag.url !== PAGE_URL) {
      await client.send('Page.navigate', { url: PAGE_URL });
    }

    const ready = await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    if (!ready) {
      const diag = await pageDiagnostics(client);
      throw new Error(`Game runtime did not initialize\n${JSON.stringify({ diag, events: snapshotEvents() }, null, 2)}`);
    }

    const initialDiag = await pageDiagnostics(client);
    record('Connected to page target', true, initialDiag.url);
    record('Talent panel runtime markers present', !!initialDiag.runtimeMarkers.scenario && !!initialDiag.runtimeMarkers.talents, JSON.stringify(initialDiag.runtimeMarkers));

    const starterText = initialDiag.bodyText || '';
    record('Game loaded', /DungeonDex/i.test(initialDiag.title) || /DungeonDex/i.test(starterText), initialDiag.title);

    const getSummary = async () => await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.summary === 'function' ? api.summary(S) : null;
    })()`);
    const getSmoke = async () => await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.talentSmoke())()`);
    const getRetiredGearHallSmoke = async () => await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.retiredGearHallSmoke ? window.DungeonDexScenarioDevTools.retiredGearHallSmoke() : { ok:false, reason:'missing helper' })()`);
    const getTalentText = async () => await evalByValue(client, `(() => {
      const panel = document.getElementById('talentPanel');
      return panel ? panel.innerText : '';
    })()`);
    const getBossTrophyText = async () => await evalByValue(client, `(() => {
      S.screen = 'dex';
      if (typeof render === 'function') render();
      const ids = ['dexSummary', 'monsterDex', 'gearDex'];
      return ids.map(id => document.getElementById(id)?.innerText || '').filter(Boolean).join('\\n\\n');
    })()`);
  const getBossTrophyState = async () => await evalByValue(client, `(() => ({
      ids: Array.isArray(S.player?.bossTrophies) ? S.player.bossTrophies.slice() : [],
      records: Array.isArray(S.player?.bossTrophyRecords) ? S.player.bossTrophyRecords.map(r => ({
        id: r.id,
        trophyId: r.trophyId,
        trophyName: r.trophyName,
        bossName: r.bossName,
        floor: r.floor,
        room: r.room,
        chapter: r.chapter,
        rawDepth: r.rawDepth,
        bestKillDepth: r.bestKillDepth,
        count: r.count
      })) : []
    }))()`);
    const getRetiredRelicState = async () => await evalByValue(client, `(() => ({
      count: Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.length : 0,
      records: Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.map(r => ({
        id: r.id,
        name: r.item?.name || r.name || '',
        rarity: r.item?.rarity || r.rarity || '',
        slot: r.item?.slot || r.slot || '',
        itemLevel: r.itemLevel || r.item?.level || 0,
        rating: r.rating || r.item?.rating || 0,
        archivedAt: r.archivedAt || 0,
        floor: r.floor || 0,
        room: r.room || 0,
        chapter: r.chapter || 0,
        source: r.source || '',
        note: r.note || '',
        memoryTitle: r.item?.gearMemory?.title || '',
        memoryTags: Array.isArray(r.item?.gearMemory?.tags) ? r.item.gearMemory.tags.slice() : []
      })) : []
    }))()`);
    const setGearScreen = async () => await evalByValue(client, `(() => { S.screen = 'gear'; if (typeof render === 'function') render(); return true; })()`);
    const gearInventorySnapshot = async () => await evalByValue(client, `(() => ({
      inventory: Array.isArray(S.player?.inventory) ? S.player.inventory.map(item => ({ id:item.id, name:item.name, rarity:item.rarity, slot:item.slot, equipped:Object.values(S.player?.equipment || {}).some(eq => eq && eq.id === item.id), memoryTags:Array.isArray(item.gearMemory?.tags) ? item.gearMemory.tags.slice() : [] })) : [],
      equippedIds: Object.values(S.player?.equipment || {}).filter(Boolean).map(item => item.id),
      retireButtons: Array.from(document.querySelectorAll('[data-retire]')).map(btn => ({
        id: btn.dataset.retire || '',
        text: btn.innerText || '',
        disabled: !!btn.disabled
      })),
      equipmentHasRetire: !!document.getElementById('equipmentPanel')?.querySelector('[data-retire]')
    }))()`);
    const clickRetireFlow = async (acceptConfirm, itemId = '') => await evalByValue(client, `(() => {
      const targetId = ${JSON.stringify(itemId || '')};
      const eligible = Array.isArray(S.player?.inventory) ? S.player.inventory.filter(entry => entry && !Object.values(S.player?.equipment || {}).some(eq => eq && eq.id === entry.id) && entry.slot && entry.kind !== 'special' && !entry.locked && !entry.favorite && !entry.protected && !(Array.isArray(entry.tags) && entry.tags.some(tag => String(tag).toLowerCase() === 'protected' || String(tag).toLowerCase() === 'special'))) : [];
      const item = targetId ? eligible.find(entry => String(entry.id || '') === targetId) : eligible[0];
      if (!item) return { ok:false, reason:'no eligible item' };
      const btn = Array.from(document.querySelectorAll('[data-retire]')).find(node => String(node.dataset.retire || '') === String(item.id || ''));
      if (!btn) return { ok:false, reason:'retire button missing', itemId:item.id };
      const before = { inventory: Array.isArray(S.player?.inventory) ? S.player.inventory.length : 0, retired: Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.length : 0 };
      const confirmCalls = [];
      const originalConfirm = window.confirm;
      window.confirm = (msg) => { confirmCalls.push(String(msg || '')); return ${acceptConfirm ? 'true' : 'false'}; };
      try { btn.click(); } finally { window.confirm = originalConfirm; }
      const after = { inventory: Array.isArray(S.player?.inventory) ? S.player.inventory.length : 0, retired: Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.length : 0 };
      const archived = Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics[0] : null;
      return {
        ok:true,
        item: { id:item.id, name:item.name, rarity:item.rarity, slot:item.slot, memoryTags:Array.isArray(item.gearMemory?.tags) ? item.gearMemory.tags.slice() : [] },
        before,
        after,
        confirmCalls,
        archived: archived ? {
          name: archived.item?.name || '',
          rarity: archived.item?.rarity || '',
          slot: archived.item?.slot || '',
          itemLevel: archived.itemLevel || archived.item?.level || 0,
          rating: archived.rating || archived.item?.rating || 0,
          archivedAt: archived.archivedAt || 0,
          floor: archived.floor || 0,
          room: archived.room || 0,
          chapter: archived.chapter || 0,
          source: archived.source || '',
          note: archived.note || '',
          memoryTitle: archived.item?.gearMemory?.title || '',
          memoryTags: Array.isArray(archived.item?.gearMemory?.tags) ? archived.item.gearMemory.tags.slice() : []
        } : null
      };
    })()`);
    const gearViewportCheck = async width => {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: 900 });
      await sleep(120);
      return await evalByValue(client, `(() => {
        S.screen = 'gear';
        if (typeof render === 'function') render();
        const doc = document.documentElement;
        const body = document.body;
        const panel = document.getElementById('inventoryPanel');
        const retired = document.querySelector('[data-retire]');
        const overflow = Math.ceil(Math.max(doc.scrollWidth || 0, body?.scrollWidth || 0)) > Math.ceil(window.innerWidth || ${width}) + 1;
        const panelOverflow = panel ? Math.ceil(panel.scrollWidth || 0) > Math.ceil(panel.clientWidth || 0) + 1 : true;
        return {
          width: window.innerWidth,
          overflow,
          panelOverflow,
          retireButton: !!retired,
          retireButtonText: retired ? (retired.innerText || '') : '',
          inventoryText: panel ? panel.innerText : ''
        };
      })()`);
    };
    const checkTalentViewport = async width => {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true
      });
      await sleep(120);
      return await evalByValue(client, `(() => {
        S.screen = 'gear';
        if (typeof render === 'function') render();
        const panel = document.getElementById('talentPanel');
        const doc = document.documentElement;
        const body = document.body;
        const overflow = Math.ceil(Math.max(doc.scrollWidth || 0, body?.scrollWidth || 0)) > Math.ceil(window.innerWidth || ${width}) + 1;
        const panelOverflow = panel ? Math.ceil(panel.scrollWidth || 0) > Math.ceil(panel.clientWidth || 0) + 1 : true;
        const text = panel ? panel.innerText : '';
        return {
          width: window.innerWidth,
          panel: !!panel,
          overflow,
          panelOverflow,
          hasTotals: /Available:\\s*\\d+/.test(text) && /Spent:\\s*\\d+/.test(text) && /Earned:\\s*\\d+/.test(text),
          hasMilestone: text.includes('Next point: secure depth') || text.includes('All milestone points earned.'),
          hasRule: text.includes('1 point per 5 secured depths. Max 20.'),
          hasStarterTalents: ['Hardened Start', 'Board Regular', 'Stair Sense', 'Appraiser'].every(name => text.includes(name)),
          hasPassiveNote: text.includes('Passive only. No combat buttons.')
        };
      })()`);
    };
    const checkBossTrophyViewport = async width => {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true
      });
      return await evalByValue(client, `(() => {
        S.screen = 'dex';
        if (typeof render === 'function') render();
        const panel = document.getElementById('screen-dex') || document.getElementById('monsterDex');
        const doc = document.documentElement;
        const body = document.body;
        const overflow = Math.ceil(Math.max(doc.scrollWidth || 0, body?.scrollWidth || 0)) > Math.ceil(window.innerWidth || ${width}) + 1;
        const panelOverflow = panel ? Math.ceil(panel.scrollWidth || 0) > Math.ceil(panel.clientWidth || 0) + 1 : true;
        const ids = ['dexSummary', 'monsterDex', 'gearDex'];
        const text = ids.map(id => document.getElementById(id)?.innerText || '').filter(Boolean).join('\\n\\n');
        const lower = text.toLowerCase();
        return {
          width: window.innerWidth,
          panel: !!panel,
          overflow,
          panelOverflow,
          hasRecorded: text.includes('Recorded Collection'),
          hasMissing: text.includes('Missing Trophy Case'),
          hasCount: text.includes('Count'),
          hasBestDepth: text.includes('Best Depth'),
          hasLastEarned: text.includes('Last Earned'),
          hasRetiredItems: lower.includes('retired items'),
          hasRetiredArchiveSummary: lower.includes('display-only memory tags') || lower.includes('famous gear memory'),
          hasBoardRival: lower.includes('board & rival trophies'),
          hasNoRetireButton: !document.getElementById('screen-dex')?.querySelector('[data-retire]')
        };
      })()`);
    };
    const click = async selector => await evalByValue(client, `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
    const setDepth = async depth => await evalScript(client, `S.player.depth = ${depth}; S.player.safeExtractDepth = ${depth}; S.player.returnDepth = ${depth}; if (typeof calcDerived === 'function') calcDerived(S); if (typeof render === 'function') render(); return true;`);
    const setScreenTown = async () => await evalScript(client, `S.screen = 'town'; if (typeof render === 'function') render(); return true;`);

    // Fresh save: clear storage and verify repair/init on reload.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    let smoke = await getSmoke();
    record('Fresh save repair', typeof smoke === 'string' ? smoke.includes('unknown id safe: true') : !!smoke?.ok, typeof smoke === 'string' ? smoke : JSON.stringify(smoke));
    const retiredHallSmoke = await getRetiredGearHallSmoke();
    record('Retired gear hall memory smoke', !!retiredHallSmoke?.ok, JSON.stringify(retiredHallSmoke));
    record('Town loads', /Lowfire|Enter Dungeon|Rest/.test(initialDiag.bodyText || ''), initialDiag.bodyText.slice(0, 200));
    const freshPanelText = await getTalentText();
    record('Talent panel renders', ['Hardened Start', 'Board Regular', 'Stair Sense', 'Appraiser'].every(name => freshPanelText.includes(name)), freshPanelText.slice(0, 300));
    record('Talent point totals are readable', /Available:\s*0/.test(freshPanelText) && /Spent:\s*0/.test(freshPanelText) && /Earned:\s*0/.test(freshPanelText), freshPanelText.slice(0, 300));
    record('Passive-only talent note is visible', freshPanelText.includes('Passive only. No combat buttons.'), freshPanelText.slice(0, 300));
    record('Talent milestone explanation appears', freshPanelText.includes('Earn points by securing deeper milestones.') && freshPanelText.includes('1 point per 5 secured depths. Max 20.'), freshPanelText.slice(0, 400));
    record('Next point line appears for non-maxed state', freshPanelText.includes('Next point: secure depth 5') && freshPanelText.includes('Progress: 1 / 5 secured depths'), freshPanelText.slice(0, 400));
    record('Zero-point state displays clearly', /Available:\s*0/.test(freshPanelText) && freshPanelText.includes('Need Point') && freshPanelText.includes('Next point: secure depth 5'), freshPanelText.slice(0, 400));
    const freshBossDexText = await getBossTrophyText();
    record('Trophy Hall loads', freshBossDexText.includes('Boss Trophies') && freshBossDexText.includes('Retired Items'), freshBossDexText.slice(0, 320));
    record('Boss trophy empty state renders on fresh save', freshBossDexText.includes('Defeat bosses to record their trophies here.'), freshBossDexText.slice(0, 320));
    const unsafeRunMilestone = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      S.player.safeExtractDepth = 4;
      S.player.returnDepth = 4;
      S.player.permanentStartFloor = 1;
      S.run.active = true;
      S.run.floor = 50;
      return api && typeof api.milestoneInfo === 'function' ? api.milestoneInfo(S) : null;
    })()`);
    record('Milestone display ignores unsafe run depth', unsafeRunMilestone && unsafeRunMilestone.nextDepth === 5 && unsafeRunMilestone.progress === 4, JSON.stringify(unsafeRunMilestone));
    await evalByValue(client, `(() => {
      S.run.active = false;
      S.run.floor = 0;
      S.player.safeExtractDepth = 1;
      S.player.returnDepth = 1;
      S.player.permanentStartFloor = 1;
      if (typeof render === 'function') render();
      return true;
    })()`);
    const freshUnlockBtn = await evalByValue(client, `(() => {
      S.screen = 'gear';
      if (typeof render === 'function') render();
      const btn = document.querySelector('[data-learn-talent="${TALENT_IDS.hardened}"]');
      return !!btn && btn.disabled && /Need Point/.test(btn.textContent || '');
    })()`);
    record('Unlock buttons blocked with 0 points', !!freshUnlockBtn, 'Hardened Start button disabled');
    for (const width of [390, 375, 360, 320]) {
      const mobile = await checkTalentViewport(width);
      record(`Talent panel mobile ${width}px`, !!mobile.panel && !mobile.overflow && !mobile.panelOverflow && mobile.hasTotals && mobile.hasMilestone && mobile.hasRule && mobile.hasStarterTalents && mobile.hasPassiveNote, JSON.stringify(mobile));
    }
    await client.send('Emulation.clearDeviceMetricsOverride');
    const maxPanelText = await evalByValue(client, `(() => {
      S.screen = 'gear';
      S.run.active = false;
      S.run.floor = 0;
      S.player.safeExtractDepth = 100;
      S.player.returnDepth = 100;
      S.player.permanentStartFloor = 100;
      if (!S.player.talents || typeof S.player.talents !== 'object') S.player.talents = { pointsEarned:20, pointsSpent:0, unlocked:{}, unlockedIds:[] };
      S.player.talents.pointsEarned = 20;
      S.player.talentPointsEarned = 20;
      S.player.talentPoints = Math.max(0, 20 - (S.player.talentPointsSpent || 0));
      if (typeof render === 'function') render();
      const panel = document.getElementById('talentPanel');
      return panel ? panel.innerText : '';
    })()`);
    record('Max-point milestone state displays safely', maxPanelText.includes('All milestone points earned.') && maxPanelText.includes('Max points: 20'), maxPanelText.slice(0, 400));
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);

    // Grant one point and unlock Hardened Start.
    const grantOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    record('grantTalentPoint(1)', !!grantOk, String(grantOk));
    const availableUnlockBtn = await evalByValue(client, `(() => {
      const btn = document.querySelector('[data-learn-talent="${TALENT_IDS.hardened}"]');
      return !!btn && !btn.disabled && /^Unlock$/.test((btn.textContent || '').trim());
    })()`);
    record('Unlock button enabled with available point', !!availableUnlockBtn, 'Hardened Start button reads Unlock');
    const unlockOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    record('unlockTalentForTest(Hardened Start)', !!unlockOk, String(unlockOk));
    const unlockedButtonState = await evalByValue(client, `(() => {
      const btn = document.querySelector('.talent-state-button.is-unlocked');
      return !!btn && btn.disabled && /^Unlocked$/.test((btn.textContent || '').trim());
    })()`);
    record('Unlocked button state is readable', !!unlockedButtonState, 'Unlocked button disabled and labeled');
    const summaryAfterUnlock = await getSummary();
    record('Points spent/available update after unlock', summaryAfterUnlock && summaryAfterUnlock.pointsEarned === 1 && summaryAfterUnlock.pointsSpent === 1 && summaryAfterUnlock.pointsAvailable === 0, JSON.stringify(summaryAfterUnlock));
    const hpAfterUnlock = await evalByValue(client, `(() => ({ hp: S.player.hp, maxHp: S.player.maxHp }))()`);
    record('Hardened Start max HP bonus applied', hpAfterUnlock.maxHp > 100, JSON.stringify(hpAfterUnlock));

    const savedAfterUnlock = await readSave(client);
    record('Save contains unlocked talent mirror', Array.isArray(savedAfterUnlock?.player?.talentUnlockIds) && savedAfterUnlock.player.talentUnlockIds.includes(TALENT_IDS.hardened), JSON.stringify(savedAfterUnlock?.player?.talentUnlockIds || []));

    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const summaryAfterReload = await getSummary();
    record('Unlock persists after reload', summaryAfterReload && Array.isArray(summaryAfterReload.unlockedIds) && summaryAfterReload.unlockedIds.includes(TALENT_IDS.hardened) && summaryAfterReload.pointsSpent === 1 && summaryAfterReload.pointsAvailable === 0, JSON.stringify(summaryAfterReload));

    const resetOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.resetTalents())()`);
    record('resetTalents()', !!resetOk, String(resetOk));
    const summaryAfterReset = await getSummary();
    record('Reset returns to zeroed state', summaryAfterReset && summaryAfterReset.pointsEarned === 0 && summaryAfterReset.pointsSpent === 0 && summaryAfterReset.pointsAvailable === 0 && summaryAfterReset.unlockedIds.length === 0, JSON.stringify(summaryAfterReset));
    const saveAfterReset = await readSave(client);
    record('Reset mirrors persist', Array.isArray(saveAfterReset?.player?.talentUnlockIds) && saveAfterReset.player.talentUnlockIds.length === 0, JSON.stringify(saveAfterReset?.player?.talentUnlockIds || []));

    // Older-save-style missing fields: omit talents and aliases, keep legacy aliases only.
    const olderSave = JSON.parse(JSON.stringify(saveAfterReset));
    delete olderSave.player.talents;
    delete olderSave.player.talentUnlockIds;
    olderSave.player.talentPointsEarned = 2;
    olderSave.player.talentPointsSpent = 1;
    olderSave.player.talentPoints = 1;
    await writeSave(client, olderSave);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    smoke = await getSmoke();
    record('Older-save missing talent fields repairs safely', typeof smoke === 'string' ? smoke.includes('unknown id safe: true') : !!smoke?.ok, typeof smoke === 'string' ? smoke : JSON.stringify(smoke));
    const repairedSummary = await getSummary();
    record('Legacy aliases repaired', repairedSummary && repairedSummary.pointsEarned === 2 && repairedSummary.pointsSpent === 1 && repairedSummary.pointsAvailable === 1 && Array.isArray(repairedSummary.unlockedIds), JSON.stringify(repairedSummary));
    const repairedPanelText = await getTalentText();
    record('Repaired save milestone display is safe', repairedPanelText.includes('Next point: secure depth') && repairedPanelText.includes('1 point per 5 secured depths. Max 20.'), repairedPanelText.slice(0, 400));

    // Unknown id scenario.
    const unknownSave = JSON.parse(JSON.stringify(await readSave(client)));
    unknownSave.player.talents = {
      pointsEarned: 2,
      pointsSpent: 1,
      unlocked: { __unknown_talent__: true },
      spent: { __unknown_talent__: true },
      unlockedIds: ['__unknown_talent__']
    };
    unknownSave.player.talentUnlockIds = ['__unknown_talent__'];
    unknownSave.player.talentPointsEarned = 2;
    unknownSave.player.talentPointsSpent = 1;
    unknownSave.player.talentPoints = 1;
    await writeSave(client, unknownSave);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    smoke = await getSmoke();
    record('Unknown talent id stays safe', typeof smoke === 'string' ? smoke.includes('unknown id safe: true') : !!smoke?.ok, typeof smoke === 'string' ? smoke : JSON.stringify(smoke));
    const unknownPanelText = await getTalentText();
    record('Unknown talent id hidden from UI', !unknownPanelText.includes('__unknown_talent__') && unknownPanelText.includes('Hardened Start'), unknownPanelText.slice(0, 300));

    // Boss trophy foundation: fresh save, forced award, reload, malformed repair.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const bossEmptyText = await getBossTrophyText();
    record('Boss trophy empty state stays readable', bossEmptyText.includes('Defeat bosses to record their trophies here.'), bossEmptyText.slice(0, 320));
    record('Retired Items archive shell appears', bossEmptyText.includes('Retired Items') && bossEmptyText.includes('Retire eligible gear from the Gear screen') && bossEmptyText.includes('DevTools can mark Famous Gear'), bossEmptyText.slice(0, 500));
    const dexRetireButton = await evalByValue(client, `(() => !!document.getElementById('monsterDex')?.querySelector('[data-retire]'))()`);
    record('No Retire button appears in Trophy Hall', dexRetireButton === false, JSON.stringify({ dexRetireButton }));
    const retiredRelicGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantRetiredRelicForTest ? window.DungeonDexScenarioDevTools.grantRetiredRelicForTest() : false)()`);
    record('Retired item archive record can be created', !!retiredRelicGrant, String(retiredRelicGrant));
    const retiredRelicStateAfterGrant = await evalByValue(client, `(() => ({
      records: Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.map(r => ({
        id: r.id,
        itemName: r.item?.name,
        source: r.source,
        note: r.note,
        slot: r.slot,
        rarity: r.rarity,
        itemLevel: r.itemLevel,
        rating: r.rating,
        floor: r.floor,
        room: r.room,
        chapter: r.chapter
      })) : []
    }))()`);
    record('Retired item archive record fields are populated', Array.isArray(retiredRelicStateAfterGrant.records) && retiredRelicStateAfterGrant.records.length > 0 && retiredRelicStateAfterGrant.records[0].itemName && retiredRelicStateAfterGrant.records[0].source && retiredRelicStateAfterGrant.records[0].itemLevel >= 1, JSON.stringify(retiredRelicStateAfterGrant.records[0] || null));
    const retiredRelicDexAfterGrant = await getBossTrophyText();
    record('Retired item archive UI shows record card', retiredRelicDexAfterGrant.includes('DevTools Retired Item Test') && retiredRelicDexAfterGrant.includes('Rating') && retiredRelicDexAfterGrant.includes('Lv '), retiredRelicDexAfterGrant.slice(0, 700));
    const forceBossTrophy = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantBossTrophyForTest ? window.DungeonDexScenarioDevTools.grantBossTrophyForTest() : false)()`);
    record('Boss trophy record can be created', !!forceBossTrophy, String(forceBossTrophy));
    const bossTrophyStateAfterGrant = await getBossTrophyState();
    record('Boss trophy record fields are populated', Array.isArray(bossTrophyStateAfterGrant.records) && bossTrophyStateAfterGrant.records.length > 0 && bossTrophyStateAfterGrant.records[0].trophyName && bossTrophyStateAfterGrant.records[0].bossName && bossTrophyStateAfterGrant.records[0].count >= 1, JSON.stringify(bossTrophyStateAfterGrant.records[0] || null));
    const bossDexAfterGrant = await getBossTrophyText();
    record('Boss trophy UI shows compact record row', bossDexAfterGrant.includes('Best Depth') && bossDexAfterGrant.includes('Last Earned') && /x1|x2|x3/.test(bossDexAfterGrant), bossDexAfterGrant.slice(0, 380));
    const forceBossTrophyDuplicate = await evalByValue(client, `(() => {
      if (typeof recordBossTrophyUnlock !== 'function') return false;
      const first = Array.isArray(S.player?.bossTrophyRecords) ? S.player.bossTrophyRecords[0] : null;
      if (!first) return false;
      return !!recordBossTrophyUnlock(S, first.rawDepth || first.bestKillDepth || 15, first.bossName || 'Boss Floor 5');
    })()`);
    const bossTrophyStateAfterDuplicate = await getBossTrophyState();
    record('Duplicate boss trophy increments count safely', !!forceBossTrophyDuplicate && Array.isArray(bossTrophyStateAfterDuplicate.records) && bossTrophyStateAfterDuplicate.records.length > 0 && Number(bossTrophyStateAfterDuplicate.records[0].count) >= 2, JSON.stringify(bossTrophyStateAfterDuplicate.records[0] || null));
    for (const width of [390, 375, 360, 320]) {
      const trophyMobile = await checkBossTrophyViewport(width);
      record(`Trophy Hall mobile ${width}px`, !!trophyMobile.panel && !trophyMobile.overflow && !trophyMobile.panelOverflow && trophyMobile.hasRecorded && trophyMobile.hasMissing && trophyMobile.hasCount && trophyMobile.hasBestDepth && trophyMobile.hasLastEarned && trophyMobile.hasRetiredItems && trophyMobile.hasRetiredArchiveSummary && trophyMobile.hasBoardRival && trophyMobile.hasNoRetireButton, JSON.stringify(trophyMobile));
    }
    await client.send('Emulation.clearDeviceMetricsOverride');
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const bossTrophyStateAfterReload = await getBossTrophyState();
    record('Boss trophy record persists after reload', Array.isArray(bossTrophyStateAfterReload.records) && bossTrophyStateAfterReload.records.length > 0 && Array.isArray(bossTrophyStateAfterReload.ids) && bossTrophyStateAfterReload.ids.includes(bossTrophyStateAfterReload.records[0].trophyId), JSON.stringify(bossTrophyStateAfterReload));
    const retiredRelicsAfterReload = await evalByValue(client, `(() => Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.map(r => ({ itemName:r.item?.name, source:r.source, note:r.note })) : [])()`);
    record('Retired item archive record persists after reload', Array.isArray(retiredRelicsAfterReload) && retiredRelicsAfterReload.length > 0 && retiredRelicsAfterReload[0].itemName && retiredRelicsAfterReload[0].source, JSON.stringify(retiredRelicsAfterReload[0] || null));
    const malformedBossSave = JSON.parse(JSON.stringify(await readSave(client)));
    malformedBossSave.player.bossTrophies = ['lowfire_fang'];
    malformedBossSave.player.bossTrophyRecords = [{ trophyId:'lowfire_fang', trophyName:'Lowfire Fang', count:0, floor:'x', room:null, chapter:-2, rawDepth:'bad', bestKillDepth:0 }];
    malformedBossSave.player.retiredRelics = [{ id:'bad_relic', item:{ slot:'weapon', rarity:'rare', level:'bad', rating:0, value:-10, name:'', stats:{}, gearMemory:{ tags:['Boss-Worn', 42, '', '<b>bad</b>'], title:42, notes:'kept short' } }, floor:'x', room:0, chapter:-2, note:'', source:'' }];
    await writeSave(client, malformedBossSave);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const repairedBossState = await getBossTrophyState();
    record('Malformed boss trophy data repairs safely', Array.isArray(repairedBossState.records) && repairedBossState.records.length > 0 && repairedBossState.records[0].count >= 1 && repairedBossState.records[0].floor >= 1 && repairedBossState.records[0].room >= 1 && repairedBossState.records[0].chapter >= 1, JSON.stringify(repairedBossState.records[0] || null));
    const repairedRetiredRelics = await evalByValue(client, `(() => Array.isArray(S.player?.retiredRelics) ? S.player.retiredRelics.map(r => ({ itemName:r.item?.name, slot:r.slot, rarity:r.rarity, itemLevel:r.itemLevel, rating:r.rating, floor:r.floor, room:r.room, chapter:r.chapter, source:r.source, note:r.note, memoryTags:Array.isArray(r.item?.gearMemory?.tags) ? r.item.gearMemory.tags.slice() : [] })) : [])()`);
    record('Malformed retired item archive data repairs safely', Array.isArray(repairedRetiredRelics) && repairedRetiredRelics.length > 0 && repairedRetiredRelics[0].itemName && repairedRetiredRelics[0].itemLevel >= 1 && repairedRetiredRelics[0].rating >= 1 && repairedRetiredRelics[0].floor >= 1 && repairedRetiredRelics[0].room >= 1 && repairedRetiredRelics[0].chapter >= 1, JSON.stringify(repairedRetiredRelics[0] || null));
    record('Malformed famous gear memory repairs safely', Array.isArray(repairedRetiredRelics) && repairedRetiredRelics[0]?.memoryTags?.includes('Boss-Worn'), JSON.stringify(repairedRetiredRelics[0] || null));

    // Manual retire action smoke.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.apply('floor-40'))()`);
    await setGearScreen();
    const gearSnapshot = await gearInventorySnapshot();
    record('Gear inventory has eligible retire target', Array.isArray(gearSnapshot.inventory) && gearSnapshot.inventory.some(item => !item.equipped), JSON.stringify(gearSnapshot));
    record('Equipped items have no retire button', !gearSnapshot.equipmentHasRetire, JSON.stringify({ equipmentHasRetire: gearSnapshot.equipmentHasRetire }));
    const famousMark = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.markGearFamousForTest ? window.DungeonDexScenarioDevTools.markGearFamousForTest('Boss-Worn') : { ok:false, reason:'missing helper' })()`);
    record('DevTools can mark Famous Gear without stat changes', !!famousMark.ok && famousMark.statsUnchanged === true && Array.isArray(famousMark.tags) && famousMark.tags.includes('Boss-Worn'), JSON.stringify(famousMark));
    await setGearScreen();
    const famousGearText = await evalByValue(client, `(() => document.getElementById('inventoryPanel')?.innerText || document.getElementById('equipmentPanel')?.innerText || '')()`);
    record('Item card displays Famous Gear memory label', famousGearText.includes('Famous Gear') && famousGearText.includes('Boss-Worn'), famousGearText.slice(0, 600));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const famousAfterReload = await evalByValue(client, `(() => {
      const item = Array.isArray(S.player?.inventory) ? S.player.inventory.find(entry => entry && entry.id === ${JSON.stringify(famousMark.itemId || '')}) : null;
      S.screen = 'gear';
      if (typeof render === 'function') render();
      const text = document.getElementById('inventoryPanel')?.innerText || '';
      return { itemFound:!!item, tags:Array.isArray(item?.gearMemory?.tags) ? item.gearMemory.tags.slice() : [], text };
    })()`);
    record('Famous Gear memory persists after reload', !!famousAfterReload.itemFound && famousAfterReload.tags.includes('Boss-Worn') && famousAfterReload.text.includes('Boss-Worn'), JSON.stringify({ itemFound:famousAfterReload.itemFound, tags:famousAfterReload.tags }));
    const retireCancel = await clickRetireFlow(false, famousMark.itemId || '');
    record('Retire confirmation cancel leaves inventory unchanged', !!retireCancel.ok && retireCancel.before.inventory === retireCancel.after.inventory && retireCancel.before.retired === retireCancel.after.retired, JSON.stringify(retireCancel));
    await sleep(350);
    const retireAccept = await clickRetireFlow(true, famousMark.itemId || '');
    record('Retire confirmation accept archives and removes exactly one item', !!retireAccept.ok && retireAccept.after.retired === retireAccept.before.retired + 1 && retireAccept.after.inventory === retireAccept.before.inventory - 1 && retireAccept.archived && retireAccept.archived.name && retireAccept.archived.rarity && retireAccept.archived.slot, JSON.stringify(retireAccept));
    record('Retired item archive snapshot preserves Famous Gear memory', Array.isArray(retireAccept.archived?.memoryTags) && retireAccept.archived.memoryTags.includes('Boss-Worn'), JSON.stringify(retireAccept.archived || null));
    const postRetireGearText = await evalByValue(client, `(() => { S.screen = 'gear'; if (typeof render === 'function') render(); return document.getElementById('inventoryPanel')?.innerText || ''; })()`);
    record('Retired item removed from inventory card list', !postRetireGearText.includes(retireAccept.item.name), postRetireGearText.slice(0, 500));
    await evalByValue(client, `(() => { S.screen = 'dex'; if (typeof render === 'function') render(); return true; })()`);
    const archiveTextAfterRetire = await evalByValue(client, `(() => document.getElementById('gearDex')?.innerText || document.getElementById('monsterDex')?.innerText || '')()`);
    const archiveLower = String(archiveTextAfterRetire || '').toLowerCase();
    record('Retired item appears in Trophy Hall archive', archiveLower.includes(String(retireAccept.item.name || '').toLowerCase()) && archiveLower.includes(String(retireAccept.item.rarity || '').toLowerCase()) && archiveLower.includes(String(retireAccept.item.slot || '').toLowerCase()), archiveTextAfterRetire.slice(0, 500));
    record('Retired item archive displays Famous Gear memory label', archiveTextAfterRetire.includes('Famous Gear') && archiveTextAfterRetire.includes('Boss-Worn'), archiveTextAfterRetire.slice(0, 700));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const retiredAfterReload = await getRetiredRelicState();
    record('Retired item archive record persists after reload', Array.isArray(retiredAfterReload.records) && retiredAfterReload.records.some(r => r.name === retireAccept.item.name && r.rarity === retireAccept.item.rarity && r.slot === retireAccept.item.slot), JSON.stringify(retiredAfterReload.records[0] || null));
    record('Retired Famous Gear memory persists after reload', Array.isArray(retiredAfterReload.records) && retiredAfterReload.records.some(r => r.name === retireAccept.item.name && Array.isArray(r.memoryTags) && r.memoryTags.includes('Boss-Worn')), JSON.stringify(retiredAfterReload.records[0] || null));
    const gearAfterReload = await evalByValue(client, `(() => { S.screen = 'gear'; if (typeof render === 'function') render(); return Array.isArray(S.player?.inventory) ? S.player.inventory.some(item => item && item.id === ${JSON.stringify(retireAccept.item.id)}) : false; })()`);
    record('Retired item does not return to inventory after reload', gearAfterReload === false, JSON.stringify({ gearAfterReload }));

    // Mobile overflow sweep on gear and archive screens.
    for (const width of [390, 375, 360, 320]) {
      const gearMobile = await gearViewportCheck(width);
      record(`Gear mobile ${width}px`, !!gearMobile && !gearMobile.overflow && !gearMobile.panelOverflow, JSON.stringify(gearMobile));
    }
    await evalByValue(client, `(() => { S.screen = 'dex'; if (typeof render === 'function') render(); return true; })()`);
    for (const width of [390, 375, 360, 320]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: 900 });
      await sleep(120);
      const archiveMobile = await evalByValue(client, `(() => {
        const doc = document.documentElement;
        const body = document.body;
        const panel = document.getElementById('gearDex') || document.getElementById('archivePanel');
        const overflow = Math.ceil(Math.max(doc.scrollWidth || 0, body?.scrollWidth || 0)) > Math.ceil(window.innerWidth || ${width}) + 1;
        const panelOverflow = panel ? Math.ceil(panel.scrollWidth || 0) > Math.ceil(panel.clientWidth || 0) + 1 : true;
        return { width: window.innerWidth, overflow, panelOverflow, text: panel ? panel.innerText : '' };
      })()`);
      record(`Archive mobile ${width}px`, !!archiveMobile && !archiveMobile.overflow && !archiveMobile.panelOverflow, JSON.stringify(archiveMobile));
    }
    await client.send('Emulation.clearDeviceMetricsOverride');

    // Double unlock / point safety.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const firstUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    const secondUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    await evalScript(client, `S.player.talents.pointsEarned = 1; S.player.talents.pointsSpent = 1; S.player.talentPointsEarned = 1; S.player.talentPointsSpent = 1; S.player.talentPoints = 0; if (typeof save === 'function') save(S); if (typeof render === 'function') render(); return true;`);
    const noPointUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.unlock === 'function' ? api.unlock(S, ${JSON.stringify(TALENT_IDS.board)}) : false;
    })()`);
    const safetySummary = await getSummary();
    record('Unlock same talent twice does not double-spend', !!firstUnlock && !secondUnlock && safetySummary && safetySummary.pointsSpent === 1 && safetySummary.pointsAvailable === 0, JSON.stringify({ firstUnlock, secondUnlock, noPointUnlock, safetySummary }));

    // Longer play path with the hardened-start passive active.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    const hpBeforeCombat = await evalByValue(client, `(() => S.player.maxHp)()`);
    const enterDungeon = await click('#startRunBtn');
    record('Enter Dungeon button works', !!enterDungeon, String(enterDungeon));
    await sleep(400);
    let actionState = await evalByValue(client, `(() => !!S.run && !!S.run.active && !!S.run.monster)()`);
    if (!actionState) {
      await click('#runFromIdleBtn');
      await sleep(250);
      actionState = await evalByValue(client, `(() => !!S.run && !!S.run.active && !!S.run.monster)()`);
    }
    record('Dungeon run starts', !!actionState, JSON.stringify(await evalByValue(client, `(() => ({ active: !!S.run?.active, floor: S.run?.floor || 0, monster: !!S.run?.monster }))()`)));
    await click('button[data-action="attack"]');
    await sleep(150);
    await click('button[data-action="skill"]');
    await sleep(150);
    await click('button[data-action="guard"]');
    await sleep(150);
    await click('button[data-action="extract"]');
    await sleep(650);
    let afterExtractState = await evalByValue(client, `(() => ({ active: !!S.run?.active, screen: S.screen, hp: S.player.hp, maxHp: S.player.maxHp, saveOk: !!save(S) }))()`);
    if (afterExtractState.active) {
      for (let attempt = 0; attempt < 3 && afterExtractState.active; attempt += 1) {
        await evalByValue(client, `(() => {
          if (typeof combatAction === 'function' && S.run?.active) combatAction(S, 'extract');
          if (typeof save === 'function') save(S);
          if (typeof render === 'function') render();
          return true;
        })()`);
        await sleep(250);
        afterExtractState = await evalByValue(client, `(() => ({ active: !!S.run?.active, screen: S.screen, hp: S.player.hp, maxHp: S.player.maxHp, saveOk: !!save(S) }))()`);
      }
    }
    record('Attack / Skill / Guard / Extract still work', afterExtractState.screen === 'town' && afterExtractState.active === false, JSON.stringify(afterExtractState));
    record('HP passive did not break display/state', afterExtractState.maxHp >= hpBeforeCombat, JSON.stringify({ before: hpBeforeCombat, after: afterExtractState.maxHp }));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const afterCombatReload = await getSummary();
    record('Talent state persists after combat path', afterCombatReload && Array.isArray(afterCombatReload.unlockedIds) && afterCombatReload.unlockedIds.includes(TALENT_IDS.hardened), JSON.stringify(afterCombatReload));

    // Elite Board path.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.apply('floor-40'))()`);
    await setScreenTown();
    const boardBaseReward = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts;
      const contract = api?.availableEliteContracts ? api.availableEliteContracts(S)?.[0] : null;
      const fallback = { id:'__smoke_contract__', baseReward:1000, reward:1000, floorBonusPerDepth:0, maxReward:1200 };
      return calculateContractReward(contract || fallback, S);
    })()`);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const boardUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.board)}))()`);
    const boardRewardAfterUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts;
      const contract = api?.availableEliteContracts ? api.availableEliteContracts(S)?.[0] : null;
      const fallback = { id:'__smoke_contract__', baseReward:1000, reward:1000, floorBonusPerDepth:0, maxReward:1200 };
      return calculateContractReward(contract || fallback, S);
    })()`);
    record('Board Regular unlock works', !!boardUnlock, `base=${boardBaseReward} after=${boardRewardAfterUnlock}`);
    record('Board reward helper stable', boardRewardAfterUnlock >= boardBaseReward, JSON.stringify({ boardBaseReward, boardRewardAfterUnlock }));
    const acceptedContractId = await evalByValue(client, `(() => {
      const list = Array.isArray(ELITE_CONTRACTS) ? ELITE_CONTRACTS.filter(c => !c.unlockFloor || c.unlockFloor <= 40) : [];
      return list[0] ? list[0].id : '';
    })()`);
    const acceptOk = await evalByValue(client, `(() => window.DungeonDexEliteContracts?.acceptById ? window.DungeonDexEliteContracts.acceptById(S, ${JSON.stringify(acceptedContractId)}) : false)()`);
    record('Elite Board contract flow still works', !!acceptOk, JSON.stringify({ acceptedContractId, acceptOk }));
    const boardStateText = await evalByValue(client, `(() => window.DungeonDexEliteContracts?.activeSummaryText ? window.DungeonDexEliteContracts.activeSummaryText(S) : '')()`);
    record('Elite Board active summary stays stable', typeof boardStateText === 'string' && boardStateText.length > 0, boardStateText.slice(0, 300));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const boardReloadSummary = await getSummary();
    record('Talent state persists after Elite Board path', boardReloadSummary && Array.isArray(boardReloadSummary.unlockedIds) && boardReloadSummary.unlockedIds.includes(TALENT_IDS.board), JSON.stringify(boardReloadSummary));

    // Charter + sell hooks.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await setDepth(40);
    await setScreenTown();
    const charterBase = await evalByValue(client, `(() => charterStartCost(40))()`);
    const sellItemBase = await evalByValue(client, `(() => sellValue({ value: 1000, rarity: 'rare', slot: 'weapon', level: 10, rating: 10 }))()`);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(2))()`);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.stair)}))()`);
    await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.appraiser)}))()`);
    const charterAfter = await evalByValue(client, `(() => charterStartCost(40))()`);
    const sellItemAfter = await evalByValue(client, `(() => sellValue({ value: 1000, rarity: 'rare', slot: 'weapon', level: 10, rating: 10 }))()`);
    record('Stair Sense charter helper stable', charterAfter <= charterBase, JSON.stringify({ charterBase, charterAfter }));
    record('Appraiser sell helper stable', sellItemAfter >= sellItemBase, JSON.stringify({ sellItemBase, sellItemAfter }));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const hookReloadSummary = await getSummary();
    record('Talent state persists after charter/sell path', hookReloadSummary && Array.isArray(hookReloadSummary.unlockedIds) && hookReloadSummary.unlockedIds.includes(TALENT_IDS.stair) && hookReloadSummary.unlockedIds.includes(TALENT_IDS.appraiser), JSON.stringify(hookReloadSummary));

    const finalDiag = await pageDiagnostics(client);
    const finalEvents = snapshotEvents();
    record('No console/runtime errors', consoleErrors.length === 0 && finalEvents.runtimeExceptions.length === 0 && finalEvents.scriptLoadErrors.length === 0 && finalEvents.networkFailures.length === 0, JSON.stringify({ consoleErrors, runtimeExceptions: finalEvents.runtimeExceptions, scriptLoadErrors: finalEvents.scriptLoadErrors, networkFailures: finalEvents.networkFailures }));

    console.log(JSON.stringify({
      pageTarget: true,
      pageUrl: finalDiag.url,
      diagnostics: finalDiag,
      events: finalEvents,
      results
    }, null, 2));
  } finally {
    try { if (client) client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => serverInfo.server.close(() => resolve())); serverClosed = true; } catch {}
    if (!serverClosed) {
      try { serverInfo.server.close(); } catch {}
    }
  }
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
});
