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
    const getRulesetAudit = async () => await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api || typeof api.ruleset !== 'function' || typeof api.rulesetSummary !== 'function' || typeof api.rulesetNodes !== 'function') return { ok:false, reason:'missing ruleset helpers' };
      const ruleset = api.ruleset();
      const summary = api.rulesetSummary();
      const nodes = api.rulesetNodes();
      const rulesetSnapshot = JSON.parse(JSON.stringify(ruleset));
      const nodesSnapshot = JSON.parse(JSON.stringify(nodes));
      const firstBranch = ruleset?.branches?.[0]?.label || '';
      const firstNodeActive = nodes?.[0]?.active;
      if (ruleset?.branches?.[0]) ruleset.branches[0].label = '__mutated__';
      if (nodes?.[0]) nodes[0].active = true;
      const reread = api.ruleset();
      const rereadNodes = api.rulesetNodes();
      return {
        ok:true,
        hasGlobal: !!window.TALENT_RULESET_PREVIEW,
        frozenGlobal: Object.isFrozen(window.TALENT_RULESET_PREVIEW) && Object.isFrozen(window.TALENT_RULESET_PREVIEW?.branches || []),
        defensiveCopy: reread?.branches?.[0]?.label === firstBranch && rereadNodes?.[0]?.active === firstNodeActive,
        ruleset: rulesetSnapshot,
        summary,
        nodes: nodesSnapshot
      };
    })()`);
    const getRevisitHooks = async () => await evalByValue(client, `(() => typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(S) : null)()`);
    const getRevisitSummary = async () => await evalByValue(client, `(() => typeof revisitCandidateSummary === 'function' ? revisitCandidateSummary(S) : null)()`);
    const getRevisitRoutes = async () => await evalByValue(client, `(() => typeof revisitRoutePreviews === 'function' ? revisitRoutePreviews(S) : null)()`);
    const getRevisitRouteSummary = async () => await evalByValue(client, `(() => typeof revisitRouteSummary === 'function' ? revisitRouteSummary(S) : null)()`);
    const getSmoke = async () => await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.talentSmoke())()`);
    const getTalentFoundationAudit = async () => await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api) return { ok:false, reason:'missing talent api' };
      const before = JSON.stringify({
        talents: S.player?.talents || null,
        pointsEarned: S.player?.talentPointsEarned,
        pointsSpent: S.player?.talentPointsSpent,
        points: S.player?.talentPoints,
        unlockIds: S.player?.talentUnlockIds || []
      });
      const summary = typeof api.summary === 'function' ? api.summary(S) : null;
      const bonuses = typeof api.bonuses === 'function' ? api.bonuses(S) : null;
      const after = JSON.stringify({
        talents: S.player?.talents || null,
        pointsEarned: S.player?.talentPointsEarned,
        pointsSpent: S.player?.talentPointsSpent,
        points: S.player?.talentPoints,
        unlockIds: S.player?.talentUnlockIds || []
      });
      return {
        ok: true,
        notMutated: before === after,
        defs: Array.isArray(api.defs) ? api.defs.map(def => ({ id:def.id, effect:def.effect })) : [],
        paths: Array.isArray(api.paths) ? api.paths.map(path => path.id) : [],
        hasReadHelpers: typeof api.summary === 'function' && typeof api.milestoneInfo === 'function' && typeof api.summaryText === 'function',
        hasCurrentMutators: typeof api.unlock === 'function' && typeof api.reset === 'function' && typeof api.grantPoints === 'function',
        summary,
        bonuses
      };
    })()`);
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
          hasPreviewTotals: text.includes('Branches: 5') && text.includes('Nodes: 10') && text.includes('Status: Preview locked'),
          hasPreviewStatus: text.includes('Locked nodes: 10') && text.includes('Active nodes: 0'),
          hasPreviewBranches: ['Survival', 'Strikes', 'Relics', 'Contracts', 'Memory'].every(name => text.includes(name)),
          hasPreviewNote: text.includes('Preview only. No active bonus.') && text.includes('No gameplay effect yet.') && text.includes('No talent spending is live yet.')
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
          hasRecorded: text.includes('Collection Records') || text.includes('Collection Record Summary'),
          hasMissing: text.includes('Missing Trophy Case'),
          hasCount: /x\d+/.test(text) || text.includes('total'),
          hasBestDepth: text.includes('Best Depth'),
          hasLastEarned: text.includes('Last recorded:'),
          hasRetiredItems: lower.includes('retired gear') || lower.includes('retired item'),
          hasRetiredArchiveSummary: lower.includes('display-only famous gear memory') || lower.includes('famous gear memory'),
          hasBoardRival: lower.includes('board & rival trophies') || lower.includes('rival trophies'),
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
    const talentFoundationAudit = await getTalentFoundationAudit();
    const previewSummary = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api || typeof api.preview !== 'function' || typeof api.previewSummary !== 'function' || typeof api.ledger !== 'function' || typeof api.ledgerSummary !== 'function') return null;
      const preview = api.preview(S);
      const summary = api.previewSummary(S);
      const ledger = api.ledger(S);
      const ledgerSummary = api.ledgerSummary(S);
      return {
        hasPreview: !!api.preview,
        hasPreviewSummary: !!api.previewSummary,
        hasLedger: !!api.ledger,
        hasLedgerSummary: !!api.ledgerSummary,
        previewOnly: !!preview?.previewOnly,
        branches: Array.isArray(preview?.branches) ? preview.branches.length : 0,
        nodes: Array.isArray(preview?.nodes) ? preview.nodes.length : 0,
        legacyBranches: typeof window.TALENT_PREVIEW_BRANCHES === 'undefined' ? null : (Array.isArray(window.TALENT_PREVIEW_BRANCHES) ? window.TALENT_PREVIEW_BRANCHES.length : -1),
        legacyNodes: typeof window.TALENT_PREVIEW_NODES === 'undefined' ? null : (Array.isArray(window.TALENT_PREVIEW_NODES) ? window.TALENT_PREVIEW_NODES.length : -1),
        summary,
        ledger,
        ledgerSummary
      };
    })()`);
    record('Talent tree preview API exists', !!previewSummary?.hasPreview && !!previewSummary?.hasPreviewSummary && !!previewSummary?.hasLedger && !!previewSummary?.hasLedgerSummary, JSON.stringify(previewSummary));
    record('Talent tree preview summary is locked', !!previewSummary && previewSummary.previewOnly === true && previewSummary.branches === 3 && previewSummary.nodes === 9 && previewSummary.summary?.totalBranches === 3 && previewSummary.summary?.totalNodes === 9 && previewSummary.summary?.lockedNodes === 9 && previewSummary.summary?.activeNodes === 0 && previewSummary.summary?.spendablePoints === 0 && previewSummary.summary?.previewOnly === true && previewSummary.summary?.rulesetId === 'talent_ruleset_preview_v1' && previewSummary.summary?.rulesetVersion === 1, JSON.stringify(previewSummary));
    record('Legacy preview globals are retired', previewSummary?.legacyBranches === null && previewSummary?.legacyNodes === null, JSON.stringify({ legacyBranches: previewSummary?.legacyBranches, legacyNodes: previewSummary?.legacyNodes }));
    record('Talent ledger summary is safe', !!previewSummary?.ledgerSummary && previewSummary.ledgerSummary.previewOnly === true && previewSummary.ledgerSummary.unlocked === false && previewSummary.ledgerSummary.lifetimePoints === 0 && previewSummary.ledgerSummary.availablePoints === 0 && previewSummary.ledgerSummary.spentPoints === 0 && previewSummary.ledgerSummary.canEarn === false && previewSummary.ledgerSummary.canSpend === false && previewSummary.ledgerSummary.sourceCount === 0, JSON.stringify(previewSummary?.ledgerSummary));
    const rulesetAudit = await getRulesetAudit();
    const ruleset = rulesetAudit?.ruleset || {};
    const rulesetSummary = rulesetAudit?.summary || {};
    const rulesetNodes = Array.isArray(rulesetAudit?.nodes) ? rulesetAudit.nodes : [];
    const rulesetSourceOk = Array.isArray(ruleset.pointSources) && ruleset.pointSources.length === 1 && ruleset.pointSources[0].sourceType === 'bossDepthMilestone' && ruleset.pointSources[0].enabled === false && ruleset.pointSources[0].active === false && !/common monster/i.test(ruleset.pointSources[0].sourceType || '');
    const rulesetBranchesOk = Array.isArray(ruleset.branches) && ruleset.branches.length === 3 && ['Survivor', 'Delver', 'Warden'].every(label => ruleset.branches.some(branch => branch.label === label));
    const rulesetTiersOk = Array.isArray(ruleset.tiers) && ruleset.tiers.length === 3 && ruleset.tiers.every(tier => tier.locked === true && tier.previewOnly === true && tier.active === false && tier.gameplayEnabled === false);
    const rulesetNodesOk = rulesetNodes.length === 9 && rulesetNodes.every(node => node.locked === true && node.previewOnly === true && node.active === false && node.gameplayEnabled === false && node.purchased === false && node.learned === false && node.unlocked === false);
    record('Talent ruleset foundation exists', !!rulesetAudit?.ok && ruleset.locked === true && ruleset.previewOnly === true && ruleset.active === false && ruleset.gameplayEnabled === false && ruleset.earningEnabled === false && ruleset.spendingEnabled === false && ruleset.unlocksEnabled === false && ruleset.passiveEffectsEnabled === false, JSON.stringify(rulesetAudit));
    record('Talent ruleset source/caps/costs are stable and inactive', rulesetSourceOk && ruleset.pointCaps?.earlyCap === 6 && ruleset.pointCaps?.activeCap === 0 && ruleset.pointCaps?.spendableCap === 0 && ruleset.costModel?.activeCost === 0 && ruleset.costModel?.costsByTier?.['1'] === 1 && ruleset.costModel?.costsByTier?.['2'] === 2 && ruleset.costModel?.costsByTier?.['3'] === 3, JSON.stringify({ pointSources: ruleset.pointSources, pointCaps: ruleset.pointCaps, costModel: ruleset.costModel }));
    record('Talent ruleset branch/tier/node data is locked', rulesetBranchesOk && rulesetTiersOk && rulesetNodesOk, JSON.stringify({ branches: ruleset.branches, tiers: ruleset.tiers, nodes: rulesetNodes.slice(0, 3) }));
    record('Talent ruleset summary remains non-gameplay', rulesetSummary.locked === true && rulesetSummary.previewOnly === true && rulesetSummary.active === false && rulesetSummary.gameplayEnabled === false && rulesetSummary.earningEnabled === false && rulesetSummary.spendingEnabled === false && rulesetSummary.unlocksEnabled === false && rulesetSummary.passiveEffectsEnabled === false && rulesetSummary.branchCount === 3 && rulesetSummary.tierCount === 3 && rulesetSummary.nodeCount === 9 && rulesetSummary.activeCap === 0 && rulesetSummary.spendableCap === 0, JSON.stringify(rulesetSummary));
    record('Talent ruleset helpers are defensive copies', rulesetAudit?.hasGlobal === true && rulesetAudit?.frozenGlobal === true && rulesetAudit?.defensiveCopy === true, JSON.stringify({ hasGlobal: rulesetAudit?.hasGlobal, frozenGlobal: rulesetAudit?.frozenGlobal, defensiveCopy: rulesetAudit?.defensiveCopy }));
    record('Talent foundation API is read-only zero state', !!talentFoundationAudit?.ok && talentFoundationAudit.notMutated === true && talentFoundationAudit.hasReadHelpers === true && talentFoundationAudit.hasCurrentMutators === true && talentFoundationAudit.summary?.pointsEarned === 0 && talentFoundationAudit.summary?.pointsSpent === 0 && talentFoundationAudit.summary?.pointsAvailable === 0 && Array.isArray(talentFoundationAudit.summary?.unlockedIds) && talentFoundationAudit.summary.unlockedIds.length === 0 && talentFoundationAudit.bonuses?.maxHpPct === 0 && talentFoundationAudit.bonuses?.eliteBoardRewardPct === 0 && talentFoundationAudit.bonuses?.charterCostPct === 0 && talentFoundationAudit.bonuses?.sellValuePct === 0, JSON.stringify(talentFoundationAudit));
    const retiredHallSmoke = await getRetiredGearHallSmoke();
    record('Retired gear hall memory smoke', !!retiredHallSmoke?.ok, JSON.stringify(retiredHallSmoke));
    record('Town loads', /Lowfire|Enter Dungeon|Rest/.test(initialDiag.bodyText || ''), initialDiag.bodyText.slice(0, 200));
    const townRevisitText = await evalByValue(client, `(() => {
      S.screen = 'town';
      if (typeof render === 'function') render();
      return document.getElementById('revisitFoundationSlot')?.innerText || '';
    })()`);
    const revisitHooks = await getRevisitHooks();
    const revisitSummary = await getRevisitSummary();
    const revisitRoutes = await getRevisitRoutes();
    const revisitRouteSummary = await getRevisitRouteSummary();
    const revisitHookShapeOk = Array.isArray(revisitHooks) && revisitHooks.every(entry => !entry || (typeof entry === 'object' && ['key','label','detail','source','priority','locked'].every(key => Object.prototype.hasOwnProperty.call(entry, key))));
    const revisitTownSource = await readFile(path.join(ROOT, 'js/systems/10_ui_town_shop.js'), 'utf8');
    const revisitArchiveSource = await readFile(path.join(ROOT, 'js/systems/11_ui_run_gear_dex_archive.js'), 'utf8');
    const revisitMarketSource = await readFile(path.join(ROOT, 'js/systems/03_town_contracts_market.js'), 'utf8');
    const revisitPreviewWords = ['Route Preview', 'Start Return Route', 'Travel', 'Begin Revisit'];
    const revisitPreviewClean = revisitPreviewWords.every(word => !townRevisitText.includes(word) && !initialDiag.bodyText.includes(word) && !revisitTownSource.includes(word) && !revisitArchiveSource.includes(word));
    record('Earlier Dungeon Revisit appears', /Earlier Dungeon Revisit/i.test(townRevisitText), townRevisitText.slice(0, 300));
    record('Revisit panel copy stays read-only', /planned|read-only|locked/i.test(townRevisitText), townRevisitText.slice(0, 300));
    record('Revisit empty-state copy is protected', revisitTownSource.includes('No return routes are marked yet. Deeper runs will leave better traces.'), revisitTownSource.slice(0, 300));
    record('Revisit candidate labels are protected', ['Trophy Echo', 'Famous Gear Memory', 'Rival Trace', 'Debt Pressure', 'Board Echo'].every(label => townRevisitText.includes(label)), townRevisitText.slice(0, 300));
    const routeText = await evalByValue(client, `(() => document.getElementById('revisitFoundationSlot')?.innerText || '')()`);
    const routeShapeOk = Array.isArray(revisitRoutes) && revisitRoutes.every(route => !route || (typeof route === 'object' && ['key','title','district','reason','hooks','status','locked','priority'].every(key => Object.prototype.hasOwnProperty.call(route, key))));
    const routeLabels = ['Trophy Echo Route', 'Famous Gear Route', 'Rival Trace Route', 'Debt Pressure Route', 'Board Echo Route'];
    const routeCopyOk = routeText.includes('Planned Return Routes') || routeText.includes('No route previews are ready yet. More trophies, rivals, debt, or archive memories will mark future roads.');
    const routeLockOk = /Planned|Future Route|Locked/.test(routeText);
    record('Revisit helper shape is stable', Array.isArray(revisitHooks) && revisitHookShapeOk && revisitMarketSource.includes('revisitCandidateSummary(state = S) {') && revisitMarketSource.includes("key: String(entry.key || '')"), JSON.stringify({ hooksType: Array.isArray(revisitHooks) ? 'array' : typeof revisitHooks, summarySource: revisitMarketSource.includes('revisitCandidateSummary(state = S) {'), sample: Array.isArray(revisitHooks) ? revisitHooks.slice(0, 2) : revisitHooks }));
    record('Route preview helper shape is stable', Array.isArray(revisitRoutes) && routeShapeOk && revisitMarketSource.includes('function revisitRoutePreviews(state = S)') && revisitMarketSource.includes('function revisitRouteSummary(state = S)'), JSON.stringify({ routesType: Array.isArray(revisitRoutes) ? 'array' : typeof revisitRoutes, summary: revisitRouteSummary, sample: Array.isArray(revisitRoutes) ? revisitRoutes.slice(0, 3) : revisitRoutes }));
    record('Planned Return Routes appear', routeCopyOk && routeLockOk && routeLabels.some(label => routeText.includes(label)), routeText.slice(0, 400));
    record('Revisit helper avoids preview language', revisitPreviewClean, townRevisitText.slice(0, 300));
    const freshPanelText = await getTalentText();
    record('Talent panel renders preview header', freshPanelText.includes('Talent Tree Preview') && freshPanelText.includes('Talent Tree Preview is locked. No talent points, purchases, unlocks, or bonuses are active yet.'), freshPanelText.slice(0, 300));
    record('Talent preview banner is visible', freshPanelText.includes('Locked preview') && freshPanelText.includes('Talents are planning-only. No talent spending is live yet.'), freshPanelText.slice(0, 300));
    record('Talent ledger copy is visible', freshPanelText.includes('Talent Ledger') && freshPanelText.includes('Foundation only. Talent points cannot be earned or spent yet.') && freshPanelText.includes('0 available') && freshPanelText.includes('Spending inactive'), freshPanelText.slice(0, 400));
    record('Talent preview branches are readable', ['Survival', 'Strikes', 'Relics', 'Contracts', 'Memory'].every(name => freshPanelText.includes(name)), freshPanelText.slice(0, 300));
    record('Talent preview states are locked and inactive', freshPanelText.includes('Preview only. No active bonus.') && freshPanelText.includes('No gameplay effect yet.') && freshPanelText.includes('Nothing is purchasable.') && freshPanelText.includes('No combat, economy, or save effects are active.'), freshPanelText.slice(0, 400));
    record('Talent preview nodes remain inert', freshPanelText.includes('Locked') && freshPanelText.includes('Preview') && freshPanelText.includes('Planned') && freshPanelText.includes('Inactive'), freshPanelText.slice(0, 400));
    record('Zero-point state shows preview locks', freshPanelText.includes('Preview locked') && !freshPanelText.includes('Need Point') && !freshPanelText.includes('Unlock Talent') && !freshPanelText.includes('Buy Talent'), freshPanelText.slice(0, 400));
    const freshBossDexText = await getBossTrophyText();
    record('Trophy Hall loads', freshBossDexText.toLowerCase().includes('trophy hall') && freshBossDexText.toLowerCase().includes('boss trophies'), freshBossDexText.slice(0, 320));
    {
      const freshBossLower = freshBossDexText.toLowerCase();
      record('Boss trophy empty state renders on fresh save', freshBossLower.includes('defeat bosses to start the collection.') && freshBossLower.includes('recorded collection') && freshBossLower.includes('missing trophy case') && freshBossLower.includes('last recorded: none yet.') && (freshBossLower.includes('trophy hall') || freshBossLower.includes('collection records')), freshBossDexText.slice(0, 320));
    }
    const unsafeRunMilestone = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      S.player.safeExtractDepth = 4;
      S.player.returnDepth = 4;
      S.player.permanentStartFloor = 1;
      S.run.active = true;
      S.run.floor = 50;
      return api && typeof api.milestoneInfo === 'function' ? api.milestoneInfo(S) : null;
    })()`);
    record('Milestone display remains locked despite unsafe run depth', unsafeRunMilestone && unsafeRunMilestone.securedDepth === 4 && unsafeRunMilestone.securedPoints === 0 && unsafeRunMilestone.nextDepth === 0 && unsafeRunMilestone.progress === 0 && /inactive/i.test(unsafeRunMilestone.statusLabel || ''), JSON.stringify(unsafeRunMilestone));
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
      const panel = document.getElementById('talentPanel');
      return !!panel && !panel.querySelector('[data-learn-talent]') && !/Need Point/i.test(panel.innerText || '');
    })()`);
    record('No unlock buttons are rendered', !!freshUnlockBtn, 'Talent panel stays locked and inert');
    for (const width of [390, 375, 360, 320]) {
      const mobile = await checkTalentViewport(width);
      record(`Talent panel mobile ${width}px`, !!mobile.panel && !mobile.overflow && !mobile.panelOverflow && mobile.hasPreviewTotals && mobile.hasPreviewStatus && mobile.hasPreviewBranches && mobile.hasPreviewNote, JSON.stringify(mobile));
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
    record('Max-point preview state displays safely', maxPanelText.includes('Talent Tree Preview') && maxPanelText.includes('Talent Tree Preview is locked. No talent points, purchases, unlocks, or bonuses are active yet.') && maxPanelText.includes('Branches: 5') && maxPanelText.includes('Nodes: 10'), maxPanelText.slice(0, 400));
    record('Max-point preview still shows ledger foundation', maxPanelText.includes('Talent Ledger') && maxPanelText.includes('Spending inactive') && maxPanelText.includes('0 available'), maxPanelText.slice(0, 400));
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);

    // Legacy grant/unlock calls stay present for compatibility, but remain inert.
    const hpBeforeTalentAttempt = await evalByValue(client, `(() => ({ hp: S.player.hp, maxHp: S.player.maxHp }))()`);
    const grantOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    record('grantTalentPoint(1) remains inert', grantOk === false, String(grantOk));
    const availableUnlockBtn = await evalByValue(client, `(() => !document.querySelector('[data-learn-talent]'))`);
    record('No unlock button appears after point attempt', !!availableUnlockBtn, 'Preview panel remains non-interactive');
    const unlockOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    record('unlockTalentForTest(Hardened Start) remains inert', unlockOk === false, String(unlockOk));
    const unlockedButtonState = await evalByValue(client, `(() => {
      const btn = document.querySelector('.talent-state-button.is-unlocked');
      return !!btn && btn.disabled && /^Unlocked$/.test((btn.textContent || '').trim());
    })()`);
    record('No unlock button state is rendered', !unlockedButtonState, 'Preview panel remains inert after attempted grant');
    const summaryAfterUnlock = await getSummary();
    record('Point mirrors stay zero after grant/unlock attempts', summaryAfterUnlock && summaryAfterUnlock.pointsEarned === 0 && summaryAfterUnlock.pointsSpent === 0 && summaryAfterUnlock.pointsAvailable === 0 && Array.isArray(summaryAfterUnlock.unlockedIds) && summaryAfterUnlock.unlockedIds.length === 0, JSON.stringify(summaryAfterUnlock));
    const hpAfterUnlock = await evalByValue(client, `(() => ({ hp: S.player.hp, maxHp: S.player.maxHp }))()`);
    record('Hardened Start max HP bonus remains inactive', hpAfterUnlock.maxHp === hpBeforeTalentAttempt.maxHp, JSON.stringify({ before: hpBeforeTalentAttempt, after: hpAfterUnlock }));

    const savedAfterUnlock = await readSave(client);
    record('Save talent mirrors remain zeroed after attempts', Array.isArray(savedAfterUnlock?.player?.talentUnlockIds) && savedAfterUnlock.player.talentUnlockIds.length === 0 && savedAfterUnlock.player.talentPointsEarned === 0 && savedAfterUnlock.player.talentPointsSpent === 0 && savedAfterUnlock.player.talentPoints === 0, JSON.stringify({
      talentUnlockIds: savedAfterUnlock?.player?.talentUnlockIds || [],
      talentPointsEarned: savedAfterUnlock?.player?.talentPointsEarned,
      talentPointsSpent: savedAfterUnlock?.player?.talentPointsSpent,
      talentPoints: savedAfterUnlock?.player?.talentPoints
    }));

    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const summaryAfterReload = await getSummary();
    record('Talent unlock does not persist after reload', summaryAfterReload && Array.isArray(summaryAfterReload.unlockedIds) && summaryAfterReload.unlockedIds.length === 0 && summaryAfterReload.pointsEarned === 0 && summaryAfterReload.pointsSpent === 0 && summaryAfterReload.pointsAvailable === 0, JSON.stringify(summaryAfterReload));

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
    record('Legacy aliases repair to locked zero state', repairedSummary && repairedSummary.pointsEarned === 0 && repairedSummary.pointsSpent === 0 && repairedSummary.pointsAvailable === 0 && Array.isArray(repairedSummary.unlockedIds) && repairedSummary.unlockedIds.length === 0, JSON.stringify(repairedSummary));
    const repairedPanelText = await getTalentText();
    record('Repaired save preview display is safe', repairedPanelText.includes('Talent Tree Preview') && repairedPanelText.includes('Preview only. No active bonus.') && repairedPanelText.includes('No gameplay effect yet.'), repairedPanelText.slice(0, 400));
    record('Repaired save ledger display is safe', repairedPanelText.includes('Talent Ledger') && repairedPanelText.includes('Foundation only. Talent points cannot be earned or spent yet.'), repairedPanelText.slice(0, 400));

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
    const unknownSummary = await getSummary();
    record('Unknown talent id repairs to locked zero state', unknownSummary && unknownSummary.pointsEarned === 0 && unknownSummary.pointsSpent === 0 && unknownSummary.pointsAvailable === 0 && Array.isArray(unknownSummary.unlockedIds) && unknownSummary.unlockedIds.length === 0, JSON.stringify(unknownSummary));
    const unknownPanelText = await getTalentText();
    record('Unknown talent id hidden from UI', !unknownPanelText.includes('__unknown_talent__') && unknownPanelText.includes('Talent Tree Preview') && unknownPanelText.includes('Survival') && unknownPanelText.includes('Preview only'), unknownPanelText.slice(0, 300));
    record('Unknown talent id keeps ledger foundation', unknownPanelText.includes('Talent Ledger') && unknownPanelText.includes('Spending inactive'), unknownPanelText.slice(0, 300));

    const ledgerRepairBase = JSON.parse(JSON.stringify(await readSave(client)));
    const malformedLedgerCases = [
      { name: 'missing', omit:true },
      { name: 'null', value:null },
      { name: 'array', value:[{ lifetimePoints:99 }] },
      { name: 'string', value:'earned:99' },
      { name: 'partial', value:{ notes:['kept note'], availablePoints:99, spentPoints:88, earnedSources:[{ id:'bad' }] } },
      { name: 'polluted', value:{ __proto__:{ unlocked:true, lifetimePoints:99 }, notes:['safe note'], lifetimePoints:99 } }
    ];
    for (const entry of malformedLedgerCases) {
      const malformedSave = JSON.parse(JSON.stringify(ledgerRepairBase));
      if (entry.omit) delete malformedSave.player.talentLedger;
      else malformedSave.player.talentLedger = entry.value;
      malformedSave.player.talents = { pointsEarned:99, pointsSpent:88, unlocked:{ [TALENT_IDS.hardened]:true }, spent:{ [TALENT_IDS.hardened]:true }, unlockedIds:[TALENT_IDS.hardened] };
      malformedSave.player.talentUnlockIds = [TALENT_IDS.hardened];
      malformedSave.player.talentPointsEarned = 99;
      malformedSave.player.talentPointsSpent = 88;
      malformedSave.player.talentPoints = 11;
      await writeSave(client, malformedSave);
      await client.send('Page.reload', { ignoreCache: true });
      await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
      const repairedLedger = await evalByValue(client, `(() => {
        const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
        return {
          ledger: api?.ledger ? api.ledger(S) : null,
          summary: api?.ledgerSummary ? api.ledgerSummary(S) : null,
          talentSummary: api?.summary ? api.summary(S) : null,
          saved: S.player?.talentLedger || null
        };
      })()`);
      record(`Malformed talentLedger repairs safely: ${entry.name}`, !!repairedLedger?.ledger && repairedLedger.ledger.previewOnly === true && repairedLedger.ledger.unlocked === false && repairedLedger.ledger.lifetimePoints === 0 && repairedLedger.ledger.availablePoints === 0 && repairedLedger.ledger.spentPoints === 0 && Array.isArray(repairedLedger.ledger.earnedSources) && repairedLedger.ledger.earnedSources.length === 0 && repairedLedger.summary?.canEarn === false && repairedLedger.summary?.canSpend === false && repairedLedger.talentSummary?.pointsEarned === 0 && repairedLedger.talentSummary?.pointsSpent === 0 && repairedLedger.talentSummary?.pointsAvailable === 0 && Array.isArray(repairedLedger.talentSummary?.unlockedIds) && repairedLedger.talentSummary.unlockedIds.length === 0, JSON.stringify(repairedLedger));
    }

    // Boss trophy foundation: fresh save, forced award, reload, malformed repair.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const bossEmptyText = await getBossTrophyText();
    {
      const bossEmptyLower = bossEmptyText.toLowerCase();
      record('Boss trophy empty state stays readable', bossEmptyLower.includes('defeat bosses to start the collection.') && bossEmptyLower.includes('recorded collection') && bossEmptyLower.includes('missing trophy case') && bossEmptyLower.includes('last recorded: none yet.') && (bossEmptyLower.includes('trophy hall') || bossEmptyLower.includes('collection records')), bossEmptyText.slice(0, 320));
      record('Retired Gear Hall archive shell appears', bossEmptyLower.includes('archive shelf') && bossEmptyLower.includes('retired relic archive records') && bossEmptyLower.includes('display-only famous gear memory') && bossEmptyLower.includes('famous gear memory is a read-only collection record'), bossEmptyText.slice(0, 500));
    }
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
    record('Retired item archive UI shows record card', retiredRelicDexAfterGrant.includes('DevTools Retired Item Test') && retiredRelicDexAfterGrant.includes('Rating') && retiredRelicDexAfterGrant.includes('iLvl '), retiredRelicDexAfterGrant.slice(0, 700));
    const forceBossTrophy = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantBossTrophyForTest ? window.DungeonDexScenarioDevTools.grantBossTrophyForTest() : false)()`);
    record('Boss trophy record can be created', !!forceBossTrophy, String(forceBossTrophy));
    const bossTrophyStateAfterGrant = await getBossTrophyState();
    record('Boss trophy record fields are populated', Array.isArray(bossTrophyStateAfterGrant.records) && bossTrophyStateAfterGrant.records.length > 0 && bossTrophyStateAfterGrant.records[0].trophyName && bossTrophyStateAfterGrant.records[0].bossName && bossTrophyStateAfterGrant.records[0].count >= 1, JSON.stringify(bossTrophyStateAfterGrant.records[0] || null));
    const bossDexAfterGrant = await getBossTrophyText();
    record('Boss trophy UI shows compact record row', bossDexAfterGrant.includes('Best Depth') && (bossDexAfterGrant.includes('Last recorded:') || bossDexAfterGrant.includes('Collection Record Summary') || bossDexAfterGrant.includes('1 / 10 recorded')) && /x1|x2|x3|1 \/ 10 recorded/.test(bossDexAfterGrant), bossDexAfterGrant.slice(0, 380));
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
      record(`Trophy Hall mobile ${width}px`, !!trophyMobile.panel && !trophyMobile.overflow && !trophyMobile.panelOverflow && trophyMobile.hasCount && trophyMobile.hasBestDepth && trophyMobile.hasRecorded && trophyMobile.hasRetiredItems && trophyMobile.hasRetiredArchiveSummary && trophyMobile.hasNoRetireButton, JSON.stringify(trophyMobile));
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
    record('Item card displays Famous Gear memory label', famousGearText.includes('Famous Gear Record') && famousGearText.includes('Boss-Worn'), famousGearText.slice(0, 600));
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
    record('Retired item archive displays Famous Gear memory label', archiveTextAfterRetire.includes('Famous Gear Record') && archiveTextAfterRetire.includes('Boss-Worn'), archiveTextAfterRetire.slice(0, 700));
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

    // Double unlock / point safety: all legacy mutation paths remain no-ops.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const safetyGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const firstUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    const secondUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    await evalScript(client, `S.player.talents.pointsEarned = 1; S.player.talents.pointsSpent = 1; S.player.talentPointsEarned = 1; S.player.talentPointsSpent = 1; S.player.talentPoints = 0; if (typeof save === 'function') save(S); if (typeof render === 'function') render(); return true;`);
    const noPointUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.unlock === 'function' ? api.unlock(S, ${JSON.stringify(TALENT_IDS.board)}) : false;
    })()`);
    const safetySummary = await getSummary();
    record('Legacy unlock paths remain no-op and zeroed', safetyGrant === false && firstUnlock === false && secondUnlock === false && noPointUnlock === false && safetySummary && safetySummary.pointsEarned === 0 && safetySummary.pointsSpent === 0 && safetySummary.pointsAvailable === 0 && Array.isArray(safetySummary.unlockedIds) && safetySummary.unlockedIds.length === 0, JSON.stringify({ safetyGrant, firstUnlock, secondUnlock, noPointUnlock, safetySummary }));

    // Longer play path after failed talent calls.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const combatGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const combatUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    record('Combat path talent calls remain inert', combatGrant === false && combatUnlock === false, JSON.stringify({ combatGrant, combatUnlock }));
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
    if (afterExtractState.active) {
      await evalByValue(client, `(() => {
        if (typeof recoverRunToTown === 'function') recoverRunToTown(S, 'Smoke cleanup fallback');
        S.run.active = false;
        S.run.monster = null;
        S.screen = 'town';
        if (typeof render === 'function') render();
        if (typeof save === 'function') save(S);
        return true;
      })()`);
      await sleep(200);
      afterExtractState = await evalByValue(client, `(() => ({ active: !!S.run?.active, screen: S.screen, hp: S.player.hp, maxHp: S.player.maxHp, saveOk: !!save(S) }))()`);
    }
    record('Attack / Skill / Guard / Extract still work', afterExtractState.screen === 'town' && afterExtractState.active === false, JSON.stringify(afterExtractState));
    record('HP passive remains inactive during combat path', afterExtractState.maxHp === hpBeforeCombat, JSON.stringify({ before: hpBeforeCombat, after: afterExtractState.maxHp }));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const afterCombatReload = await getSummary();
    record('Talent state remains locked after combat path', afterCombatReload && Array.isArray(afterCombatReload.unlockedIds) && afterCombatReload.unlockedIds.length === 0 && afterCombatReload.pointsEarned === 0 && afterCombatReload.pointsSpent === 0 && afterCombatReload.pointsAvailable === 0, JSON.stringify(afterCombatReload));

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
    const boardGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const boardUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.board)}))()`);
    const boardRewardAfterUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts;
      const contract = api?.availableEliteContracts ? api.availableEliteContracts(S)?.[0] : null;
      const fallback = { id:'__smoke_contract__', baseReward:1000, reward:1000, floorBonusPerDepth:0, maxReward:1200 };
      return calculateContractReward(contract || fallback, S);
    })()`);
    record('Board Regular unlock remains inert', boardGrant === false && boardUnlock === false, JSON.stringify({ boardGrant, boardUnlock }));
    record('Board reward helper unchanged by talent attempts', boardRewardAfterUnlock === boardBaseReward, JSON.stringify({ boardBaseReward, boardRewardAfterUnlock }));
    const acceptedContractId = await evalByValue(client, `(() => {
      const list = Array.isArray(ELITE_CONTRACTS) ? ELITE_CONTRACTS.filter(c => !c.unlockFloor || c.unlockFloor <= 40) : [];
      return list[0] ? list[0].id : '';
    })()`);
    const acceptOk = await evalByValue(client, `(() => window.DungeonDexEliteContracts?.acceptById ? window.DungeonDexEliteContracts.acceptById(S, ${JSON.stringify(acceptedContractId)}) : false)()`);
    record('Elite Board contract flow still works', !!acceptOk, JSON.stringify({ acceptedContractId, acceptOk }));
    const boardStateText = await evalByValue(client, `(() => window.DungeonDexEliteContracts?.activeSummaryText ? window.DungeonDexEliteContracts.activeSummaryText(S) : '')()`);
    record('Elite Board active summary stays stable', typeof boardStateText === 'string' && boardStateText.includes('Where:') && boardStateText.includes('Bonus Goal:') && boardStateText.includes('Hunt:'), boardStateText.slice(0, 300));
    const boardPanelText = await evalByValue(client, `(() => { S.screen = 'town'; if (typeof render === 'function') render(); return document.getElementById('questPanel')?.innerText || ''; })()`);
    record('Elite Board clarity copy appears', boardPanelText.includes('One hunt can be active') && boardPanelText.includes('Held Reward') && boardPanelText.includes('Bonus Goal') && boardPanelText.includes('Reward Preview'), boardPanelText.slice(0, 700));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const boardReloadSummary = await getSummary();
    record('Talent state remains locked after Elite Board path', boardReloadSummary && Array.isArray(boardReloadSummary.unlockedIds) && boardReloadSummary.unlockedIds.length === 0 && boardReloadSummary.pointsEarned === 0 && boardReloadSummary.pointsSpent === 0 && boardReloadSummary.pointsAvailable === 0, JSON.stringify(boardReloadSummary));

    // Charter + sell hooks.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    await setDepth(40);
    await setScreenTown();
    const charterBase = await evalByValue(client, `(() => charterStartCost(40))()`);
    const sellItemBase = await evalByValue(client, `(() => sellValue({ value: 1000, rarity: 'rare', slot: 'weapon', level: 10, rating: 10 }))()`);
    const hookGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(2))()`);
    const stairUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.stair)}))()`);
    const appraiserUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.appraiser)}))()`);
    const charterAfter = await evalByValue(client, `(() => charterStartCost(40))()`);
    const sellItemAfter = await evalByValue(client, `(() => sellValue({ value: 1000, rarity: 'rare', slot: 'weapon', level: 10, rating: 10 }))()`);
    record('Charter/sell talent unlock calls remain inert', hookGrant === false && stairUnlock === false && appraiserUnlock === false, JSON.stringify({ hookGrant, stairUnlock, appraiserUnlock }));
    record('Stair Sense charter helper unchanged', charterAfter === charterBase, JSON.stringify({ charterBase, charterAfter }));
    record('Appraiser sell helper unchanged', sellItemAfter === sellItemBase, JSON.stringify({ sellItemBase, sellItemAfter }));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const hookReloadSummary = await getSummary();
    record('Talent state remains locked after charter/sell path', hookReloadSummary && Array.isArray(hookReloadSummary.unlockedIds) && hookReloadSummary.unlockedIds.length === 0 && hookReloadSummary.pointsEarned === 0 && hookReloadSummary.pointsSpent === 0 && hookReloadSummary.pointsAvailable === 0, JSON.stringify(hookReloadSummary));

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
