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
  survivorStart: 'survivor_sturdy_start',
  survivorRecovery: 'survivor_safe_recovery',
  survivorReturn: 'survivor_guard_return',
  hunterClarity: 'hunter_board_clarity',
  hunterPayout: 'hunter_board_payout_plan',
  hunterTrace: 'hunter_rival_trace',
  stair: 'delver_stair_sense',
  delverDepth: 'delver_depth_plan',
  charter: 'delver_charter_support',
  appraiser: 'collector_item_appraisal',
  collectorMemory: 'collector_famous_memory',
  collectorArchive: 'collector_trophy_archive',
  debtClarity: 'debt_collector_clarity'
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
    const claimRepairLoaded = await evalByValue(client, `(() => !!window.DDTalentAwardClaimRepairContract && typeof window.normalizeTalentAwardClaims === 'function' && typeof window.repairTalentAwardClaimsOnState === 'function' && typeof window.talentAwardClaimRepairSummary === 'function')()`);
    record('New claim repair contract module is loaded', claimRepairLoaded === true, JSON.stringify({ loaded: claimRepairLoaded }));

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
      const passiveMap = typeof api.passivePreviewMap === 'function' ? api.passivePreviewMap() : null;
      const passiveSummary = typeof api.passivePreviewSummary === 'function' ? api.passivePreviewSummary('survivor') : null;
      const branchSummary = typeof api.previewBranchSummary === 'function' ? api.previewBranchSummary(ruleset?.branches?.[0]) : null;
      const nodeDetails = typeof api.previewNodeDetails === 'function' ? api.previewNodeDetails(nodes?.[0]) : null;
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
        passiveMap,
        passiveSummary,
        branchSummary,
        nodeDetails,
        api: {
          passiveSummary: typeof api.passivePreviewSummary === 'function',
          previewBranchSummary: typeof api.previewBranchSummary === 'function',
          previewNodeDetails: typeof api.previewNodeDetails === 'function'
        },
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
          hasPreviewTotals: text.includes('Branches: 4') && text.includes('Nodes: 12') && text.includes('Status: Locked / preview only'),
          hasPreviewStatus: text.includes('Locked nodes: 12') && text.includes('Active nodes: 0'),
          hasPreviewBranches: ['Survivor', 'Hunter', 'Delver', 'Collector'].every(name => text.includes(name)),
          hasPreviewNote: text.includes('Preview only.') && text.includes('Inactive.') && text.includes('No gameplay effects.')
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
    const talentStateContractAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      const beforeLedger = JSON.stringify(S.player?.talentLedger || null);
      const beforeState = JSON.stringify(S);
      const hadAwardClaimsBefore = Object.prototype.hasOwnProperty.call(S.player?.talentLedger || {}, 'awardClaims');
      const learnedDebt = { player: { talentLearnedIds: { debt_collector_clarity: true }, talentUnlockIds: ['debt_collector_clarity'] } };
      const lockedDebt = { player: { talentLearnedIds: {}, talentUnlockIds: [] } };
      const decision = typeof api?.talentPointSourceDecision === 'function' ? api.talentPointSourceDecision(S) : null;
      const decisionSummary = typeof api?.talentPointSourceDecisionSummary === 'function' ? api.talentPointSourceDecisionSummary(S) : null;
      const awardPreview = typeof api?.talentPointAwardPreview === 'function' ? api.talentPointAwardPreview(S) : null;
      const awardPreviewSummary = typeof api?.talentPointAwardPreviewSummary === 'function' ? api.talentPointAwardPreviewSummary(S) : null;
      const claimTrackingPlan = typeof api?.talentAwardClaimTrackingPlan === 'function' ? api.talentAwardClaimTrackingPlan() : null;
      const claimTrackingPlanSummary = typeof api?.talentAwardClaimTrackingPlanSummary === 'function' ? api.talentAwardClaimTrackingPlanSummary() : null;
      const claimShapePreview = typeof api?.talentAwardClaimShapePreview === 'function' ? api.talentAwardClaimShapePreview(S) : null;
      const claimShapePreviewSummary = typeof api?.talentAwardClaimShapePreviewSummary === 'function' ? api.talentAwardClaimShapePreviewSummary(S) : null;
      const spendPreviewNoPointsState = { player: { talentLedger: { lifetimePoints: 0, availablePoints: 0, spentPoints: 0, awardClaims: {} } } };
      const spendPreviewOnePointState = { player: { talentLedger: { lifetimePoints: 1, availablePoints: 1, spentPoints: 0, awardClaims: { 'boss_trophy_milestone:ashen_wyrm': { key: 'boss_trophy_milestone:ashen_wyrm', source: 'boss_trophy_milestone', sourceId: 'ashen_wyrm', amount: 1, claimedAt: '2026-06-21T12:00:00.000Z', version: 1 } } } } };
      const spendPreviewLearnedState = { player: { talentLedger: { lifetimePoints: 1, availablePoints: 1, spentPoints: 0, awardClaims: { 'boss_trophy_milestone:ashen_wyrm': { key: 'boss_trophy_milestone:ashen_wyrm', source: 'boss_trophy_milestone', sourceId: 'ashen_wyrm', amount: 1, claimedAt: '2026-06-21T12:00:00.000Z', version: 1 } } }, talentUnlockIds: ['hunter_board_clarity'] } };
      const spendPreviewMalformedLedgerState = { player: { talentLedger: { lifetimePoints: 1, availablePoints: 99, spentPoints: 1, awardClaims: {} } } };
      const spendPreviewUnknownState = { player: { talentLedger: { lifetimePoints: 1, availablePoints: 1, spentPoints: 0, awardClaims: {} } } };
      const spendPreviewNoPointsBefore = JSON.stringify(spendPreviewNoPointsState);
      const spendPreviewOnePointBefore = JSON.stringify(spendPreviewOnePointState);
      const spendPreviewLearnedBefore = JSON.stringify(spendPreviewLearnedState);
      const spendPreviewMalformedLedgerBefore = JSON.stringify(spendPreviewMalformedLedgerState);
      const spendPreviewNoPoints = typeof api?.talentSpendPreview === 'function' ? api.talentSpendPreview(spendPreviewNoPointsState, 'hunter_board_clarity') : null;
      const spendPreviewNoPointsSummary = typeof api?.talentSpendPreviewSummary === 'function' ? api.talentSpendPreviewSummary(spendPreviewNoPointsState, 'hunter_board_clarity') : null;
      const spendPreviewOnePoint = typeof api?.hunterBoardClaritySpendPreview === 'function' ? api.hunterBoardClaritySpendPreview(spendPreviewOnePointState) : (typeof api?.talentSpendPreview === 'function' ? api.talentSpendPreview(spendPreviewOnePointState, 'hunter_board_clarity') : null);
      const spendPreviewOnePointSummary = typeof api?.hunterBoardClaritySpendPreviewSummary === 'function' ? api.hunterBoardClaritySpendPreviewSummary(spendPreviewOnePointState) : (typeof api?.talentSpendPreviewSummary === 'function' ? api.talentSpendPreviewSummary(spendPreviewOnePointState, 'hunter_board_clarity') : null);
      const spendPreviewLearned = typeof api?.talentSpendPreview === 'function' ? api.talentSpendPreview(spendPreviewLearnedState, 'hunter_board_clarity') : null;
      const spendPreviewUnknown = typeof api?.talentSpendPreview === 'function' ? api.talentSpendPreview(spendPreviewUnknownState, 'fake_node') : null;
      const spendPreviewMalformedStates = typeof api?.talentSpendPreview === 'function'
        ? [
          api.talentSpendPreview(),
          api.talentSpendPreview(null, 'hunter_board_clarity'),
          api.talentSpendPreview('malformed', 'hunter_board_clarity'),
          api.talentSpendPreview([], 'hunter_board_clarity'),
          api.talentSpendPreview({ player: null }, 'hunter_board_clarity'),
          api.talentSpendPreview({ player: { talentLedger: null } }, 'hunter_board_clarity'),
          api.talentSpendPreview({ player: { talentLedger: { awardClaims: null } } }, 'hunter_board_clarity')
        ]
        : [];
      const spendPreviewMalformedLedger = typeof api?.talentSpendPreview === 'function' ? api.talentSpendPreview(spendPreviewMalformedLedgerState, 'hunter_board_clarity') : null;
      const spendPreviewNoPointsAfter = JSON.stringify(spendPreviewNoPointsState);
      const spendPreviewOnePointAfter = JSON.stringify(spendPreviewOnePointState);
      const spendPreviewLearnedAfter = JSON.stringify(spendPreviewLearnedState);
      const spendPreviewUnknownAfter = JSON.stringify(spendPreviewUnknownState);
      const spendPreviewMalformedLedgerAfter = JSON.stringify(spendPreviewMalformedLedgerState);
      const mutationPreview = typeof api?.talentAwardMutationPreview === 'function' ? api.talentAwardMutationPreview(S) : null;
      const mutationPreviewSummary = typeof api?.talentAwardMutationPreviewSummary === 'function' ? api.talentAwardMutationPreviewSummary(S) : null;
      const mutationGate = typeof api?.talentAwardMutationGate === 'function' ? api.talentAwardMutationGate(S) : null;
      const mutationGateSummary = mutationGate ? {
        source: mutationGate.source,
        enabled: mutationGate.enabled,
        eligible: mutationGate.eligible,
        blockedReason: mutationGate.blockedReason,
        claimKey: mutationGate.claimKey,
        sourceId: mutationGate.sourceId
      } : null;
      const applyAwardMutation = typeof api?.applyTalentAwardMutation === 'function' ? api.applyTalentAwardMutation : null;
      const applyLiveAward = typeof api?.applyBossTrophyTalentAwardIfReady === 'function' ? api.applyBossTrophyTalentAwardIfReady : null;
      const mutationEvidenceState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {} } } };
      const mutationEvidenceBefore = JSON.stringify(mutationEvidenceState);
      const mutationEvidencePreview = typeof api?.talentAwardMutationPreview === 'function' ? api.talentAwardMutationPreview(mutationEvidenceState) : null;
      const mutationEvidenceAfter = JSON.stringify(mutationEvidenceState);
      const mutationDefaultGateState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {} } } };
      const mutationDefaultGateBefore = JSON.stringify(mutationDefaultGateState);
      const mutationDefaultGateResult = applyAwardMutation ? applyAwardMutation(mutationDefaultGateState) : null;
      const mutationDefaultGateAfter = JSON.stringify(mutationDefaultGateState);
      const mutationOverrideState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {} } } };
      const mutationOverrideBefore = JSON.stringify(mutationOverrideState);
      const mutationOverrideResult = applyAwardMutation ? applyAwardMutation(mutationOverrideState, { enabledOverride: true }) : null;
      const mutationOverrideAfter = JSON.stringify(mutationOverrideState);
      const mutationOverrideRepeatBefore = JSON.stringify(mutationOverrideState);
      const mutationOverrideRepeatResult = applyAwardMutation ? applyAwardMutation(mutationOverrideState, { enabledOverride: true }) : null;
      const mutationOverrideRepeatAfter = JSON.stringify(mutationOverrideState);
      const mutationExistingClaimState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {
        'boss_trophy_milestone:ashen_wyrm': {
          key: 'boss_trophy_milestone:ashen_wyrm',
          source: 'boss_trophy_milestone',
          sourceId: 'ashen_wyrm',
          amount: 1,
          claimedAt: '2026-06-21T12:00:00.000Z',
          version: 1
        }
      } } } };
      const mutationExistingClaimBefore = JSON.stringify(mutationExistingClaimState);
      const mutationExistingClaimResult = applyAwardMutation ? applyAwardMutation(mutationExistingClaimState, { enabledOverride: true }) : null;
      const mutationExistingClaimAfter = JSON.stringify(mutationExistingClaimState);
      const mutationRecordEvidenceState = { player: { bossTrophies: [], bossTrophyRecords: [{ id: 'ember_drake', trophyId: 'ember_drake' }], talentLedger: { awardClaims: {} } } };
      const mutationRecordEvidenceBefore = JSON.stringify(mutationRecordEvidenceState);
      const mutationRecordEvidencePreview = typeof api?.talentAwardMutationPreview === 'function' ? api.talentAwardMutationPreview(mutationRecordEvidenceState) : null;
      const mutationRecordEvidenceAfter = JSON.stringify(mutationRecordEvidenceState);
      const mutationRecordApplyState = { player: { bossTrophies: [], bossTrophyRecords: [{ id: 'ember_drake', trophyId: 'ember_drake' }], talentLedger: { awardClaims: {} } } };
      const mutationRecordApplyBefore = JSON.stringify(mutationRecordApplyState);
      const mutationRecordApplyResult = applyAwardMutation ? applyAwardMutation(mutationRecordApplyState, { enabledOverride: true }) : null;
      const mutationRecordApplyAfter = JSON.stringify(mutationRecordApplyState);
      const mutationAlreadyClaimedState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {
        'boss_trophy_milestone:ashen_wyrm': { key: 'boss_trophy_milestone:ashen_wyrm', source: 'boss_trophy_milestone', sourceId: 'ashen_wyrm', amount: 1, claimedAt: '2026-06-21T12:00:00.000Z', version: 1 }
      } } } };
      const mutationAlreadyClaimedBefore = JSON.stringify(mutationAlreadyClaimedState);
      const mutationAlreadyClaimedPreview = typeof api?.talentAwardMutationPreview === 'function' ? api.talentAwardMutationPreview(mutationAlreadyClaimedState) : null;
      const mutationAlreadyClaimedAfter = JSON.stringify(mutationAlreadyClaimedState);
      const malformedAwardClaimsState = { player: { talentLedger: { awardClaims: [] } } };
      const malformedAwardClaimsBefore = JSON.stringify(malformedAwardClaimsState);
      const malformedAwardClaimsDefault = applyAwardMutation ? applyAwardMutation(malformedAwardClaimsState) : null;
      const malformedAwardClaimsOverride = applyAwardMutation ? applyAwardMutation(malformedAwardClaimsState, { enabledOverride: true }) : null;
      const malformedAwardClaimsAfter = JSON.stringify(malformedAwardClaimsState);
      const liveAwardState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [], talentLedger: { awardClaims: {} }, talentEarning: { enabled: true, sourceId: 'boss_depth_milestone', milestonesReached: {}, pointsAwarded: 0 } } };
      const liveAwardBefore = JSON.stringify(liveAwardState);
      const liveAwardResult = applyLiveAward ? applyLiveAward(liveAwardState) : null;
      const liveAwardAfter = JSON.stringify(liveAwardState);
      const liveAwardRepeatBefore = JSON.stringify(liveAwardState);
      const liveAwardRepeatResult = applyLiveAward ? applyLiveAward(liveAwardState) : null;
      const liveAwardRepeatAfter = JSON.stringify(liveAwardState);
      const malformedMutationPreviews = typeof api?.talentAwardMutationPreview === 'function'
        ? [
          api.talentAwardMutationPreview(),
          api.talentAwardMutationPreview(null),
          api.talentAwardMutationPreview('malformed'),
          api.talentAwardMutationPreview([]),
          api.talentAwardMutationPreview({ player: null }),
          api.talentAwardMutationPreview({ player: { talentLedger: { awardClaims: null } } })
        ]
        : [];
      const bossEvidenceState = { player: { bossTrophies: ['ashen_wyrm'], bossTrophyRecords: [{ id: 'ashen_wyrm', trophyId: 'ashen_wyrm' }], talentLedger: { awardClaims: {} } } };
      const bossEvidenceBefore = JSON.stringify(bossEvidenceState);
      const bossEvidencePreview = typeof api?.talentPointAwardPreview === 'function' ? api.talentPointAwardPreview(bossEvidenceState) : null;
      const bossEvidenceAfter = JSON.stringify(bossEvidenceState);
      const malformedClaimState = { player: { talentLedger: { awardClaims: {
        'boss_trophy_milestone:ashen_wyrm': { key: 'boss_trophy_milestone:ashen_wyrm', source: 'boss_trophy_milestone', sourceId: 'ashen_wyrm', amount: 1, claimedAt: '2026-06-21T12:00:00.000Z', version: 1 },
        'boss_trophy_milestone:broken': { key: 'boss_trophy_milestone:broken', source: 'boss_trophy_milestone', sourceId: 'broken', amount: 0, claimedAt: 'not-a-date', version: 2 },
        junk: 'bad'
      } } } };
      const malformedClaimBefore = JSON.stringify(malformedClaimState);
      const malformedClaimPreview = typeof api?.talentAwardClaimShapePreview === 'function' ? api.talentAwardClaimShapePreview(malformedClaimState) : null;
      const malformedClaimAfter = JSON.stringify(malformedClaimState);
      const pollutedLedger = Object.create({ awardClaims: { inherited: { amount: 1 } } });
      const safeClaimShapePreviews = typeof api?.talentAwardClaimShapePreview === 'function'
        ? [
          api.talentAwardClaimShapePreview(),
          api.talentAwardClaimShapePreview(null),
          api.talentAwardClaimShapePreview('malformed'),
          api.talentAwardClaimShapePreview({ player: { talentLedger: { awardClaims: null } } }),
          api.talentAwardClaimShapePreview({ player: { talentLedger: { awardClaims: [] } } }),
          api.talentAwardClaimShapePreview({ player: { talentLedger: pollutedLedger } })
        ]
        : [];
      const eligibleAwardPreview = typeof api?.talentPointAwardPreview === 'function'
        ? api.talentPointAwardPreview({ player: { bossTrophies: ['first_boss_trophy'], bossTrophyRecords: [] } })
        : null;
      const safeAwardPreviews = typeof api?.talentPointAwardPreview === 'function'
        ? [
          api.talentPointAwardPreview(),
          api.talentPointAwardPreview(null),
          api.talentPointAwardPreview('malformed'),
          api.talentPointAwardPreview({ player: null }),
          api.talentPointAwardPreview({ player: { bossTrophies: [null, '', {}], bossTrophyRecords: [null, {}, 'bad'] } })
        ]
        : [];
      const previewNode = api?.talentNodeStateContract ? api.talentNodeStateContract('preview_only_probe', { player: {} }, { previewOnly: true }) : null;
      const afterLedger = JSON.stringify(S.player?.talentLedger || null);
      const afterState = JSON.stringify(S);
      const hadAwardClaimsAfter = Object.prototype.hasOwnProperty.call(S.player?.talentLedger || {}, 'awardClaims');
      return {
        hasHelper: typeof api?.talentNodeStateContract === 'function',
        hasPointSourceDecision: typeof api?.talentPointSourceDecision === 'function',
        hasPointSourceDecisionSummary: typeof api?.talentPointSourceDecisionSummary === 'function',
        hasPointAwardPreview: typeof api?.talentPointAwardPreview === 'function',
        hasPointAwardPreviewSummary: typeof api?.talentPointAwardPreviewSummary === 'function',
        hasClaimTrackingPlan: typeof api?.talentAwardClaimTrackingPlan === 'function',
        hasClaimTrackingPlanSummary: typeof api?.talentAwardClaimTrackingPlanSummary === 'function',
        hasClaimShapePreview: typeof api?.talentAwardClaimShapePreview === 'function',
        hasClaimShapePreviewSummary: typeof api?.talentAwardClaimShapePreviewSummary === 'function',
        hasMutationPreview: typeof api?.talentAwardMutationPreview === 'function',
        hasMutationPreviewSummary: typeof api?.talentAwardMutationPreviewSummary === 'function',
        hasMutationGate: typeof api?.talentAwardMutationGate === 'function',
        hasApplyMutation: typeof api?.applyTalentAwardMutation === 'function',
        hasLiveAwardHelper: typeof api?.applyBossTrophyTalentAwardIfReady === 'function',
        hasSpendPreview: typeof api?.talentSpendPreview === 'function',
        hasSpendPreviewSummary: typeof api?.talentSpendPreviewSummary === 'function',
        hasHunterBoardClaritySpendPreview: typeof api?.hunterBoardClaritySpendPreview === 'function',
        hasHunterBoardClaritySpendPreviewSummary: typeof api?.hunterBoardClaritySpendPreviewSummary === 'function',
        beforeLedger,
        afterLedger,
        beforeState,
        afterState,
        hadAwardClaimsBefore,
        hadAwardClaimsAfter,
        decision,
        decisionSummary,
        awardPreview,
        awardPreviewSummary,
        claimTrackingPlan,
        claimTrackingPlanSummary,
        claimShapePreview,
        claimShapePreviewSummary,
        mutationPreview,
        mutationPreviewSummary,
        mutationGate,
        mutationGateSummary,
        spendPreviewNoPoints,
        spendPreviewNoPointsSummary,
        spendPreviewOnePoint,
        spendPreviewOnePointSummary,
        spendPreviewLearned,
        spendPreviewUnknown,
        spendPreviewMalformedStates,
        spendPreviewMalformedLedger,
        spendPreviewMalformedLedgerBefore,
        spendPreviewMalformedLedgerAfter,
        mutationEvidencePreview,
        mutationEvidenceBefore,
        mutationEvidenceAfter,
        mutationDefaultGateResult,
        mutationDefaultGateBefore,
        mutationDefaultGateAfter,
        mutationDefaultGateState,
        mutationOverrideResult,
        mutationOverrideBefore,
        mutationOverrideAfter,
        mutationOverrideState,
        mutationOverrideRepeatResult,
        mutationOverrideRepeatBefore,
        mutationOverrideRepeatAfter,
        mutationOverrideRepeatState: mutationOverrideState,
        mutationExistingClaimResult,
        mutationExistingClaimBefore,
        mutationExistingClaimAfter,
        mutationExistingClaimState,
        mutationRecordEvidencePreview,
        mutationRecordEvidenceBefore,
        mutationRecordEvidenceAfter,
        mutationRecordApplyResult,
        mutationRecordApplyBefore,
        mutationRecordApplyAfter,
        mutationRecordApplyState,
        mutationAlreadyClaimedPreview,
        mutationAlreadyClaimedBefore,
        mutationAlreadyClaimedAfter,
        malformedAwardClaimsState,
        malformedAwardClaimsDefault,
        malformedAwardClaimsOverride,
        malformedAwardClaimsBefore,
        malformedAwardClaimsAfter,
        liveAwardResult,
        liveAwardBefore,
        liveAwardAfter,
        liveAwardRepeatResult,
        liveAwardRepeatBefore,
        liveAwardRepeatAfter,
        liveAwardState,
        malformedMutationPreviews,
        bossEvidencePreview,
        bossEvidenceBefore,
        bossEvidenceAfter,
        malformedClaimPreview,
        malformedClaimBefore,
        malformedClaimAfter,
        safeClaimShapePreviews,
        eligibleAwardPreview,
        safeAwardPreviews,
        learnedDebt: api?.debtCollectorClarityPassiveContract ? api.debtCollectorClarityPassiveContract(learnedDebt) : null,
        lockedDebt: api?.debtCollectorClarityPassiveContract ? api.debtCollectorClarityPassiveContract(lockedDebt) : null,
        previewNode,
        previewObjectStable: previewNode ? JSON.stringify(previewNode) : ''
      };
    })()`);
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
    record('Talent tree preview summary is locked', !!previewSummary && previewSummary.previewOnly === true && previewSummary.branches === 4 && previewSummary.nodes === 13 && previewSummary.summary?.totalBranches === 4 && previewSummary.summary?.totalNodes === 13 && previewSummary.summary?.lockedNodes === 13 && previewSummary.summary?.activeNodes === 0 && previewSummary.summary?.spendablePoints === 0 && previewSummary.summary?.previewOnly === true && previewSummary.summary?.rulesetId === 'talent_ruleset_preview_v1' && previewSummary.summary?.rulesetVersion === 1, JSON.stringify(previewSummary));
    record('Legacy preview globals are retired', previewSummary?.legacyBranches === null && previewSummary?.legacyNodes === null, JSON.stringify({ legacyBranches: previewSummary?.legacyBranches, legacyNodes: previewSummary?.legacyNodes }));
    record('Talent ledger summary is safe', !!previewSummary?.ledgerSummary && previewSummary.ledgerSummary.previewOnly === true && previewSummary.ledgerSummary.unlocked === false && previewSummary.ledgerSummary.lifetimePoints === 0 && previewSummary.ledgerSummary.availablePoints === 0 && previewSummary.ledgerSummary.spentPoints === 0 && previewSummary.ledgerSummary.canEarn === true && previewSummary.ledgerSummary.canSpend === false && previewSummary.ledgerSummary.sourceCount === 1, JSON.stringify(previewSummary?.ledgerSummary));
    const rulesetAudit = await getRulesetAudit();
    const ruleset = rulesetAudit?.ruleset || {};
    const rulesetSummary = rulesetAudit?.summary || {};
    const rulesetNodes = Array.isArray(rulesetAudit?.nodes) ? rulesetAudit.nodes : [];
    const rulesetSourceOk = Array.isArray(ruleset.pointSources) && ruleset.pointSources.length === 1 && ruleset.pointSources[0].sourceType === 'bossDepthMilestone' && ruleset.pointSources[0].enabled === true && ruleset.pointSources[0].active === false && !/common monster/i.test(ruleset.pointSources[0].sourceType || '');
    const rulesetBranchesOk = Array.isArray(ruleset.branches) && ruleset.branches.length === 4 && ['Survivor', 'Hunter', 'Delver', 'Collector'].every(label => ruleset.branches.some(branch => branch.label === label));
    const rulesetTiersOk = Array.isArray(ruleset.tiers) && ruleset.tiers.length === 3 && ruleset.tiers.every(tier => tier.locked === true && tier.previewOnly === true && tier.active === false && tier.gameplayEnabled === false);
    const rulesetNodesOk = rulesetNodes.length === 12 && rulesetNodes.every(node => node.locked === true && node.previewOnly === true && node.active === false && node.gameplayEnabled === false && node.purchased === false && node.learned === false && node.unlocked === false && node.effectValue === 0 && node.applied === false);
    record('Talent ruleset foundation exists', !!rulesetAudit?.ok && ruleset.locked === true && ruleset.previewOnly === true && ruleset.active === false && ruleset.gameplayEnabled === false && ruleset.earningEnabled === true && ruleset.spendingEnabled === false && ruleset.unlocksEnabled === false && ruleset.passiveEffectsEnabled === false, JSON.stringify(rulesetAudit));
    record('Talent ruleset source/caps/costs are stable and inactive', rulesetSourceOk && ruleset.pointCaps?.earlyCap === 6 && ruleset.pointCaps?.activeCap === 6 && ruleset.pointCaps?.spendableCap === 0 && ruleset.costModel?.activeCost === 0 && ruleset.costModel?.costsByTier?.['1'] === 1 && ruleset.costModel?.costsByTier?.['2'] === 2 && ruleset.costModel?.costsByTier?.['3'] === 3, JSON.stringify({ pointSources: ruleset.pointSources, pointCaps: ruleset.pointCaps, costModel: ruleset.costModel }));
    record('Talent ruleset branch/tier/node data is locked', rulesetBranchesOk && rulesetTiersOk && rulesetNodesOk, JSON.stringify({ branches: ruleset.branches, tiers: ruleset.tiers, nodes: rulesetNodes.slice(0, 3) }));
    record('Talent passive preview map exists', !!rulesetAudit?.passiveMap && Object.keys(rulesetAudit.passiveMap).length === 4 && rulesetAudit.passiveSummary?.branchName === 'Survivor' && rulesetAudit.branchSummary?.branchName && rulesetAudit.nodeDetails?.locked === true && rulesetAudit.nodeDetails?.previewOnly === true, JSON.stringify({ passiveSummary: rulesetAudit.passiveSummary, branchSummary: rulesetAudit.branchSummary, nodeDetails: rulesetAudit.nodeDetails }));
    const earningAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api) return null;
      const before = JSON.stringify(S);
      const contract = typeof api.earningSourceContract === 'function' ? api.earningSourceContract(S) : null;
      const after = JSON.stringify(S);
      const contract2 = typeof api.earningSourceContract === 'function' ? api.earningSourceContract(S) : null;
      const earning = JSON.parse(JSON.stringify(S.player?.talentEarning || {}));
      const status = typeof api.earningStatus === 'function' ? api.earningStatus(S) : null;
      const enabled = typeof api.earningEnabled === 'function' ? api.earningEnabled(S) : null;
      const pointsBefore = Number(S.player?.talentEarning?.pointsAwarded || 0);
      const summary1 = typeof api.summary === 'function' ? api.summary(S) : null;
      const pointsAfter = Number(S.player?.talentEarning?.pointsAwarded || 0);
      const summary2 = typeof api.summary === 'function' ? api.summary(S) : null;
      const fixture = JSON.parse(JSON.stringify(S));
      fixture.player = fixture.player || {};
      fixture.player.bossesDefeated = 10;
      fixture.player.safeExtractDepth = 15;
      fixture.player.talentEarning = { enabled: false, milestonesReached: {}, pointsAwarded: 0 };
      const detectBoss = typeof api.detectBossMilestones === 'function' ? api.detectBossMilestones(fixture) : null;
      const detectDepth = typeof api.detectDepthMilestones === 'function' ? api.detectDepthMilestones(fixture) : null;
      const allReached = typeof api.getAllReachedMilestones === 'function' ? api.getAllReachedMilestones(fixture) : null;
      const pointsDisabled = typeof api.calculateTalentPointsFromMilestones === 'function' ? api.calculateTalentPointsFromMilestones(fixture) : null;
      const pointsOverride = typeof api.calculateTalentPointsFromMilestones === 'function' ? api.calculateTalentPointsFromMilestones(fixture, true) : null;
      const spendDryRunLocked = typeof api.calculateTalentSpendDryRun === 'function' ? api.calculateTalentSpendDryRun(fixture, 'survivor_sturdy_start', false) : null;
      const spendDryRunEnabled = typeof api.calculateTalentSpendDryRun === 'function' ? api.calculateTalentSpendDryRun(fixture, 'survivor_sturdy_start', true) : null;
      const spendDryRunUnknown = typeof api.calculateTalentSpendDryRun === 'function' ? api.calculateTalentSpendDryRun(fixture, 'unknown_node', true) : null;
      const spendFixture = JSON.parse(JSON.stringify(S));
      spendFixture.player = spendFixture.player || {};
      spendFixture.player.talentEarning = {
        enabled: true,
        sourceId: 'boss_depth_milestone',
        milestonesReached: { first_boss: true },
        pointsAwarded: 1
      };
      spendFixture.player.talentLedger = {
        version: 1,
        unlocked: false,
        previewOnly: true,
        lifetimePoints: 1,
        availablePoints: 1,
        spentPoints: 0,
        earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
        notes: []
      };
      spendFixture.player.talentLearnedIds = {};
      spendFixture.player.talentUnlockIds = [];
      const spendBlocked = typeof api.applyTalentNodeSpend === 'function' ? api.applyTalentNodeSpend(JSON.parse(JSON.stringify(spendFixture)), 'hunter_board_clarity', false) : null;
      const spendAllowed = typeof api.applyTalentNodeSpend === 'function' ? api.applyTalentNodeSpend(spendFixture, 'hunter_board_clarity', true) : null;
      const spendDuplicate = typeof api.applyTalentNodeSpend === 'function' ? api.applyTalentNodeSpend(spendFixture, 'hunter_board_clarity', true) : null;
      const hasPendingAwards = typeof api.calculatePendingTalentMilestoneAwards === 'function';
      const dryRunStateBefore = JSON.stringify(S);
      const lockedFixture = JSON.parse(JSON.stringify(S));
      const disabledDryRun = hasPendingAwards ? api.calculatePendingTalentMilestoneAwards(lockedFixture, false) : null;
      const dryRunStateAfter = JSON.stringify(S);

      const mainFixture = JSON.parse(JSON.stringify(S));
      mainFixture.player = mainFixture.player || {};
      mainFixture.player.bossesDefeated = 6;
      mainFixture.player.safeExtractDepth = 12;
      mainFixture.player.talentEarning = {
        enabled: false,
        sourceId: 'boss_depth_milestone',
        milestonesReached: { first_boss: true, depth_5: true },
        pointsAwarded: 0
      };
      const mainFixtureBefore = JSON.stringify(mainFixture);
      lockedFixture.player.talentEarning.enabled = false;
      const pendingDryRun = hasPendingAwards ? api.calculatePendingTalentMilestoneAwards(mainFixture, true) : null;
      const mainFixtureAfter = JSON.stringify(mainFixture);
      const passiveContract = typeof api.passiveContract === 'function' ? api.passiveContract(S, ${JSON.stringify(TALENT_IDS.hunterClarity)}) : null;
      const passiveContractReplay = typeof api.passiveContract === 'function' ? api.passiveContract(S, ${JSON.stringify(TALENT_IDS.hunterClarity)}) : null;
      const debtContractLearnedState = { player: { talentLearnedIds: { ${JSON.stringify(TALENT_IDS.debtClarity)}: true }, talentUnlockIds: [${JSON.stringify(TALENT_IDS.debtClarity)}] } };
      const debtContractLockedState = { player: { talentLearnedIds: {}, talentUnlockIds: [] } };
      const debtPassiveContract = typeof api.passiveContract === 'function' ? api.passiveContract(debtContractLockedState, ${JSON.stringify(TALENT_IDS.debtClarity)}) : null;
      const debtPassiveContractLearned = typeof api.passiveContract === 'function' ? api.passiveContract(debtContractLearnedState, ${JSON.stringify(TALENT_IDS.debtClarity)}) : null;
      const debtPassiveContractReplay = typeof api.passiveContract === 'function' ? api.passiveContract(debtContractLearnedState, ${JSON.stringify(TALENT_IDS.debtClarity)}) : null;
      const readinessState = {
        player: {
          talentLearnedIds: { ${JSON.stringify(TALENT_IDS.hunterClarity)}: true },
          talentUnlockIds: [${JSON.stringify(TALENT_IDS.hunterClarity)}]
        }
      };
      const readinessBefore = JSON.stringify(readinessState);
      const readiness = typeof api.readinessMatrix === 'function' ? api.readinessMatrix(readinessState) : null;
      const debtLearnedReadiness = typeof api.readinessMatrix === 'function' ? api.readinessMatrix(debtContractLearnedState) : null;
      const readinessAfter = JSON.stringify(readinessState);
      const activationGateBefore = JSON.stringify(readinessState);
      const activationGateDryRun = typeof api.talentPassiveActivationGateDryRun === 'function' ? api.talentPassiveActivationGateDryRun(readinessState) : null;
      const activationGateAfter = JSON.stringify(readinessState);
      const debtSource = {
        statusLabel: 'Debt Active',
        balanceLabel: 'Owed 12 coin',
        pressureLabel: 'Pressure 2',
        termsLabel: 'Due on return',
        reminderLabel: 'Bring coin.',
        balanceCopper: 1200,
        pressure: 2,
        debtBalance: 1200,
        debtPressure: 2,
        repaymentState: 'pending',
        saveStateToken: 'preserve-me',
        combatState: { hp: 10 },
        rewardState: { coin: 3 },
        progressionState: { depth: 4 }
      };
      const debtSourceBefore = JSON.stringify(debtSource);
      const debtApplied = typeof api.applyDebtCollectorClarityCopy === 'function' ? api.applyDebtCollectorClarityCopy(debtContractLearnedState, debtSource) : null;
      const debtUnlearned = typeof api.applyDebtCollectorClarityCopy === 'function' ? api.applyDebtCollectorClarityCopy(debtContractLockedState, debtSource) : null;
      const debtAlternateSource = {
        summary: 'Debt Active',
        statusLabel: 'Owed marker',
        balanceLabel: 'Owed 25 coin',
        pressureLabel: 'Pressure 4',
        terms: 'No delay.',
        reminder: 'Pay soon.',
        balanceCopper: 2500,
        pressure: 4,
        debtBalance: 2500,
        debtPressure: 4,
        repaymentState: 'pending',
        saveStateToken: 'preserve-me-too',
        combatState: { hp: 22 },
        rewardState: { coin: 7 },
        progressionState: { depth: 8 }
      };
      const debtAlternateApplied = typeof api.applyDebtCollectorClarityCopy === 'function' ? api.applyDebtCollectorClarityCopy(debtContractLearnedState, debtAlternateSource) : null;
      const passiveBoardBefore = document.getElementById('questPanel')?.innerText || '';
      const passiveBoardAfter = document.getElementById('questPanel')?.innerText || '';

      const staleFixture = JSON.parse(JSON.stringify(mainFixture));
      staleFixture.player.talentEarning.milestonesReached.stale_bad_id = true;
      const staleDryRun = hasPendingAwards ? api.calculatePendingTalentMilestoneAwards(staleFixture, true) : null;

      const malformedValues = [
        { name: 'undefined', value: undefined },
        { name: 'null', value: null },
        { name: 'array', value: ['first_boss'] },
        { name: 'string', value: 'bad' },
        { name: 'number', value: 42 },
        { name: 'polluted', value: Object.create({ polluted: true }, { first_boss: { value: true, enumerable: true } }) }
      ];
      const malformedDryRuns = malformedValues.map(test => {
        const malformedFixture = JSON.parse(JSON.stringify(mainFixture));
        malformedFixture.player.talentEarning.milestonesReached = test.value;
        try {
          const result = hasPendingAwards ? api.calculatePendingTalentMilestoneAwards(malformedFixture, true) : null;
          return { name: test.name, ok: !!result && typeof result === 'object' && result.pendingPoints === 4, pendingPoints: result?.pendingPoints };
        } catch (error) {
          return { name: test.name, ok: false, error: error?.message || String(error) };
        }
      });
      return {
        hasContractHelper: typeof api.earningSourceContract === 'function',
        hasEnabledHelper: typeof api.earningEnabled === 'function',
        hasStatusHelper: typeof api.earningStatus === 'function',
        helperShape: {
          detectBoss: typeof api.detectBossMilestones === 'function',
          detectDepth: typeof api.detectDepthMilestones === 'function',
          allReached: typeof api.getAllReachedMilestones === 'function',
          calculate: typeof api.calculateTalentPointsFromMilestones === 'function',
          pendingAwards: hasPendingAwards,
          applyAwards: typeof api.applyPendingTalentMilestoneAwards === 'function',
          debtRendererCopyModel: typeof api.debtCollectorClarityRendererCopyModel === 'function'
        },
        contract,
        contract2,
        earning,
        status,
        enabled,
        pointsBefore,
        pointsAfter,
        summary1,
        summary2,
        fixture,
        detectBoss,
        detectDepth,
        allReached,
        pointsDisabled,
        pointsOverride,
        spendDryRunLocked,
        spendDryRunEnabled,
        spendDryRunUnknown,
        spendBlocked,
        spendAllowed,
        spendDuplicate,
        disabledDryRun,
        pendingDryRun,
        staleDryRun,
        malformedDryRuns,
        dryRunStateNotMutated: dryRunStateBefore === dryRunStateAfter,
        mainFixtureNotMutated: mainFixtureBefore === mainFixtureAfter,
        noActivationApi: !api.activateTalentNode && !api.spendTalentPoints && !api.getTalentBonus,
        passiveContract,
        passiveContractReplay,
        debtPassiveContract,
        debtPassiveContractLearned,
        debtPassiveContractReplay,
        readiness,
        debtLearnedReadiness,
        readinessBefore,
        readinessAfter,
        hasActivationGateDryRun: typeof api.talentPassiveActivationGateDryRun === 'function',
        activationGateDryRun,
        activationGateBefore,
        activationGateAfter,
        debtSource,
        debtSourceBefore,
        debtApplied,
        debtUnlearned,
        debtAlternateSource,
        debtAlternateApplied,
        passiveBoardBefore,
        passiveBoardAfter,
        notMutated: before === after
      };
    })()`);
    const earningContract = earningAudit?.contract;
    record('Talent passive contract helper exists', !!earningAudit?.passiveContract && !!earningAudit?.passiveContractReplay && earningAudit?.passiveContract?.nodeKey === TALENT_IDS.hunterClarity, JSON.stringify(earningAudit?.passiveContract));
    record('Talent passive contract metadata is stable and read-only', earningAudit?.passiveContract?.learned === false && earningAudit?.passiveContract?.passiveReady === false && earningAudit?.passiveContract?.passiveEnabled === false && earningAudit?.passiveContract?.effectKey === 'hunter_board_clarity_display_copy' && earningAudit?.passiveContract?.affectedSurface === 'Elite Board display copy only' && earningAudit?.passiveContract?.mutatesSave === false && earningAudit?.passiveContract?.appliesEffect === false && earningAudit?.passiveContract?.combat === false && earningAudit?.passiveContract?.economy === false && earningAudit?.passiveContract?.rewards === false && earningAudit?.passiveContract?.monsters === false && earningAudit?.passiveContract?.gear === false && earningAudit?.passiveContract?.dungeonProgression === false && earningAudit?.passiveContract?.dungeonScaling === false && earningAudit?.passiveContract?.revisit === false && earningAudit?.passiveContract?.debtCollector === false && earningAudit?.passiveContract?.eliteBoardDifficultyRiskRewardMath === false && JSON.stringify(earningAudit?.passiveContract) === JSON.stringify(earningAudit?.passiveContractReplay), JSON.stringify(earningAudit?.passiveContract));
    record('talentPassiveActivationReadiness reports audit state without mutation', !!earningAudit?.readiness && Array.isArray(earningAudit?.readiness?.passivesReady) && earningAudit?.readinessBefore === earningAudit?.readinessAfter, JSON.stringify(earningAudit?.readiness));
    record('Readiness matrix reports exactly 2 contract-ready passives', earningAudit?.readiness?.readinessSummary?.contractReady === 2, JSON.stringify(earningAudit?.readiness?.readinessSummary));
    record('Readiness matrix reports 1 display-ready passive (hunter only)', earningAudit?.readiness?.readinessSummary?.displayReady === 1, JSON.stringify(earningAudit?.readiness?.readinessSummary));
    record('Readiness matrix reports 0 gameplay-active passives', earningAudit?.readiness?.readinessSummary?.gameplayActive === 0, JSON.stringify(earningAudit?.readiness?.readinessSummary));
    record('Learned Debt Collector clarity is ready and live-enabled', earningAudit?.debtLearnedReadiness?.passivesReady?.find(entry => entry.id === TALENT_IDS.debtClarity)?.passiveReady === true && earningAudit?.debtLearnedReadiness?.passivesReady?.find(entry => entry.id === TALENT_IDS.debtClarity)?.passiveEnabled === true, JSON.stringify(earningAudit?.debtLearnedReadiness));
    record('Readiness report forbids action keywords in all passive entries', !Array.isArray(earningAudit?.readiness?.passivesReady) || earningAudit.readiness.passivesReady.every(p => { const text = JSON.stringify(p).toLowerCase(); return !/\\b(unlock|activate|spend|earn|claim|purchase|start|enter|begin)\\b/.test(text); }), JSON.stringify(earningAudit?.readiness?.passivesReady));
    const activationGateEntries = earningAudit?.activationGateDryRun?.passives;
    const hunterActivationGate = Array.isArray(activationGateEntries) ? activationGateEntries.find(entry => entry.nodeKey === TALENT_IDS.hunterClarity) : null;
    const debtActivationGate = Array.isArray(activationGateEntries) ? activationGateEntries.find(entry => entry.nodeKey === TALENT_IDS.debtClarity) : null;
    const requiredBlockedSystems = ['combat', 'economy', 'rewards', 'progression', 'revisit', 'debt math', 'pressure', 'repayment', 'monsters', 'gear', 'scaling'];
    record('talentPassiveActivationGateDryRun exists', earningAudit?.hasActivationGateDryRun === true, JSON.stringify(earningAudit?.activationGateDryRun));
    record('Activation gate dry run reports both prepared passives', !!hunterActivationGate && !!debtActivationGate && activationGateEntries.length === 2, JSON.stringify(activationGateEntries));
    record('Activation gate dry run does not mutate state', earningAudit?.activationGateBefore === earningAudit?.activationGateAfter && earningAudit?.activationGateDryRun?.mutatesSave === false, JSON.stringify({ before: earningAudit?.activationGateBefore, after: earningAudit?.activationGateAfter }));
    record('Debt Collector activation gate reports live renderer wiring', debtActivationGate?.liveRendererWired === true && debtActivationGate?.canActivateNow === true && !/missing live.*renderer wiring|renderer surface remains inactive/i.test(debtActivationGate?.activationBlockedReason || ''), JSON.stringify(debtActivationGate));
    record('Activation gate dry run remains non-mutating and gameplay-inert', Array.isArray(activationGateEntries) && activationGateEntries.every(entry => entry.mutatesSave === false && entry.appliesGameplayEffect === false), JSON.stringify(activationGateEntries));
    record('Activation gate dry run blocks every forbidden system', Array.isArray(activationGateEntries) && activationGateEntries.every(entry => { const blocked = (entry.blockedSystems || []).map(value => String(value).toLowerCase()); return requiredBlockedSystems.every(system => blocked.includes(system)); }), JSON.stringify(activationGateEntries));
    record('Activation gate entries expose the complete stable metadata contract', Array.isArray(activationGateEntries) && activationGateEntries.every(entry => ['nodeKey', 'label', 'readinessKnown', 'contractHelperPresent', 'displayCopyHelperPresent', 'smokeGuarded', 'learned', 'passiveReady', 'passiveEnabled', 'liveRendererWired', 'canActivateNow', 'activationBlockedReason', 'requiredFutureSteps', 'allowedSurface', 'blockedSystems', 'mutatesSave', 'appliesGameplayEffect'].every(field => Object.prototype.hasOwnProperty.call(entry, field))) && hunterActivationGate?.liveRendererWired === true && hunterActivationGate?.canActivateNow === false && activationGateEntries.every(entry => entry.allowedSurface === 'display-copy only'), JSON.stringify(activationGateEntries));
    const earningMilestones = Array.isArray(earningContract?.milestones) ? earningContract.milestones : [];
    const bossIds = Array.isArray(earningAudit?.detectBoss) ? earningAudit.detectBoss.map(entry => entry.milestone) : [];
    const depthIds = Array.isArray(earningAudit?.detectDepth) ? earningAudit.detectDepth.map(entry => entry.milestone) : [];
    const allReachedIds = Array.isArray(earningAudit?.allReached) ? earningAudit.allReached.map(entry => entry.milestone) : [];
    const uniqueAllReachedIds = new Set(allReachedIds);
    record('Talent earning source contract exists', earningAudit?.hasContractHelper === true && earningContract?.sourceId === 'boss_depth_milestone' && earningContract?.sourceLabel === 'Boss / Depth Milestone' && earningContract?.enabled === true, JSON.stringify(earningContract));
    record('Boss/depth milestone contract lists expected milestones', earningMilestones.length === 6 && earningMilestones.every(entry => entry.futureAwardIfEnabled === 1) && earningMilestones.some(entry => entry.milestone === 'first_boss' && /first.*boss/i.test(entry.label || '')) && earningMilestones.some(entry => entry.milestone === 'depth_5' && /depth.*5/i.test(entry.label || '')) && earningContract?.totalPointsIfAllMilestonesCompleted === 6, JSON.stringify(earningMilestones));
    record('Talent milestone helpers exist', earningAudit?.helperShape?.detectBoss === true && earningAudit?.helperShape?.detectDepth === true && earningAudit?.helperShape?.allReached === true && earningAudit?.helperShape?.calculate === true, JSON.stringify(earningAudit?.helperShape));
    record('Boss/depth milestone detection is stable', Array.isArray(earningAudit?.detectBoss) && Array.isArray(earningAudit?.detectDepth) && bossIds.includes('first_boss') && depthIds.includes('depth_5'), JSON.stringify({ bossIds, depthIds }));
    record('Milestone helpers return unique IDs', Array.isArray(earningAudit?.allReached) && earningAudit.allReached.length === uniqueAllReachedIds.size && earningAudit.allReached.every(entry => entry.milestone), JSON.stringify(earningAudit?.allReached));
    record('Talent earning feature flag exists and enabled', earningAudit?.earning?.enabled === true && earningAudit?.earning?.sourceId === 'boss_depth_milestone' && earningAudit?.earning?.pointsAwarded === 0 && earningAudit?.earning?.milestonesReached && Object.keys(earningAudit.earning.milestonesReached).length === 0 && earningAudit?.enabled === true, JSON.stringify(earningAudit?.earning));
    record('Disabled fixture returns 0 points', earningAudit?.pointsDisabled === 0, JSON.stringify({ pointsDisabled: earningAudit?.pointsDisabled }));
    record('Override-enabled fixture calculates points', earningAudit?.pointsOverride === 6, JSON.stringify({ pointsOverride: earningAudit?.pointsOverride }));
    record('Talent spending dry run helper exists', earningAudit?.spendDryRunLocked && earningAudit?.spendDryRunEnabled && earningAudit?.spendDryRunUnknown, JSON.stringify({ locked: earningAudit?.spendDryRunLocked, enabled: earningAudit?.spendDryRunEnabled, unknown: earningAudit?.spendDryRunUnknown }));
    record('Talent spending dry run is read-only and blocked while locked', earningAudit?.spendDryRunLocked?.mutatesSave === false && earningAudit?.spendDryRunLocked?.learnedStateWritten === false && earningAudit?.spendDryRunLocked?.passiveApplied === false && earningAudit?.spendDryRunLocked?.canAfford === false && earningAudit?.spendDryRunLocked?.blockedReason === 'spending_disabled' && earningAudit?.spendDryRunLocked?.availableBefore === earningAudit?.spendDryRunLocked?.availableAfterPreview, JSON.stringify(earningAudit?.spendDryRunLocked));
    record('Talent spending dry run stays read-only when override-enabled', earningAudit?.spendDryRunEnabled?.mutatesSave === false && earningAudit?.spendDryRunEnabled?.learnedStateWritten === false && earningAudit?.spendDryRunEnabled?.passiveApplied === false && earningAudit?.spendDryRunEnabled?.targetNodeKey === 'survivor_sturdy_start' && earningAudit?.spendDryRunEnabled?.cost === 1 && earningAudit?.spendDryRunEnabled?.availableBefore === 0 && earningAudit?.spendDryRunEnabled?.availableAfterPreview === 0 && earningAudit?.spendDryRunEnabled?.blockedReason === 'spending_disabled', JSON.stringify(earningAudit?.spendDryRunEnabled));
    record('Talent spending dry run handles unknown nodes safely', earningAudit?.spendDryRunUnknown?.mutatesSave === false && earningAudit?.spendDryRunUnknown?.learnedStateWritten === false && earningAudit?.spendDryRunUnknown?.passiveApplied === false && earningAudit?.spendDryRunUnknown?.blockedReason === 'unknown_node', JSON.stringify(earningAudit?.spendDryRunUnknown));
    record('Talent spending is blocked by default', earningAudit?.spendBlocked?.ok === false && earningAudit?.spendBlocked?.blockedReason === 'spending_disabled' && earningAudit?.spendBlocked?.learnedStateWritten === false, JSON.stringify(earningAudit?.spendBlocked));
    record('Talent spending override learns Board Clarity', earningAudit?.spendAllowed?.ok === true && earningAudit?.spendAllowed?.blockedReason === '' && earningAudit?.spendAllowed?.nodeKey === 'hunter_board_clarity' && earningAudit?.spendAllowed?.cost === 1 && earningAudit?.spendAllowed?.availableBefore === 1 && earningAudit?.spendAllowed?.availableAfter === 0 && earningAudit?.spendAllowed?.learnedStateWritten === true && earningAudit?.spendAllowed?.alreadyLearned === false && earningAudit?.spendAllowed?.passiveApplied === false, JSON.stringify(earningAudit?.spendAllowed));
    record('Duplicate spending is blocked', earningAudit?.spendDuplicate?.ok === false && earningAudit?.spendDuplicate?.blockedReason === 'already_learned' && earningAudit?.spendDuplicate?.alreadyLearned === true, JSON.stringify(earningAudit?.spendDuplicate));
    record('Talent earning status shows 0 points awarded before awards', earningAudit?.hasStatusHelper === true && earningAudit?.status?.enabled === true && earningAudit?.status?.pointsAwardedNow === 0 && earningAudit?.status?.availableMilestones === 6 && earningAudit?.status?.totalPointsIfFullyUnlocked === 6, JSON.stringify(earningAudit?.status));
    record('Talent earning source contract does not mutate state', earningAudit?.notMutated === true, JSON.stringify({ notMutated: earningAudit?.notMutated }));
    record('Talent points remain 0 before live awards', earningAudit?.pointsBefore === 0 && earningAudit?.pointsAfter === 0 && earningAudit?.summary1?.pointsAvailable === 0 && earningAudit?.summary2?.pointsAvailable === 0, JSON.stringify({ pointsBefore: earningAudit?.pointsBefore, pointsAfter: earningAudit?.pointsAfter, availableBefore: earningAudit?.summary1?.pointsAvailable, availableAfter: earningAudit?.summary2?.pointsAvailable }));
    record('Normal saves now initialize earning enabled', earningAudit?.earning?.enabled === true && earningAudit?.pointsDisabled === 6, JSON.stringify({ earning: earningAudit?.earning, pointsDisabled: earningAudit?.pointsDisabled }));
    record('Earning gate is live in state and contract', earningAudit?.earning?.enabled === true && earningContract?.enabled === true && earningAudit?.earning?.pointsAwarded === 0, JSON.stringify({ earning: earningAudit?.earning, contract: earningContract }));
    record('Talent earning source contract returns stable contract', !!earningContract && JSON.stringify(earningContract) === JSON.stringify(earningAudit?.contract2), JSON.stringify(earningContract));
    const disabledDryRun = earningAudit?.disabledDryRun;
    const pendingDryRun = earningAudit?.pendingDryRun;
    const staleDryRun = earningAudit?.staleDryRun;
    record('Pending award dry-run exists and is callable', earningAudit?.helperShape?.pendingAwards === true && earningAudit?.helperShape?.applyAwards === true, JSON.stringify(earningAudit?.helperShape));
    record('Disabled normal state returns full zero-state', disabledDryRun?.enabled === false && disabledDryRun?.sourceId === 'boss_depth_milestone' && Array.isArray(disabledDryRun?.reachedMilestones) && disabledDryRun.reachedMilestones.length === 0 && Array.isArray(disabledDryRun?.alreadyAwardedMilestones) && disabledDryRun.alreadyAwardedMilestones.length === 0 && Array.isArray(disabledDryRun?.pendingMilestones) && disabledDryRun.pendingMilestones.length === 0 && disabledDryRun?.pendingPoints === 0 && disabledDryRun?.previewOnly === true && disabledDryRun?.dryRun === true, JSON.stringify(disabledDryRun));
    record('Enabled fixture calculates reached milestones correctly', pendingDryRun?.enabled === true && pendingDryRun?.sourceId === 'boss_depth_milestone' && pendingDryRun?.reachedMilestones?.length === 4 && pendingDryRun.reachedMilestones.includes('first_boss') && pendingDryRun.reachedMilestones.includes('boss_5') && pendingDryRun.reachedMilestones.includes('depth_5') && pendingDryRun.reachedMilestones.includes('depth_10'), JSON.stringify(pendingDryRun?.reachedMilestones));
    record('Enabled fixture calculates pending milestones correctly', pendingDryRun?.pendingMilestones?.length === 2 && pendingDryRun.pendingMilestones.includes('boss_5') && pendingDryRun.pendingMilestones.includes('depth_10') && !pendingDryRun.pendingMilestones.includes('first_boss') && !pendingDryRun.pendingMilestones.includes('depth_5'), JSON.stringify(pendingDryRun?.pendingMilestones));
    record('Pending points equals pending milestones count', pendingDryRun?.pendingPoints === 2 && pendingDryRun.pendingPoints === pendingDryRun?.pendingMilestones?.length, JSON.stringify({ pendingPoints: pendingDryRun?.pendingPoints, count: pendingDryRun?.pendingMilestones?.length }));
    record('Already-awarded milestones are correct', pendingDryRun?.alreadyAwardedMilestones?.length === 2 && pendingDryRun.alreadyAwardedMilestones.includes('first_boss') && pendingDryRun.alreadyAwardedMilestones.includes('depth_5'), JSON.stringify(pendingDryRun?.alreadyAwardedMilestones));
    record('Dry-run milestone arrays are unique', !!pendingDryRun && ['reachedMilestones', 'alreadyAwardedMilestones', 'pendingMilestones'].every(key => Array.isArray(pendingDryRun[key]) && pendingDryRun[key].length === new Set(pendingDryRun[key]).size), JSON.stringify(pendingDryRun));
    record('Stale awarded milestone IDs do not inflate pending points', staleDryRun?.pendingPoints === 2 && !staleDryRun?.pendingMilestones?.includes('stale_bad_id'), JSON.stringify({ pendingPoints: staleDryRun?.pendingPoints, pending: staleDryRun?.pendingMilestones }));
    record('Stale awarded milestone IDs appear in awarded list but not pending', staleDryRun?.alreadyAwardedMilestones?.includes('stale_bad_id') && !staleDryRun?.pendingMilestones?.includes('stale_bad_id'), JSON.stringify({ awarded: staleDryRun?.alreadyAwardedMilestones, pending: staleDryRun?.pendingMilestones }));
    (earningAudit?.malformedDryRuns || []).forEach(test => record(`Malformed milestonesReached (${test.name}) does not crash`, test.ok === true, JSON.stringify(test)));
    record('Dry-run does not mutate normal state', earningAudit?.dryRunStateNotMutated === true, JSON.stringify({ notMutated: earningAudit?.dryRunStateNotMutated }));
    record('Dry-run does not mutate fixture', earningAudit?.mainFixtureNotMutated === true, JSON.stringify({ notMutated: earningAudit?.mainFixtureNotMutated }));
    record('Dry-run leaves normal saves read-only with zero points before awards', earningAudit?.earning?.enabled === true && earningAudit?.earning?.pointsAwarded === 0 && earningAudit?.summary2?.pointsAvailable === 0, JSON.stringify({ earning: earningAudit?.earning, available: earningAudit?.summary2?.pointsAvailable }));
    record('Dry-run does not create learned state or passive effects', earningAudit?.spendDryRunLocked?.learnedStateWritten === false && earningAudit?.spendDryRunEnabled?.learnedStateWritten === false && earningAudit?.spendDryRunLocked?.passiveApplied === false && earningAudit?.spendDryRunEnabled?.passiveApplied === false, JSON.stringify({ locked: earningAudit?.spendDryRunLocked, enabled: earningAudit?.spendDryRunEnabled }));
    record('No unlock/spending/passive behavior appears', earningAudit?.noActivationApi === true, JSON.stringify({ noActivationApi: earningAudit?.noActivationApi }));
    const savedBeforePersistence = await readSave(client);
    const learnedSaveFixture = JSON.parse(JSON.stringify(savedBeforePersistence));
    learnedSaveFixture.player = learnedSaveFixture.player || {};
    learnedSaveFixture.player.talentEarning = {
      enabled: true,
      sourceId: 'boss_depth_milestone',
      milestonesReached: { first_boss: true },
      pointsAwarded: 1
    };
    learnedSaveFixture.player.talentLedger = {
      version: 1,
      unlocked: false,
      previewOnly: true,
      lifetimePoints: 1,
      availablePoints: 1,
      spentPoints: 0,
      earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
      notes: []
    };
    learnedSaveFixture.player.talentLearnedIds = {};
    learnedSaveFixture.player.talentUnlockIds = [];
    const learnedSpendPackage = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api || typeof api.applyTalentNodeSpend !== 'function') return null;
      const fixture = ${JSON.stringify(learnedSaveFixture)};
      const result = api.applyTalentNodeSpend(fixture, 'hunter_board_clarity', true);
      return { result, fixture };
    })()`);
    const learnedSpendResult = learnedSpendPackage?.result || null;
    const learnedSpendFixture = learnedSpendPackage?.fixture || learnedSaveFixture;
    const learnedSaveBefore = JSON.stringify(learnedSpendFixture);
    await writeSave(client, learnedSpendFixture);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const reloadedLearnedSave = await readSave(client);
    const reloadedLearnedSummary = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.summary === 'function' ? api.summary(S) : null;
    })()`);
    record('Live learned spend persists in save', !!learnedSpendResult && learnedSpendResult.ok === true && learnedSpendResult.nodeKey === 'hunter_board_clarity' && learnedSpendResult.availableBefore === 1 && learnedSpendResult.availableAfter === 0 && learnedSpendResult.learnedStateWritten === true && reloadedLearnedSave?.player?.talentLearnedIds?.hunter_board_clarity === true && Array.isArray(reloadedLearnedSave?.player?.talentUnlockIds) && reloadedLearnedSave.player.talentUnlockIds.includes('hunter_board_clarity') && reloadedLearnedSave?.player?.talentLedger?.availablePoints === 0 && reloadedLearnedSave?.player?.talentLedger?.spentPoints === 1, JSON.stringify({ learnedSpendResult, save: reloadedLearnedSave?.player || null }));
    record('Live learned spend survives save repair and reload', reloadedLearnedSave?.player?.talentLearnedIds?.hunter_board_clarity === true && reloadedLearnedSave?.player?.talentLedger?.availablePoints === 0 && reloadedLearnedSave?.player?.talentLedger?.spentPoints === 1, JSON.stringify(reloadedLearnedSummary));
    const learnedPassiveContract = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.passiveContract === 'function' ? api.passiveContract(S, ${JSON.stringify(TALENT_IDS.hunterClarity)}) : null;
    })()`);
    const learnedBoardText = await evalByValue(client, `(() => { S.screen = 'town'; if (typeof render === 'function') render(); return document.getElementById('questPanel')?.innerText || ''; })()`);
    const learnedCopyProbe = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api || typeof api.applyHunterBoardClarityCopy !== 'function') return null;
      const source = {
        id: 'probe',
        title: 'Wanted',
        eliteName: 'Glassfang Brute',
        targetLocation: 'Lowfire District',
        contractText: 'Defeat Glassfang Brute when it appears.',
        bonusWrit: 'Hold the line',
        rewardPreview: '10 coin',
        flavor: 'A brutal mark'
      };
      const before = JSON.stringify(source);
      const applied = api.applyHunterBoardClarityCopy(S, source);
      return {
        before,
        after: JSON.stringify(source),
        applied,
        sameObject: applied === source
      };
    })()`);
    const alternateCopyProbe = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api || typeof api.applyHunterBoardClarityCopy !== 'function') return null;
      const surface = {
        title: 'Elite Board summary',
        targetLocation: 'Floor 2',
        contractText: 'Defeat the posted mark when it appears.',
        rewardPreview: '12 coin',
        flavor: 'A compact board summary',
        summary: 'Short summary line'
      };
      const before = JSON.stringify(surface);
      const applied = api.applyHunterBoardClarityCopy(S, surface);
      return {
        before,
        after: JSON.stringify(surface),
        applied,
        sameObject: applied === surface
      };
    })()`);
    const unlearnedBoardText = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (api && typeof api.applyHunterBoardClarityCopy === 'function') {
        const sample = { title: 'Wanted', targetLocation: 'Lowfire District', contractText: 'Defeat Glassfang Brute when it appears.', rewardPreview: '10 coin', flavor: 'A brutal mark' };
        api.applyHunterBoardClarityCopy({ player: { talentLearnedIds: {} } }, sample);
      }
      return document.getElementById('questPanel')?.innerText || '';
    })()`);
    record('Learned hunter_board_clarity is detected by passive contract', learnedPassiveContract?.learned === true && learnedPassiveContract?.passiveReady === true, JSON.stringify(learnedPassiveContract));
    record('Passive contract activates copy-only surface and stays read-only', learnedPassiveContract?.passiveEnabled === true && learnedPassiveContract?.liveRendererWired === true && learnedPassiveContract?.appliesEffect === false && learnedPassiveContract?.affectedSurface === 'Elite Board display copy only' && learnedPassiveContract?.mutatesSave === false, JSON.stringify(learnedPassiveContract));
    record('Passive copy helper returns clearer text without mutating input or numeric fields', learnedCopyProbe?.sameObject === false && learnedCopyProbe?.before === learnedCopyProbe?.after && learnedCopyProbe?.applied?.passiveSurface === 'Elite Board display copy only' && learnedCopyProbe?.applied?.passiveApplied === true && learnedCopyProbe?.applied?.targetLocation === 'Target: Lowfire District' && learnedCopyProbe?.applied?.contractText === 'Objective: Defeat Glassfang Brute when it appears.' && learnedCopyProbe?.applied?.rewardPreview === 'Reward preview: 10 coin' && learnedCopyProbe?.applied?.flavor === 'Clarity note: A brutal mark' && learnedCopyProbe?.applied?.title === 'Wanted (clear read)', JSON.stringify(learnedCopyProbe));
    record('Alternate Elite Board summary fixture uses the same copy helper contract', alternateCopyProbe?.sameObject === false && alternateCopyProbe?.before === alternateCopyProbe?.after && alternateCopyProbe?.applied?.passiveSurface === 'Elite Board display copy only' && alternateCopyProbe?.applied?.passiveApplied === true && alternateCopyProbe?.applied?.targetLocation === 'Target: Floor 2' && alternateCopyProbe?.applied?.contractText === 'Objective: Defeat the posted mark when it appears.' && alternateCopyProbe?.applied?.rewardPreview === 'Reward preview: 12 coin' && alternateCopyProbe?.applied?.summary === 'Clear read: Short summary line', JSON.stringify(alternateCopyProbe));
    record('Unlearned debt_collector_clarity contract reports disabled/not applying', earningAudit?.debtPassiveContract?.learned === false && earningAudit?.debtPassiveContract?.passiveReady === false && earningAudit?.debtPassiveContract?.passiveEnabled === false && earningAudit?.debtPassiveContract?.appliesEffect === false && earningAudit?.debtPassiveContract?.mutatesSave === false, JSON.stringify(earningAudit?.debtPassiveContract));
    record('Learned debt_collector_clarity is preview-ready and live-render wired', earningAudit?.debtPassiveContractLearned?.nodeKey === TALENT_IDS.debtClarity && earningAudit?.debtPassiveContractLearned?.contractOwner === 'DungeonDexTalents' && earningAudit?.debtPassiveContractLearned?.learned === true && earningAudit?.debtPassiveContractLearned?.passiveReady === true && earningAudit?.debtPassiveContractLearned?.passiveEnabled === true && earningAudit?.debtPassiveContractLearned?.appliesEffect === false && earningAudit?.debtPassiveContractLearned?.liveRendererWired === true && earningAudit?.debtPassiveContractReplay?.passiveEnabled === true && JSON.stringify(earningAudit?.debtPassiveContractLearned) === JSON.stringify(earningAudit?.debtPassiveContractReplay), JSON.stringify(earningAudit?.debtPassiveContractLearned));
    record('Talent API owns Debt renderer copy model', earningAudit?.helperShape?.debtRendererCopyModel === true, JSON.stringify(earningAudit?.helperShape));
    record('Debt Collector helper improves display copy without changing numeric values', earningAudit?.debtApplied?.passiveSurface === 'Debt Collector live renderer copy only' && earningAudit?.debtApplied?.passiveApplied === true && earningAudit?.debtApplied?.statusLabel === 'Debt status: Debt Active' && earningAudit?.debtApplied?.balanceLabel === 'Amount owed: Owed 12 coin' && earningAudit?.debtApplied?.pressureLabel === 'Pressure: Pressure 2' && earningAudit?.debtApplied?.termsLabel === 'Terms: Due on return' && earningAudit?.debtApplied?.reminderLabel === 'Reminder: Bring coin.' && earningAudit?.debtApplied?.balanceCopper === 1200 && earningAudit?.debtApplied?.pressure === 2, JSON.stringify(earningAudit?.debtApplied));
    record('Debt Collector helper leaves unlearned copy unchanged', JSON.stringify(earningAudit?.debtUnlearned) === JSON.stringify(earningAudit?.debtSource) && earningAudit?.debtUnlearned?.passiveApplied !== true && earningAudit?.debtUnlearned?.passiveSurface === undefined, JSON.stringify({ before: earningAudit?.debtSource, after: earningAudit?.debtUnlearned }));
    record('Debt Collector helper does not mutate input object', earningAudit?.debtSourceBefore === JSON.stringify(earningAudit?.debtSource), JSON.stringify({ before: earningAudit?.debtSourceBefore, after: JSON.stringify(earningAudit?.debtSource) }));
    record('Debt Collector helper preserves non-display gameplay state fields', earningAudit?.debtApplied?.debtBalance === 1200 && earningAudit?.debtApplied?.debtPressure === 2 && earningAudit?.debtApplied?.repaymentState === 'pending' && earningAudit?.debtApplied?.saveStateToken === 'preserve-me' && earningAudit?.debtApplied?.combatState?.hp === 10 && earningAudit?.debtApplied?.rewardState?.coin === 3 && earningAudit?.debtApplied?.progressionState?.depth === 4, JSON.stringify(earningAudit?.debtApplied));
    record('Debt Collector alternate summary fixture reuses the same copy helper', earningAudit?.debtAlternateApplied?.passiveSurface === 'Debt Collector live renderer copy only' && earningAudit?.debtAlternateApplied?.statusLabel === 'Debt status: Owed marker' && earningAudit?.debtAlternateApplied?.balanceLabel === 'Amount owed: Owed 25 coin' && earningAudit?.debtAlternateApplied?.pressureLabel === 'Pressure: Pressure 4' && earningAudit?.debtAlternateApplied?.termsLabel === 'Terms: No delay.' && earningAudit?.debtAlternateApplied?.reminderLabel === 'Reminder: Pay soon.' && earningAudit?.debtAlternateApplied?.debtBalance === 2500 && earningAudit?.debtAlternateApplied?.debtPressure === 4 && earningAudit?.debtAlternateApplied?.repaymentState === 'pending' && earningAudit?.debtAlternateApplied?.saveStateToken === 'preserve-me-too' && earningAudit?.debtAlternateApplied?.combatState?.hp === 22 && earningAudit?.debtAlternateApplied?.rewardState?.coin === 7 && earningAudit?.debtAlternateApplied?.progressionState?.depth === 8, JSON.stringify(earningAudit?.debtAlternateApplied));
    record('Debt Collector helper stays text-only and leaves save/player state untouched', earningAudit?.debtApplied?.balanceCopper === 1200 && earningAudit?.debtApplied?.pressure === 2 && earningAudit?.debtPassiveContract?.mutatesSave === false && earningAudit?.debtApplied?.saveStateToken === 'preserve-me', JSON.stringify({ debtPassiveContract: earningAudit?.debtPassiveContract, debtApplied: earningAudit?.debtApplied }));
    record('Learned board copy is clearer while staying informational only', typeof learnedBoardText === 'string' && learnedBoardText.includes('Target:') && learnedBoardText.includes('Objective:') && learnedBoardText.includes('Reward preview:'), learnedBoardText.slice(0, 700));
    record('Unlearned board copy stays unchanged through passive helper reads', typeof unlearnedBoardText === 'string' && !unlearnedBoardText.includes('Target:'), unlearnedBoardText.slice(0, 700));
    const talentActionTextAudit = await evalByValue(client, `(() => {
      const panel = document.getElementById('talentPanel');
      const texts = Array.from(panel ? panel.querySelectorAll('button, [role="button"], a') : []).map(node => (node.innerText || node.textContent || '').trim()).filter(Boolean);
      return {
        matches: texts.filter(text => /\\b(purchase|unlock|activate|claim|start|reward|spend)\\b/i.test(text)),
        texts
      };
    })()`);
    record('No new talent action text appears in the UI', Array.isArray(talentActionTextAudit?.matches) && talentActionTextAudit.matches.length === 0, Array.isArray(talentActionTextAudit?.texts) ? talentActionTextAudit.texts.slice(0, 20).join(' | ') : '');
    record('Passive contract and board render do not mutate save state', learnedCopyProbe?.before === learnedCopyProbe?.after && learnedPassiveContract?.mutatesSave === false, JSON.stringify({ learnedPassiveContract, learnedCopyProbe }));
    record('Learned spend does not mutate save snapshot unexpectedly', learnedSaveBefore === JSON.stringify(learnedSaveFixture), JSON.stringify({ before: learnedSaveBefore, after: JSON.stringify(learnedSaveFixture) }));
    const persistenceFixture = JSON.parse(JSON.stringify(savedBeforePersistence));
    persistenceFixture.player = persistenceFixture.player || {};
    persistenceFixture.player.talentEarning = persistenceFixture.player.talentEarning || {};
    persistenceFixture.player.talentEarning.enabled = true;
    persistenceFixture.player.talentEarning.sourceId = 'boss_depth_milestone';
    persistenceFixture.player.talentEarning.milestonesReached = {
      first_boss: true,
      boss_5: true,
      depth_5: true,
      depth_10: true
    };
    persistenceFixture.player.talentEarning.pointsAwarded = 4;
    persistenceFixture.player.talentLedger = persistenceFixture.player.talentLedger || {};
    persistenceFixture.player.talentLedger.lifetimePoints = 4;
    persistenceFixture.player.talentLedger.availablePoints = 4;
    persistenceFixture.player.talentLedger.spentPoints = 0;
    persistenceFixture.player.talentLedger.previewOnly = true;
    persistenceFixture.player.talentLedger.unlocked = false;
    persistenceFixture.player.talentLedger.earnedSources = [{ sourceId: 'boss_depth_milestone', points: 4 }];
    await writeSave(client, persistenceFixture);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const reloadedAwardSave = await readSave(client);
    record('Live award persists in save', reloadedAwardSave?.player?.talentEarning?.enabled === true && reloadedAwardSave?.player?.talentEarning?.pointsAwarded === 4 && reloadedAwardSave?.player?.talentEarning?.milestonesReached?.first_boss === true && reloadedAwardSave?.player?.talentEarning?.milestonesReached?.boss_5 === true && reloadedAwardSave?.player?.talentEarning?.milestonesReached?.depth_5 === true && reloadedAwardSave?.player?.talentEarning?.milestonesReached?.depth_10 === true, JSON.stringify(reloadedAwardSave?.player?.talentEarning || null));
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const previewSafety = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      if (!api) return null;
      const before = JSON.stringify({ talents: S.player?.talents || null, talentPointsEarned: S.player?.talentPointsEarned, talentPointsSpent: S.player?.talentPointsSpent, talentPoints: S.player?.talentPoints, talentUnlockIds: S.player?.talentUnlockIds || [] });
      const passiveMap = typeof api.passivePreviewMap === 'function' ? api.passivePreviewMap() : null;
      const summaryUnknown = typeof api.passivePreviewSummary === 'function' ? api.passivePreviewSummary('missing-branch') : null;
      const summaryMalformed = typeof api.previewBranchSummary === 'function' ? api.previewBranchSummary(null) : null;
      const nodeUnknown = typeof api.previewNodeDetails === 'function' ? api.previewNodeDetails(null) : null;
      const nodeMalformed = typeof api.previewNodeDetails === 'function' ? api.previewNodeDetails({}) : null;
      if (passiveMap?.survivor) passiveMap.survivor.branchName = '__mutated__';
      const after = JSON.stringify({ talents: S.player?.talents || null, talentPointsEarned: S.player?.talentPointsEarned, talentPointsSpent: S.player?.talentPointsSpent, talentPoints: S.player?.talentPoints, talentUnlockIds: S.player?.talentUnlockIds || [] });
      return {
        before,
        after,
        passiveMap,
        summaryUnknown,
        summaryMalformed,
        nodeUnknown,
        nodeMalformed,
        apiKeys: Object.keys(api || {})
      };
    })()`);
    record('Talent preview helpers stay defensive on unknown inputs', !!previewSafety && previewSafety.before === previewSafety.after && previewSafety.passiveMap && previewSafety.passiveMap.survivor?.branchName !== '__mutated__' && previewSafety.summaryUnknown?.locked === true && previewSafety.summaryUnknown?.previewOnly === true && previewSafety.summaryUnknown?.active === false && previewSafety.summaryUnknown?.gameplayEnabled === false && previewSafety.summaryUnknown?.nodeCount === 0 && previewSafety.summaryMalformed?.locked === true && previewSafety.summaryMalformed?.previewOnly === true && previewSafety.nodeUnknown?.locked === true && previewSafety.nodeUnknown?.previewOnly === true && previewSafety.nodeUnknown?.active === false && previewSafety.nodeUnknown?.gameplayEnabled === false && previewSafety.nodeUnknown?.learned === false && previewSafety.nodeUnknown?.applied === false && previewSafety.nodeUnknown?.effectValue === 0 && previewSafety.nodeMalformed?.locked === true && previewSafety.nodeMalformed?.previewOnly === true && previewSafety.nodeMalformed?.active === false && previewSafety.nodeMalformed?.gameplayEnabled === false && previewSafety.nodeMalformed?.effectValue === 0, JSON.stringify(previewSafety));
    record('Talent ruleset summary remains non-gameplay', rulesetSummary.locked === true && rulesetSummary.previewOnly === true && rulesetSummary.active === false && rulesetSummary.gameplayEnabled === false && rulesetSummary.earningEnabled === true && rulesetSummary.spendingEnabled === false && rulesetSummary.unlocksEnabled === false && rulesetSummary.passiveEffectsEnabled === false && rulesetSummary.branchCount === 4 && rulesetSummary.tierCount === 3 && rulesetSummary.nodeCount === 13 && rulesetSummary.activeCap === 6 && rulesetSummary.spendableCap === 0, JSON.stringify(rulesetSummary));
    record('Talent ruleset helpers are defensive copies', rulesetAudit?.hasGlobal === true && rulesetAudit?.frozenGlobal === true && rulesetAudit?.defensiveCopy === true, JSON.stringify({ hasGlobal: rulesetAudit?.hasGlobal, frozenGlobal: rulesetAudit?.frozenGlobal, defensiveCopy: rulesetAudit?.defensiveCopy }));
    record('Talent foundation API is read-only zero state', !!talentFoundationAudit?.ok && talentFoundationAudit.notMutated === true && talentFoundationAudit.hasReadHelpers === true && talentFoundationAudit.hasCurrentMutators === true && talentFoundationAudit.summary?.pointsEarned === 0 && talentFoundationAudit.summary?.pointsSpent === 0 && talentFoundationAudit.summary?.pointsAvailable === 0 && Array.isArray(talentFoundationAudit.summary?.unlockedIds) && talentFoundationAudit.summary.unlockedIds.length === 0 && talentFoundationAudit.bonuses?.maxHpPct === 0 && talentFoundationAudit.bonuses?.eliteBoardRewardPct === 0 && talentFoundationAudit.bonuses?.charterCostPct === 0 && talentFoundationAudit.bonuses?.sellValuePct === 0, JSON.stringify(talentFoundationAudit));
    record('Talent point source decision is boss trophy milestone and read-only', talentStateContractAudit?.hasPointSourceDecision === true && talentStateContractAudit?.hasPointSourceDecisionSummary === true && talentStateContractAudit?.decision?.selectedSource === 'boss_trophy_milestone' && talentStateContractAudit?.decision?.label === 'Boss Trophy Milestone' && talentStateContractAudit?.decision?.status === 'planned' && talentStateContractAudit?.decision?.awardsPoints === false && talentStateContractAudit?.decision?.mutatesSave === false && talentStateContractAudit?.decision?.grantsCurrency === false && talentStateContractAudit?.decision?.enablesSpending === false && talentStateContractAudit?.decision?.requiresSpendPath === true && Array.isArray(talentStateContractAudit?.decision?.rationale) && talentStateContractAudit.decision.rationale.length === 4 && Array.isArray(talentStateContractAudit?.decision?.rejectedAlternatives) && talentStateContractAudit.decision.rejectedAlternatives.length === 2 && talentStateContractAudit?.beforeLedger === talentStateContractAudit?.afterLedger, JSON.stringify(talentStateContractAudit?.decision));
    record('Talent point award preview is read-only and award-disabled', talentStateContractAudit?.hasPointAwardPreview === true && talentStateContractAudit?.hasPointAwardPreviewSummary === true && talentStateContractAudit?.awardPreview?.source === 'boss_trophy_milestone' && talentStateContractAudit?.awardPreview?.status === 'preview' && talentStateContractAudit?.awardPreview?.amountPreview === 1 && talentStateContractAudit?.awardPreview?.alreadyClaimed === false && talentStateContractAudit?.awardPreview?.claimTrackingReady === true && talentStateContractAudit?.awardPreview?.claimKey === 'boss_trophy_milestone:first_award' && talentStateContractAudit?.awardPreview?.awardsPoints === false && talentStateContractAudit?.awardPreview?.mutatesSave === false && talentStateContractAudit?.awardPreview?.grantsCurrency === false && talentStateContractAudit?.awardPreview?.enablesSpending === false && talentStateContractAudit?.awardPreview?.requiresLiveAwardPatch === true && talentStateContractAudit?.awardPreview?.requiresClaimTrackingPatch === false && talentStateContractAudit?.beforeLedger === talentStateContractAudit?.afterLedger && talentStateContractAudit?.beforeState === talentStateContractAudit?.afterState, JSON.stringify(talentStateContractAudit?.awardPreview));
    record('Hunter Board clarity spend preview helper exists', talentStateContractAudit?.hasSpendPreview === true && talentStateContractAudit?.hasSpendPreviewSummary === true && talentStateContractAudit?.hasHunterBoardClaritySpendPreview === true && talentStateContractAudit?.hasHunterBoardClaritySpendPreviewSummary === true, JSON.stringify({ spendPreview: talentStateContractAudit?.spendPreviewOnePoint, spendPreviewSummary: talentStateContractAudit?.spendPreviewOnePointSummary }));
    record('Hunter Board clarity spend preview is blocked with no points', talentStateContractAudit?.spendPreviewNoPoints?.nodeKey === 'hunter_board_clarity' && talentStateContractAudit?.spendPreviewNoPoints?.eligible === false && talentStateContractAudit?.spendPreviewNoPoints?.blockedReason === 'insufficient_points' && talentStateContractAudit?.spendPreviewNoPoints?.cost === 1 && talentStateContractAudit?.spendPreviewNoPoints?.availablePoints === 0 && talentStateContractAudit?.spendPreviewNoPoints?.wouldSpendPoints === false && talentStateContractAudit?.spendPreviewNoPoints?.wouldLearnNode === false && talentStateContractAudit?.spendPreviewNoPoints?.mutatesSave === false && talentStateContractAudit?.spendPreviewNoPoints?.spendsPoints === false && talentStateContractAudit?.spendPreviewNoPoints?.learnsNode === false && talentStateContractAudit?.spendPreviewNoPoints?.affectsCombat === false && talentStateContractAudit?.spendPreviewNoPoints?.affectsRewards === false && talentStateContractAudit?.spendPreviewNoPoints?.affectsEconomy === false && talentStateContractAudit?.spendPreviewNoPoints?.affectsDebt === false && talentStateContractAudit?.spendPreviewNoPoints?.affectsRevisit === false && talentStateContractAudit?.spendPreviewNoPointsBefore === talentStateContractAudit?.spendPreviewNoPointsAfter, JSON.stringify(talentStateContractAudit?.spendPreviewNoPoints));
    record('Hunter Board clarity spend preview is ready at one point', talentStateContractAudit?.spendPreviewOnePoint?.nodeKey === 'hunter_board_clarity' && talentStateContractAudit?.spendPreviewOnePoint?.eligible === true && talentStateContractAudit?.spendPreviewOnePoint?.blockedReason === 'ready' && talentStateContractAudit?.spendPreviewOnePoint?.cost === 1 && talentStateContractAudit?.spendPreviewOnePoint?.availablePoints === 1 && talentStateContractAudit?.spendPreviewOnePoint?.lifetimePoints === 1 && talentStateContractAudit?.spendPreviewOnePoint?.spentPoints === 0 && talentStateContractAudit?.spendPreviewOnePoint?.alreadyLearned === false && talentStateContractAudit?.spendPreviewOnePoint?.wouldSpendPoints === true && talentStateContractAudit?.spendPreviewOnePoint?.wouldLearnNode === true && talentStateContractAudit?.spendPreviewOnePoint?.wouldEnablePassive === true && talentStateContractAudit?.spendPreviewOnePoint?.mutatesSave === false && talentStateContractAudit?.spendPreviewOnePoint?.spendsPoints === false && talentStateContractAudit?.spendPreviewOnePoint?.learnsNode === false && talentStateContractAudit?.spendPreviewOnePoint?.grantsCurrency === false && talentStateContractAudit?.spendPreviewOnePoint?.affectsCombat === false && talentStateContractAudit?.spendPreviewOnePoint?.affectsRewards === false && talentStateContractAudit?.spendPreviewOnePoint?.affectsEconomy === false && talentStateContractAudit?.spendPreviewOnePoint?.affectsDebt === false && talentStateContractAudit?.spendPreviewOnePoint?.affectsRevisit === false && talentStateContractAudit?.spendPreviewOnePointAfter === talentStateContractAudit?.spendPreviewOnePointBefore, JSON.stringify(talentStateContractAudit?.spendPreviewOnePoint));
    record('Hunter Board clarity spend preview detects already learned state', talentStateContractAudit?.spendPreviewLearned?.eligible === false && talentStateContractAudit?.spendPreviewLearned?.blockedReason === 'already_learned' && talentStateContractAudit?.spendPreviewLearned?.wouldSpendPoints === false && talentStateContractAudit?.spendPreviewLearned?.wouldLearnNode === false && talentStateContractAudit?.spendPreviewLearned?.mutatesSave === false && talentStateContractAudit?.spendPreviewLearnedBefore === talentStateContractAudit?.spendPreviewLearnedAfter, JSON.stringify(talentStateContractAudit?.spendPreviewLearned));
    const v12049ReloadFixture = {
      player: {
        talentLedger: {
          version: 1,
          previewOnly: true,
          unlocked: false,
          lifetimePoints: 1,
          availablePoints: 1,
          spentPoints: 0,
          earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
          awardClaims: {
            'boss_trophy_milestone:ashen_wyrm': {
              key: 'boss_trophy_milestone:ashen_wyrm',
              source: 'boss_trophy_milestone',
              sourceId: 'ashen_wyrm',
              amount: 1,
              claimedAt: '2026-06-21T12:00:00.000Z',
              version: 1
            }
          },
          notes: []
        },
        talentLearnedIds: {},
        talentUnlockIds: [],
        talents: { unlocked: {}, spent: {}, unlockedIds: [] }
      }
    };
    await writeSave(client, v12049ReloadFixture);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const v12049Api = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      const state = S;
      const preview = api?.hunterBoardClaritySpendPreview ? api.hunterBoardClaritySpendPreview(state) : null;
      const readiness = api?.hunterBoardClaritySpendUiReadinessModel ? api.hunterBoardClaritySpendUiReadinessModel(state) : null;
      const passive = api?.hunterBoardClarityPassiveContract ? api.hunterBoardClarityPassiveContract(state) : null;
      const buttonLabels = Array.from(document.querySelectorAll('button')).map(btn => String(btn.textContent || '').trim()).filter(Boolean);
      const hasForbiddenButton = buttonLabels.some(label => /^(Spend|Unlock|Purchase|Respec|Refund|Learn|Activate)$/i.test(label));
      return {
        hasApi: !!api,
        hasApply: typeof api?.applyHunterBoardClaritySpend === 'function',
        hasMutation: typeof api?.applyTalentSpendMutation === 'function',
        hasResultSummary: typeof api?.hunterBoardClaritySpendResultSummary === 'function',
        hasUiReadiness: typeof api?.talentSpendUiReadinessModel === 'function',
        hasHunterBoardUiReadiness: typeof api?.hunterBoardClaritySpendUiReadinessModel === 'function',
        preview,
        readiness,
        passive,
        buttonLabels,
        hasForbiddenButton,
        screen: state?.screen || '',
        build: window.DUNGEONDEX_BUILD || '',
        visibleLabel: window.DUNGEONDEX_VISIBLE_LABEL || '',
        deck: {
          dungeonEntry: !!document.getElementById('startRunBtn') || !!document.getElementById('runFromIdleBtn'),
          revisitEntry: !!document.querySelector('[data-screen="revisit"], #revisitBtn, #revisitPanel button, button[aria-label*="Revisit"]'),
          debtPanelText: document.getElementById('debtPanel')?.innerText || '',
          questPanelText: document.getElementById('questPanel')?.innerText || ''
        }
      };
    })()`);
    record('v1.20.51 runtime exposes spend UI readiness helpers after reload', v12049Api?.hasApi === true && v12049Api?.hasApply === true && v12049Api?.hasMutation === true && v12049Api?.hasResultSummary === true && v12049Api?.hasUiReadiness === true && v12049Api?.hasHunterBoardUiReadiness === true, JSON.stringify(v12049Api));
    record('v1.20.51 build label is visible after reload', v12049Api?.build === '1.20.51' && String(v12049Api?.visibleLabel || '').includes('v1.20.51'), JSON.stringify({ build: v12049Api?.build, visibleLabel: v12049Api?.visibleLabel }));
    record('v1.20.51 preview stays ready and read-only after reload', v12049Api?.preview?.nodeKey === 'hunter_board_clarity' && v12049Api?.preview?.eligible === true && v12049Api?.preview?.blockedReason === 'ready' && v12049Api?.preview?.liveSpendPatchReady === true && v12049Api?.preview?.requiresLiveSpendPatch === false && v12049Api?.preview?.mutatesSave === false && v12049Api?.preview?.spendsPoints === false && v12049Api?.preview?.learnsNode === false, JSON.stringify(v12049Api?.preview));
    record('v1.20.51 readiness model reports ready and leaves UI unwired', v12049Api?.readiness?.nodeKey === 'hunter_board_clarity' && v12049Api?.readiness?.supported === true && v12049Api?.readiness?.visible === true && v12049Api?.readiness?.actionLabel === 'Spend 1 Talent Point' && v12049Api?.readiness?.disabledLabel === 'Spend unavailable' && v12049Api?.readiness?.enabled === true && v12049Api?.readiness?.blockedReason === 'ready' && v12049Api?.readiness?.cost === 1 && v12049Api?.readiness?.availablePoints === 1 && v12049Api?.readiness?.spentPoints === 0 && v12049Api?.readiness?.lifetimePoints === 1 && v12049Api?.readiness?.learned === false && v12049Api?.readiness?.previewReady === true && v12049Api?.readiness?.liveSpendPatchReady === true && v12049Api?.readiness?.wouldMutateOnClick === true && v12049Api?.readiness?.mutatesDuringPreview === false && v12049Api?.readiness?.uiActionWired === false && v12049Api?.readiness?.clickHandlerEnabled === false && v12049Api?.readiness?.renderButtonNow === false, JSON.stringify(v12049Api?.readiness));
    const readyFixtureBefore = JSON.stringify({
      player: {
        talentLedger: {
          version: 1,
          previewOnly: true,
          unlocked: false,
          lifetimePoints: 1,
          availablePoints: 1,
          spentPoints: 0,
          earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
          awardClaims: {
            'boss_trophy_milestone:ashen_wyrm': {
              key: 'boss_trophy_milestone:ashen_wyrm',
              source: 'boss_trophy_milestone',
              sourceId: 'ashen_wyrm',
              amount: 1,
              claimedAt: '2026-06-21T12:00:00.000Z',
              version: 1
            }
          },
          notes: []
        },
        talentLearnedIds: {},
        talentUnlockIds: [],
        talents: { unlocked: {}, spent: {}, unlockedIds: [] }
      }
    });
    record('v1.20.51 readiness model keeps ready fixture unchanged', JSON.stringify(v12049Api?.readiness?.supported ? {
      player: {
        talentLedger: {
          version: 1,
          previewOnly: true,
          unlocked: false,
          lifetimePoints: 1,
          availablePoints: 1,
          spentPoints: 0,
          earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
          awardClaims: {
            'boss_trophy_milestone:ashen_wyrm': {
              key: 'boss_trophy_milestone:ashen_wyrm',
              source: 'boss_trophy_milestone',
              sourceId: 'ashen_wyrm',
              amount: 1,
              claimedAt: '2026-06-21T12:00:00.000Z',
              version: 1
            }
          },
          notes: []
        },
        talentLearnedIds: {},
        talentUnlockIds: [],
        talents: { unlocked: {}, spent: {}, unlockedIds: [] }
      }
    } : null) === readyFixtureBefore, JSON.stringify(v12049Api?.readiness));
    record('v1.20.51 spend button is rendered once and only once for hunter_board_clarity', Array.isArray(v12049Api?.spendButtons) && v12049Api.spendButtons.length === 1 && v12049Api.spendButtons[0].text === 'Spend 1 Talent Point' && v12049Api.spendButtons[0].dataset.talentSpendHunterBoard === 'hunter_board_clarity' && v12049Api.spendButtons[0].disabled === false, JSON.stringify(v12049Api?.spendButtons));
    const v12049SpendResult = await evalByValue(client, `(() => {
      const btn = document.querySelector('[data-talent-spend-hunter-board="hunter_board_clarity"]');
      if (btn) btn.click();
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      const readiness = api?.hunterBoardClaritySpendUiReadinessModel ? api.hunterBoardClaritySpendUiReadinessModel(S) : null;
      const buttonLabels = Array.from(document.querySelectorAll('button')).map(el => String(el.textContent || '').trim()).filter(Boolean);
      return {
        clicked: !!btn,
        ledger: S.player?.talentLedger || null,
        learned: S.player?.talentLearnedIds?.hunter_board_clarity === true,
        unlockIds: Array.isArray(S.player?.talentUnlockIds) ? S.player.talentUnlockIds.slice() : [],
        talents: S.player?.talents || null,
        passive: api?.hunterBoardClarityPassiveContract ? api.hunterBoardClarityPassiveContract(S) : null,
        readiness,
        buttonLabels,
        enabledSpendButtons: Array.from(document.querySelectorAll('[data-talent-spend-hunter-board]')).filter(el => el.disabled !== true).length,
        spendButtons: Array.from(document.querySelectorAll('[data-talent-spend-hunter-board]')).map(el => ({
          text: String(el.textContent || '').trim(),
          disabled: el.disabled === true,
          dataset: { talentSpendHunterBoard: el.dataset.talentSpendHunterBoard || '' }
        }))
      };
    })()`);
    record('v1.20.51 spend button click succeeds in browser runtime', v12049SpendResult?.clicked === true && v12049SpendResult?.ledger?.lifetimePoints === 1 && v12049SpendResult?.ledger?.availablePoints === 0 && v12049SpendResult?.ledger?.spentPoints === 1 && v12049SpendResult?.learned === true && Array.isArray(v12049SpendResult?.unlockIds) && v12049SpendResult.unlockIds.includes('hunter_board_clarity') && v12049SpendResult?.talents?.unlocked?.hunter_board_clarity === true && v12049SpendResult?.passive?.learned === true && v12049SpendResult?.passive?.passiveReady === true && v12049SpendResult?.passive?.passiveEnabled === true && v12049SpendResult?.passive?.appliesEffect === false && v12049SpendResult?.readiness?.enabled === false && v12049SpendResult?.readiness?.blockedReason === 'already_learned' && v12049SpendResult?.enabledSpendButtons === 0 && v12049SpendResult?.spendButtons.every(btn => btn.disabled === true) && !v12049SpendResult?.buttonLabels.some(label => /^(Unlock|Purchase|Respec|Refund|Learn|Activate)$/i.test(label)), JSON.stringify(v12049SpendResult));
    const v12049AfterSpend = await evalByValue(client, `(() => ({
      save: S.player?.talentLedger || null,
      learned: S.player?.talentLearnedIds?.hunter_board_clarity === true,
      unlockIds: Array.isArray(S.player?.talentUnlockIds) ? S.player.talentUnlockIds.slice() : [],
      talents: S.player?.talents || null,
      passive: window.DungeonDexTalents?.hunterBoardClarityPassiveContract ? window.DungeonDexTalents.hunterBoardClarityPassiveContract(S) : null,
      buttonLabels: Array.from(document.querySelectorAll('button')).map(btn => String(btn.textContent || '').trim()).filter(Boolean),
      debtPanelText: document.getElementById('debtPanel')?.innerText || '',
      questPanelText: document.getElementById('questPanel')?.innerText || ''
    }))()`);
    record('v1.20.51 post-spend state updates ledger and learned flags', v12049AfterSpend?.save?.lifetimePoints === 1 && v12049AfterSpend?.save?.availablePoints === 0 && v12049AfterSpend?.save?.spentPoints === 1 && v12049AfterSpend?.learned === true && Array.isArray(v12049AfterSpend?.unlockIds) && v12049AfterSpend.unlockIds.includes('hunter_board_clarity') && v12049AfterSpend?.talents?.unlocked?.hunter_board_clarity === true && v12049AfterSpend?.passive?.learned === true && v12049AfterSpend?.passive?.passiveReady === true && v12049AfterSpend?.passive?.passiveEnabled === true && v12049AfterSpend?.passive?.appliesEffect === false && !v12049AfterSpend?.buttonLabels.some(label => /^(Unlock|Purchase|Respec|Refund|Learn|Activate)$/i.test(label)) && v12049AfterSpend?.debtPanelText === v12049Api?.deck?.debtPanelText && v12049AfterSpend?.questPanelText === v12049Api?.deck?.questPanelText, JSON.stringify(v12049AfterSpend));
    const v12049Duplicate = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.applyHunterBoardClaritySpend === 'function' ? api.applyHunterBoardClaritySpend(S) : null;
    })()`);
    record('v1.20.51 duplicate spend blocks as already learned', v12049Duplicate?.ok === false && v12049Duplicate?.blockedReason === 'already_learned' && v12049AfterSpend?.save?.availablePoints === 0 && v12049AfterSpend?.save?.spentPoints === 1 && v12049AfterSpend?.learned === true, JSON.stringify(v12049Duplicate));
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const v12049Reloaded = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      const state = S;
      const preview = api?.hunterBoardClaritySpendPreview ? api.hunterBoardClaritySpendPreview(state) : null;
      const passive = api?.hunterBoardClarityPassiveContract ? api.hunterBoardClarityPassiveContract(state) : null;
      const buttonLabels = Array.from(document.querySelectorAll('button')).map(btn => String(btn.textContent || '').trim()).filter(Boolean);
      const hasForbiddenButton = buttonLabels.some(label => /^(Spend|Unlock|Purchase|Respec|Refund|Learn|Activate)$/i.test(label));
      return {
        save: state?.player?.talentLedger || null,
        learned: state?.player?.talentLearnedIds?.hunter_board_clarity === true,
        unlockIds: Array.isArray(state?.player?.talentUnlockIds) ? state.player.talentUnlockIds.slice() : [],
        talents: state?.player?.talents || null,
        preview,
        passive,
        buttonLabels,
        hasForbiddenButton,
        build: window.DUNGEONDEX_BUILD || '',
        visibleLabel: window.DUNGEONDEX_VISIBLE_LABEL || '',
        entryButtons: {
          dungeon: !!document.getElementById('startRunBtn') || !!document.getElementById('runFromIdleBtn'),
          revisit: !!document.querySelector('[data-screen="revisit"], #revisitBtn, #revisitPanel button, button[aria-label*="Revisit"]')
        },
        debtPanelText: document.getElementById('debtPanel')?.innerText || '',
        questPanelText: document.getElementById('questPanel')?.innerText || ''
      };
    })()`);
    record('v1.20.51 reload preserves spend state', v12049Reloaded?.build === '1.20.51' && String(v12049Reloaded?.visibleLabel || '').includes('v1.20.51') && v12049Reloaded?.learned === true && Array.isArray(v12049Reloaded?.unlockIds) && v12049Reloaded.unlockIds.includes('hunter_board_clarity') && v12049Reloaded?.save?.lifetimePoints === 1 && v12049Reloaded?.save?.availablePoints === 0 && v12049Reloaded?.save?.spentPoints === 1 && Object.prototype.hasOwnProperty.call(v12049Reloaded?.save || {}, 'awardClaims'), JSON.stringify(v12049Reloaded));
    record('v1.20.51 reload readiness model stays blocked on already learned', v12049Reloaded?.preview?.nodeKey === 'hunter_board_clarity' && v12049Reloaded?.readiness?.enabled === false && v12049Reloaded?.readiness?.blockedReason === 'already_learned' && v12049Reloaded?.readiness?.renderButtonNow === false && v12049Reloaded?.readiness?.clickHandlerEnabled === false && v12049Reloaded?.readiness?.uiActionWired === false, JSON.stringify(v12049Reloaded?.readiness));
    record('v1.20.51 reload keeps preview ready and forbids talent action buttons', v12049Reloaded?.preview?.nodeKey === 'hunter_board_clarity' && v12049Reloaded?.preview?.eligible === false && v12049Reloaded?.preview?.blockedReason === 'already_learned' && v12049Reloaded?.preview?.liveSpendPatchReady === true && v12049Reloaded?.preview?.requiresLiveSpendPatch === false && v12049Reloaded?.preview?.mutatesSave === false && v12049Reloaded?.preview?.spendsPoints === false && v12049Reloaded?.preview?.learnsNode === false && !v12049Reloaded?.hasForbiddenButton, JSON.stringify(v12049Reloaded?.preview));
    const v12049ReloadedDuplicate = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.applyHunterBoardClaritySpend === 'function' ? api.applyHunterBoardClaritySpend(S) : null;
    })()`);
    const v12049ReloadedAfterDuplicate = await evalByValue(client, `(() => ({
      save: S.player?.talentLedger || null,
      learned: S.player?.talentLearnedIds?.hunter_board_clarity === true,
      unlockIds: Array.isArray(S.player?.talentUnlockIds) ? S.player.talentUnlockIds.slice() : [],
      talents: S.player?.talents || null,
      passive: window.DungeonDexTalents?.hunterBoardClarityPassiveContract ? window.DungeonDexTalents.hunterBoardClarityPassiveContract(S) : null
    }))()`);
    record('v1.20.51 reload duplicate blocks without mutation', v12049ReloadedDuplicate?.ok === false && v12049ReloadedDuplicate?.blockedReason === 'already_learned' && v12049ReloadedAfterDuplicate?.save?.availablePoints === 0 && v12049ReloadedAfterDuplicate?.save?.spentPoints === 1 && v12049ReloadedAfterDuplicate?.learned === true && Array.isArray(v12049ReloadedAfterDuplicate?.unlockIds) && v12049ReloadedAfterDuplicate.unlockIds.includes('hunter_board_clarity') && v12049ReloadedAfterDuplicate?.passive?.appliesEffect === false, JSON.stringify(v12049ReloadedDuplicate));
    record('Hunter Board clarity spend preview rejects unknown nodes', talentStateContractAudit?.spendPreviewUnknown?.eligible === false && talentStateContractAudit?.spendPreviewUnknown?.blockedReason === 'unknown_node' && talentStateContractAudit?.spendPreviewUnknown?.wouldSpendPoints === false && talentStateContractAudit?.spendPreviewUnknown?.wouldLearnNode === false && talentStateContractAudit?.spendPreviewUnknown?.mutatesSave === false, JSON.stringify(talentStateContractAudit?.spendPreviewUnknown));
    record('Hunter Board clarity spend preview is stable on malformed input', Array.isArray(talentStateContractAudit?.spendPreviewMalformedStates) && talentStateContractAudit.spendPreviewMalformedStates.length === 7 && talentStateContractAudit.spendPreviewMalformedStates.every(preview => preview && typeof preview === 'object' && preview.mutatesSave === false && preview.spendsPoints === false && preview.learnsNode === false), JSON.stringify(talentStateContractAudit?.spendPreviewMalformedStates));
    record('Hunter Board clarity spend preview preserves ledger math compatibility', talentStateContractAudit?.spendPreviewMalformedLedger?.availablePoints === 1 && talentStateContractAudit?.spendPreviewMalformedLedger?.eligible === false && talentStateContractAudit?.spendPreviewMalformedLedger?.blockedReason === 'insufficient_points' && talentStateContractAudit?.spendPreviewMalformedLedgerBefore === talentStateContractAudit?.spendPreviewMalformedLedgerAfter, JSON.stringify(talentStateContractAudit?.spendPreviewMalformedLedger));
    record('Talent award mutation preview helper exists', typeof talentStateContractAudit?.mutationPreview === 'object' && typeof talentStateContractAudit?.mutationPreviewSummary === 'object' && talentStateContractAudit?.hasMutationPreview === true && talentStateContractAudit?.hasMutationPreviewSummary === true && typeof talentStateContractAudit?.mutationPreview?.source === 'string', JSON.stringify({ mutationPreview: talentStateContractAudit?.mutationPreview, mutationPreviewSummary: talentStateContractAudit?.mutationPreviewSummary }));
    record('Talent award mutation gate helper exists', talentStateContractAudit?.hasMutationGate === true && talentStateContractAudit?.hasApplyMutation === true && typeof talentStateContractAudit?.mutationGate === 'object' && talentStateContractAudit?.mutationGate?.enabled === false, JSON.stringify(talentStateContractAudit?.mutationGateSummary || talentStateContractAudit?.mutationGate));
    record('Talent award mutation default gate is blocked and read-only', talentStateContractAudit?.mutationDefaultGateResult?.ok === false && talentStateContractAudit?.mutationDefaultGateResult?.status === 'blocked' && talentStateContractAudit?.mutationDefaultGateResult?.blockedReason === 'award_gate_disabled' && talentStateContractAudit?.mutationDefaultGateResult?.enabled === false && talentStateContractAudit?.mutationDefaultGateResult?.awardedPoints === 0 && talentStateContractAudit?.mutationDefaultGateResult?.createdClaimRecord === false && talentStateContractAudit?.mutationDefaultGateResult?.mutatesSave === false && talentStateContractAudit?.mutationDefaultGateResult?.awardsPoints === false && talentStateContractAudit?.mutationDefaultGateBefore === talentStateContractAudit?.mutationDefaultGateAfter, JSON.stringify(talentStateContractAudit?.mutationDefaultGateResult));
    record('Talent award live wrapper is exposed and awards exactly one point once', talentStateContractAudit?.hasLiveAwardHelper === true && talentStateContractAudit?.liveAwardResult?.ok === true && talentStateContractAudit?.liveAwardResult?.status === 'awarded' && talentStateContractAudit?.liveAwardResult?.claimKey === 'boss_trophy_milestone:ashen_wyrm' && talentStateContractAudit?.liveAwardResult?.sourceId === 'ashen_wyrm' && talentStateContractAudit?.liveAwardResult?.awardedPoints === 1 && talentStateContractAudit?.liveAwardResult?.createdClaimRecord === true && talentStateContractAudit?.liveAwardResult?.mutatesSave === true && talentStateContractAudit?.liveAwardResult?.awardsPoints === true && talentStateContractAudit?.liveAwardState?.player?.talentLedger?.lifetimePoints === 1 && talentStateContractAudit?.liveAwardState?.player?.talentLedger?.availablePoints === 1 && talentStateContractAudit?.liveAwardState?.player?.talentLedger?.spentPoints === 0 && Object.keys(talentStateContractAudit?.liveAwardState?.player?.talentLedger?.awardClaims || {}).length === 1 && !!talentStateContractAudit?.liveAwardState?.player?.talentLedger?.awardClaims?.['boss_trophy_milestone:ashen_wyrm'] && talentStateContractAudit?.liveAwardBefore !== talentStateContractAudit?.liveAwardAfter, JSON.stringify(talentStateContractAudit?.liveAwardResult));
    record('Talent award live wrapper blocks duplicates on repeat call', talentStateContractAudit?.liveAwardRepeatResult?.ok === false && talentStateContractAudit?.liveAwardRepeatResult?.blockedReason === 'already_claimed' && talentStateContractAudit?.liveAwardRepeatResult?.awardedPoints === 0 && talentStateContractAudit?.liveAwardRepeatResult?.createdClaimRecord === false && talentStateContractAudit?.liveAwardRepeatResult?.mutatesSave === false && talentStateContractAudit?.liveAwardRepeatResult?.awardsPoints === false && talentStateContractAudit?.liveAwardRepeatBefore === talentStateContractAudit?.liveAwardRepeatAfter && talentStateContractAudit?.liveAwardState?.player?.talentLedger?.lifetimePoints === 1 && talentStateContractAudit?.liveAwardState?.player?.talentLedger?.availablePoints === 1, JSON.stringify(talentStateContractAudit?.liveAwardRepeatResult));
    record('Talent award mutation explicit override awards one point and one claim', talentStateContractAudit?.mutationOverrideResult?.ok === true && talentStateContractAudit?.mutationOverrideResult?.status === 'awarded' && talentStateContractAudit?.mutationOverrideResult?.blockedReason === '' && talentStateContractAudit?.mutationOverrideResult?.enabled === true && talentStateContractAudit?.mutationOverrideResult?.claimKey === 'boss_trophy_milestone:ashen_wyrm' && talentStateContractAudit?.mutationOverrideResult?.sourceId === 'ashen_wyrm' && talentStateContractAudit?.mutationOverrideResult?.awardedPoints === 1 && talentStateContractAudit?.mutationOverrideResult?.createdClaimRecord === true && talentStateContractAudit?.mutationOverrideResult?.mutatesSave === true && talentStateContractAudit?.mutationOverrideResult?.awardsPoints === true && talentStateContractAudit?.mutationOverrideResult?.grantsCurrency === false && talentStateContractAudit?.mutationOverrideResult?.enablesSpending === false && talentStateContractAudit?.mutationOverrideResult?.spendPathEnabled === false && talentStateContractAudit?.mutationOverrideResult?.unlockUiEnabled === false && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.lifetimePoints === 1 && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.availablePoints === 1 && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.spentPoints === 0 && Object.keys(talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.awardClaims || {}).length === 1 && !!talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.awardClaims?.['boss_trophy_milestone:ashen_wyrm'] && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.awardClaims?.['boss_trophy_milestone:ashen_wyrm']?.version === 1 && talentStateContractAudit?.mutationOverrideBefore !== talentStateContractAudit?.mutationOverrideAfter, JSON.stringify(talentStateContractAudit?.mutationOverrideResult));
    record('Talent award mutation explicit override blocks duplicate claims', talentStateContractAudit?.mutationOverrideRepeatResult?.ok === false && talentStateContractAudit?.mutationOverrideRepeatResult?.blockedReason === 'already_claimed' && talentStateContractAudit?.mutationOverrideRepeatResult?.awardedPoints === 0 && talentStateContractAudit?.mutationOverrideRepeatResult?.createdClaimRecord === false && talentStateContractAudit?.mutationOverrideRepeatResult?.mutatesSave === false && talentStateContractAudit?.mutationOverrideRepeatResult?.awardsPoints === false && talentStateContractAudit?.mutationOverrideRepeatBefore === talentStateContractAudit?.mutationOverrideRepeatAfter && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.lifetimePoints === 1 && talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.availablePoints === 1 && Object.keys(talentStateContractAudit?.mutationOverrideState?.player?.talentLedger?.awardClaims || {}).length === 1, JSON.stringify(talentStateContractAudit?.mutationOverrideRepeatResult));
    record('Talent award mutation explicit override blocks pre-existing claim', talentStateContractAudit?.mutationExistingClaimResult?.ok === false && talentStateContractAudit?.mutationExistingClaimResult?.blockedReason === 'already_claimed' && talentStateContractAudit?.mutationExistingClaimResult?.awardedPoints === 0 && talentStateContractAudit?.mutationExistingClaimResult?.createdClaimRecord === false && talentStateContractAudit?.mutationExistingClaimResult?.mutatesSave === false && talentStateContractAudit?.mutationExistingClaimResult?.awardsPoints === false && talentStateContractAudit?.mutationExistingClaimBefore === talentStateContractAudit?.mutationExistingClaimAfter, JSON.stringify(talentStateContractAudit?.mutationExistingClaimResult));
    record('Talent award mutation preview derives deterministic claim data from boss trophies', talentStateContractAudit?.mutationEvidencePreview?.source === 'boss_trophy_milestone' && talentStateContractAudit?.mutationEvidencePreview?.sourceId === 'ashen_wyrm' && talentStateContractAudit?.mutationEvidencePreview?.claimKey === 'boss_trophy_milestone:ashen_wyrm' && talentStateContractAudit?.mutationEvidencePreview?.eligible === true && talentStateContractAudit?.mutationEvidencePreview?.blockedReason === 'ready' && talentStateContractAudit?.mutationEvidencePreview?.amountPreview === 1 && talentStateContractAudit?.mutationEvidencePreview?.wouldAwardPoints === true && talentStateContractAudit?.mutationEvidencePreview?.wouldCreateClaimRecord === true && talentStateContractAudit?.mutationEvidencePreview?.claimTrackingReady === true && talentStateContractAudit?.mutationEvidencePreview?.awardClaimsShapeReady === true && talentStateContractAudit?.mutationEvidencePreview?.proposedClaimRecord?.claimedAt === 'future_live_award_timestamp' && talentStateContractAudit?.mutationEvidenceBefore === talentStateContractAudit?.mutationEvidenceAfter, JSON.stringify(talentStateContractAudit?.mutationEvidencePreview));
    record('Talent award mutation preview derives deterministic claim data from trophy records', talentStateContractAudit?.mutationRecordApplyResult?.ok === true && talentStateContractAudit?.mutationRecordApplyResult?.claimKey === 'boss_trophy_milestone:ember_drake' && talentStateContractAudit?.mutationRecordApplyResult?.sourceId === 'ember_drake' && talentStateContractAudit?.mutationRecordApplyResult?.awardedPoints === 1 && talentStateContractAudit?.mutationRecordApplyResult?.createdClaimRecord === true && talentStateContractAudit?.mutationRecordApplyBefore !== talentStateContractAudit?.mutationRecordApplyAfter, JSON.stringify(talentStateContractAudit?.mutationRecordApplyResult));
    record('Talent award mutation preview blocks malformed awardClaims safely', talentStateContractAudit?.malformedAwardClaimsDefault?.ok === false && talentStateContractAudit?.malformedAwardClaimsDefault?.blockedReason === 'award_gate_disabled' && talentStateContractAudit?.malformedAwardClaimsOverride?.ok === false && talentStateContractAudit?.malformedAwardClaimsOverride?.awardedPoints === 0 && talentStateContractAudit?.malformedAwardClaimsBefore === talentStateContractAudit?.malformedAwardClaimsAfter, JSON.stringify({ malformedAwardClaimsDefault: talentStateContractAudit?.malformedAwardClaimsDefault, malformedAwardClaimsOverride: talentStateContractAudit?.malformedAwardClaimsOverride }));
    record('Talent award mutation preview is stable on malformed input', Array.isArray(talentStateContractAudit?.malformedMutationPreviews) && talentStateContractAudit.malformedMutationPreviews.length === 6 && talentStateContractAudit.malformedMutationPreviews.every(preview => preview && typeof preview === 'object' && preview.mutatesSave === false && preview.awardsPoints === false), JSON.stringify(talentStateContractAudit?.malformedMutationPreviews));
    record('Talent award claim tracking plan is repaired and aligned', talentStateContractAudit?.hasClaimTrackingPlan === true && talentStateContractAudit?.hasClaimTrackingPlanSummary === true && talentStateContractAudit?.claimTrackingPlan?.source === 'boss_trophy_milestone' && talentStateContractAudit?.claimTrackingPlan?.status === 'repaired' && talentStateContractAudit?.claimTrackingPlan?.repair_active === true && talentStateContractAudit?.claimTrackingPlan?.claimTrackingReady === true && talentStateContractAudit?.claimTrackingPlan?.currentSaveShapeAddsClaimTracking === true && talentStateContractAudit?.claimTrackingPlan?.currentPatchMutatesSave === true && talentStateContractAudit?.claimTrackingPlan?.plannedClaimPath === 'player.talentLedger.awardClaims' && talentStateContractAudit?.claimTrackingPlan?.plannedClaimKeyPattern === 'boss_trophy_milestone:{bossTrophyId}' && talentStateContractAudit?.claimTrackingPlan?.firstPreviewClaimKey === talentStateContractAudit?.awardPreview?.claimKey && talentStateContractAudit?.claimTrackingPlan?.duplicatePreventionRequired === true && talentStateContractAudit?.claimTrackingPlan?.requiresSaveRepairPatch === true && talentStateContractAudit?.claimTrackingPlan?.requiresLiveAwardPatch === true && talentStateContractAudit?.claimTrackingPlan?.requiresSpendPathPatch === true && talentStateContractAudit?.claimTrackingPlan?.proposedClaimRecordShape?.key === 'boss_trophy_milestone:{bossTrophyId}' && talentStateContractAudit?.claimTrackingPlan?.proposedClaimRecordShape?.source === 'boss_trophy_milestone' && talentStateContractAudit?.claimTrackingPlan?.proposedClaimRecordShape?.sourceId === '{bossTrophyId}' && talentStateContractAudit?.claimTrackingPlan?.proposedClaimRecordShape?.amount === 1 && talentStateContractAudit?.claimTrackingPlan?.proposedClaimRecordShape?.version === 1 && Array.isArray(talentStateContractAudit?.claimTrackingPlan?.rules) && talentStateContractAudit.claimTrackingPlan.rules.length === 5 && talentStateContractAudit?.hadAwardClaimsBefore === false && talentStateContractAudit?.hadAwardClaimsAfter === false && talentStateContractAudit?.beforeLedger === talentStateContractAudit?.afterLedger && talentStateContractAudit?.beforeState === talentStateContractAudit?.afterState, JSON.stringify(talentStateContractAudit?.claimTrackingPlan));
    record('Talent award claim save shape preview is repaired and aligned', talentStateContractAudit?.hasClaimShapePreview === true && talentStateContractAudit?.hasClaimShapePreviewSummary === true && talentStateContractAudit?.claimShapePreview?.path === 'player.talentLedger.awardClaims' && talentStateContractAudit?.claimShapePreview?.status === 'dry_run' && talentStateContractAudit?.claimShapePreview?.repair_active === true && talentStateContractAudit?.claimShapePreview?.claimTrackingReady === true && talentStateContractAudit?.claimShapePreview?.saveFieldExists === true && talentStateContractAudit?.claimShapePreview?.wouldAddSaveField === false && talentStateContractAudit?.claimShapePreview?.mutatesSave === false && talentStateContractAudit?.claimShapePreview?.awardsPoints === false && talentStateContractAudit?.claimShapePreview?.grantsCurrency === false && talentStateContractAudit?.claimShapePreview?.enablesSpending === false && talentStateContractAudit?.claimShapePreview?.requiresRepairPatch === false && talentStateContractAudit?.claimShapePreview?.requiresLiveAwardPatch === true && talentStateContractAudit?.claimShapePreview?.requiresClaimTrackingPatch === false && talentStateContractAudit?.claimShapePreview?.expectedShape === 'object_map' && talentStateContractAudit?.claimShapePreview?.expectedEmptyValue && !Array.isArray(talentStateContractAudit.claimShapePreview.expectedEmptyValue) && Object.keys(talentStateContractAudit.claimShapePreview.expectedEmptyValue).length === 0 && talentStateContractAudit?.claimShapePreview?.allowedRecordVersion === 1 && talentStateContractAudit?.claimShapePreview?.claimKeyPattern === talentStateContractAudit?.claimTrackingPlan?.plannedClaimKeyPattern && talentStateContractAudit?.claimShapePreview?.proposedRecordShape?.source === 'boss_trophy_milestone' && talentStateContractAudit?.claimShapePreview?.proposedRecordShape?.amount === 1 && Array.isArray(talentStateContractAudit?.claimShapePreview?.repairRules) && talentStateContractAudit.claimShapePreview.repairRules.length === 5 && talentStateContractAudit?.beforeLedger === talentStateContractAudit?.afterLedger && talentStateContractAudit?.beforeState === talentStateContractAudit?.afterState, JSON.stringify(talentStateContractAudit?.claimShapePreview));
    record('Talent award claim save shape preview repairs malformed records', talentStateContractAudit?.malformedClaimPreview?.saveFieldExists === true && talentStateContractAudit?.malformedClaimPreview?.wouldAddSaveField === false && talentStateContractAudit?.malformedClaimPreview?.observedState?.hasTalentLedger === true && talentStateContractAudit?.malformedClaimPreview?.observedState?.hasAwardClaims === true && talentStateContractAudit?.malformedClaimPreview?.observedState?.awardClaimsType === 'object' && talentStateContractAudit?.malformedClaimPreview?.observedState?.validClaimCount === 1 && talentStateContractAudit?.malformedClaimPreview?.observedState?.malformedClaimCount >= 2 && talentStateContractAudit?.malformedClaimBefore === talentStateContractAudit?.malformedClaimAfter, JSON.stringify(talentStateContractAudit?.malformedClaimPreview));
    record('Talent award claim save shape preview has stable malformed-state fallback', Array.isArray(talentStateContractAudit?.safeClaimShapePreviews) && talentStateContractAudit.safeClaimShapePreviews.length === 6 && talentStateContractAudit.safeClaimShapePreviews.every(preview => preview?.path === 'player.talentLedger.awardClaims' && preview?.status === 'dry_run' && preview?.mutatesSave === false && preview?.awardsPoints === false && preview?.expectedShape === 'object_map' && preview?.allowedRecordVersion === 1 && preview?.observedState && Number.isInteger(preview.observedState.validClaimCount) && Number.isInteger(preview.observedState.malformedClaimCount)), JSON.stringify(talentStateContractAudit?.safeClaimShapePreviews));
    record('Boss trophy evidence does not create a live claim', talentStateContractAudit?.bossEvidencePreview?.awardsPoints === false && talentStateContractAudit?.bossEvidencePreview?.mutatesSave === false && talentStateContractAudit?.bossEvidencePreview?.requiresClaimTrackingPatch === false && talentStateContractAudit?.bossEvidenceBefore === talentStateContractAudit?.bossEvidenceAfter, JSON.stringify(talentStateContractAudit?.bossEvidencePreview));
    record('Talent point award preview has stable malformed-state fallback', Array.isArray(talentStateContractAudit?.safeAwardPreviews) && talentStateContractAudit.safeAwardPreviews.length === 5 && talentStateContractAudit.safeAwardPreviews.every(preview => preview?.source === 'boss_trophy_milestone' && preview?.status === 'preview' && preview?.eligible === false && preview?.amountPreview === 1 && preview?.awardsPoints === false && preview?.mutatesSave === false && preview?.requiresLiveAwardPatch === true && preview?.requiresClaimTrackingPatch === false && Array.isArray(preview?.evidence)), JSON.stringify(talentStateContractAudit?.safeAwardPreviews));
    record('Canonical talent state contract helper exists', talentStateContractAudit?.hasHelper === true && talentStateContractAudit?.learnedDebt?.learned === true && talentStateContractAudit?.learnedDebt?.passiveReady === true && talentStateContractAudit?.learnedDebt?.passiveEnabled === true && talentStateContractAudit?.learnedDebt?.liveRendererWired === true && talentStateContractAudit?.learnedDebt?.appliesEffect === false && talentStateContractAudit?.learnedDebt?.mutatesSave === false && talentStateContractAudit?.lockedDebt?.learned === false && talentStateContractAudit?.lockedDebt?.passiveReady === false && talentStateContractAudit?.lockedDebt?.passiveEnabled === false && talentStateContractAudit?.lockedDebt?.liveRendererWired === false && talentStateContractAudit?.lockedDebt?.appliesEffect === false && talentStateContractAudit?.lockedDebt?.mutatesSave === false && talentStateContractAudit?.previewNode?.previewOnly === true && talentStateContractAudit?.previewNode?.selectable === false && talentStateContractAudit?.previewNode?.selected === false && talentStateContractAudit?.previewNode?.learned === false && talentStateContractAudit?.previewNode?.passiveReady === false && talentStateContractAudit?.previewNode?.passiveEnabled === false && talentStateContractAudit?.previewNode?.appliesEffect === false && talentStateContractAudit?.previewNode?.liveRendererWired === false && talentStateContractAudit?.previewNode?.mutatesSave === false, JSON.stringify(talentStateContractAudit));
    const retiredHallSmoke = await getRetiredGearHallSmoke();
    record('Retired gear hall memory smoke', !!retiredHallSmoke?.ok, JSON.stringify(retiredHallSmoke));
    record('Town loads', /Lowfire|Enter Dungeon|Rest/.test(initialDiag.bodyText || ''), initialDiag.bodyText.slice(0, 200));
    const districtIdentityAudit = await evalByValue(client, `(() => {
      const api = {
        currentDistrictDisplay: typeof currentDistrictDisplay === 'function' ? currentDistrictDisplay : null,
        dungeonDistrictIdentityForDepth: typeof dungeonDistrictIdentityForDepth === 'function' ? dungeonDistrictIdentityForDepth : null,
        dungeonDistrictSummary: typeof dungeonDistrictSummary === 'function' ? dungeonDistrictSummary : null,
        dungeonFloorFlavorLine: typeof dungeonFloorFlavorLine === 'function' ? dungeonFloorFlavorLine : null
      };
      const before = JSON.stringify({ player: S.player, run: S.run });
      const known = api.currentDistrictDisplay ? api.currentDistrictDisplay(S) : null;
      const depthKnown = api.dungeonDistrictIdentityForDepth ? api.dungeonDistrictIdentityForDepth(1) : null;
      const depthUnknown = api.dungeonDistrictIdentityForDepth ? api.dungeonDistrictIdentityForDepth('bad-depth') : null;
      const summaryUnknown = api.dungeonDistrictSummary ? api.dungeonDistrictSummary(null) : null;
      const flavorLine = api.dungeonFloorFlavorLine ? api.dungeonFloorFlavorLine(1) : '';
      const after = JSON.stringify({ player: S.player, run: S.run });
      return { before, after, known, depthKnown, depthUnknown, summaryUnknown, flavorLine, api };
    })()`);
    record('District identity helper exists', !!districtIdentityAudit?.api?.currentDistrictDisplay && !!districtIdentityAudit?.api?.dungeonDistrictIdentityForDepth && !!districtIdentityAudit?.api?.dungeonDistrictSummary && !!districtIdentityAudit?.api?.dungeonFloorFlavorLine, JSON.stringify(districtIdentityAudit?.api));
    record('District identity helper returns stable display data', !!districtIdentityAudit?.known && typeof districtIdentityAudit.known.name === 'string' && districtIdentityAudit.known.name.length > 0 && typeof districtIdentityAudit.known.subtitle === 'string' && districtIdentityAudit.known.subtitle.length > 0 && typeof districtIdentityAudit.known.shortFlavor === 'string' && districtIdentityAudit.known.shortFlavor.length > 0 && typeof districtIdentityAudit.known.bossApproachLine === 'string' && districtIdentityAudit.known.bossApproachLine.length > 0, JSON.stringify(districtIdentityAudit?.known));
    record('District identity helper falls back safely', !!districtIdentityAudit?.depthUnknown && districtIdentityAudit.depthUnknown.safeFallback === true && typeof districtIdentityAudit.depthUnknown.name === 'string' && typeof districtIdentityAudit.depthUnknown.shortFlavor === 'string' && !!districtIdentityAudit?.summaryUnknown && districtIdentityAudit.summaryUnknown.safeFallback === true, JSON.stringify({ depthUnknown: districtIdentityAudit?.depthUnknown, summaryUnknown: districtIdentityAudit?.summaryUnknown }));
    record('District identity helper does not mutate state', districtIdentityAudit?.before === districtIdentityAudit?.after, JSON.stringify({ before: districtIdentityAudit?.before, after: districtIdentityAudit?.after }));
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
    const revisitPreviewWords = ['Route Preview', 'Travel', 'Begin Revisit'];
    const revisitPreviewClean = revisitPreviewWords.every(word => !townRevisitText.includes(word) && !initialDiag.bodyText.includes(word) && !revisitTownSource.includes(word) && !revisitArchiveSource.includes(word));
    const revisitActivationAllowed = revisitTownSource.includes('Start Return Route');
    const revisitPreviewCleanV2 = revisitPreviewClean && revisitActivationAllowed;
    record('Revisit Town panel is removed', !/Planned Return Routes|Earlier Dungeon Revisit/i.test(townRevisitText), townRevisitText.slice(0, 300));
    record('Revisit backend helpers remain available', Array.isArray(revisitRoutes) && ['Trophy Echo', 'Famous Gear Memory', 'Rival Trace', 'Debt Pressure', 'Board Echo'].every(label => revisitRoutes.some(route => String(route?.title || '').includes(label) || String(route?.key || '').includes(label.replace(/\s+/g, '_').toLowerCase()))), JSON.stringify(Array.isArray(revisitRoutes) ? revisitRoutes.map(route => ({ key: route?.key, title: route?.title })).slice(0, 5) : revisitRoutes));
    record('Revisit candidate labels are protected', Array.isArray(revisitRoutes) && ['Trophy Echo', 'Famous Gear Memory', 'Rival Trace', 'Debt Pressure', 'Board Echo'].every(label => revisitRoutes.some(route => String(route?.title || '').includes(label) || String(route?.key || '').includes(label.replace(/\s+/g, '')))), JSON.stringify(Array.isArray(revisitRoutes) ? revisitRoutes.map(route => ({ key: route?.key, title: route?.title })).slice(0, 5) : revisitRoutes));
    const routeShapeOk = Array.isArray(revisitRoutes) && revisitRoutes.every(route => !route || (typeof route === 'object' && ['key','title','district','reason','hooks','status','locked','priority'].every(key => Object.prototype.hasOwnProperty.call(route, key))));
    record('Revisit helper shape is stable', Array.isArray(revisitHooks) && revisitHookShapeOk && revisitMarketSource.includes('revisitCandidateSummary(state = S) {') && revisitMarketSource.includes("key: String(entry.key || '')"), JSON.stringify({ hooksType: Array.isArray(revisitHooks) ? 'array' : typeof revisitHooks, summarySource: revisitMarketSource.includes('revisitCandidateSummary(state = S) {'), sample: Array.isArray(revisitHooks) ? revisitHooks.slice(0, 2) : revisitHooks }));
    record('Route preview helper shape is stable', Array.isArray(revisitRoutes) && routeShapeOk && revisitMarketSource.includes('function revisitRoutePreviews(state = S)') && revisitMarketSource.includes('function revisitRouteSummary(state = S)'), JSON.stringify({ routesType: Array.isArray(revisitRoutes) ? 'array' : typeof revisitRoutes, summary: revisitRouteSummary, sample: Array.isArray(revisitRoutes) ? revisitRoutes.slice(0, 3) : revisitRoutes }));
    record('Revisit helper avoids preview language', revisitPreviewCleanV2, townRevisitText.slice(0, 300));
    const freshPanelText = await getTalentText();
    record('Talent panel renders preview header', freshPanelText.includes('Talent Tree Preview') && freshPanelText.includes('Locked preview only. No talent points, purchases, unlocks, or bonuses are active.') && freshPanelText.includes('Planned passives only. Inactive.'), freshPanelText.slice(0, 300));
    record('Talent preview banner is visible', freshPanelText.includes('Locked preview') && freshPanelText.includes('Planning only. No earning, spending, or bonuses.'), freshPanelText.slice(0, 300));
    record('Talent ledger copy is visible', freshPanelText.includes('Talent Ledger') && freshPanelText.includes('Ledger preview only. Earning and spending stay off.') && freshPanelText.includes('0 available') && freshPanelText.includes('Spending inactive'), freshPanelText.slice(0, 400));
    record('Talent preview branches are readable', ['Survivor', 'Hunter', 'Delver', 'Collector'].every(name => freshPanelText.includes(name)), freshPanelText.slice(0, 300));
    record('Talent branch summaries read cleanly', freshPanelText.includes('Stay alive. Recover safely.') && freshPanelText.includes('Contracts, rivals, Elite Board.') && freshPanelText.includes('Depth, stairs, charter planning.') && freshPanelText.includes('Loot, gear, archive, trophies.'), freshPanelText.slice(0, 400));
    record('Talent preview states are locked and inactive', freshPanelText.includes('Preview only.') && freshPanelText.includes('Inactive.') && freshPanelText.includes('No gameplay effects.'), freshPanelText.slice(0, 400));
    record('Talent preview nodes remain inert', freshPanelText.includes('Locked') && freshPanelText.includes('Preview') && freshPanelText.includes('Planned') && freshPanelText.includes('Inactive'), freshPanelText.slice(0, 400));
    record('Zero-point state shows preview locks', freshPanelText.includes('Locked preview only') && !freshPanelText.includes('Need Point') && !freshPanelText.includes('Unlock Talent') && !freshPanelText.includes('Buy Talent'), freshPanelText.slice(0, 400));
    const freshBossDexText = await getBossTrophyText();
    record('Trophy Hall loads', freshBossDexText.toLowerCase().includes('trophy hall') && freshBossDexText.toLowerCase().includes('boss trophies'), freshBossDexText.slice(0, 320));
    {
      const freshBossLower = freshBossDexText.toLowerCase();
    record('Boss trophy empty state renders on fresh save', freshBossLower.includes('no boss trophies yet') && freshBossLower.includes('defeat a boss to add a record') && freshBossLower.includes('recorded collection') && freshBossLower.includes('missing trophy case') && (freshBossLower.includes('trophy hall') || freshBossLower.includes('records')), freshBossDexText.slice(0, 320));
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
    record('Max-point preview state displays safely', maxPanelText.includes('Talent Tree Preview') && maxPanelText.includes('Locked preview only. No talent points, purchases, unlocks, or bonuses are active.') && maxPanelText.includes('Branches: 4') && maxPanelText.includes('Nodes: 12'), maxPanelText.slice(0, 400));
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
    const unlockOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.survivorStart)}))()`);
    record('unlockTalentForTest(Sturdy Start) remains inert', unlockOk === false, String(unlockOk));
    const unlockedButtonState = await evalByValue(client, `(() => {
      const btn = document.querySelector('.talent-state-button.is-unlocked');
      return !!btn && btn.disabled && /^Unlocked$/.test((btn.textContent || '').trim());
    })()`);
    record('No unlock button state is rendered', !unlockedButtonState, 'Preview panel remains inert after attempted grant');
    const summaryAfterUnlock = await getSummary();
    record('Point mirrors stay zero after grant/unlock attempts', summaryAfterUnlock && summaryAfterUnlock.pointsEarned === 0 && summaryAfterUnlock.pointsSpent === 0 && summaryAfterUnlock.pointsAvailable === 0 && Array.isArray(summaryAfterUnlock.unlockedIds) && summaryAfterUnlock.unlockedIds.length === 0, JSON.stringify(summaryAfterUnlock));
    const hpAfterUnlock = await evalByValue(client, `(() => ({ hp: S.player.hp, maxHp: S.player.maxHp }))()`);
    record('Sturdy Start max HP bonus remains inactive', hpAfterUnlock.maxHp === hpBeforeTalentAttempt.maxHp, JSON.stringify({ before: hpBeforeTalentAttempt, after: hpAfterUnlock }));

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
    record('Repaired save preview display is safe', repairedPanelText.includes('Talent Tree Preview') && repairedPanelText.includes('Locked preview only. No talent points, purchases, unlocks, or bonuses are active.') && repairedPanelText.includes('Planned passives only. Inactive.'), repairedPanelText.slice(0, 400));
    record('Repaired save ledger display is safe', repairedPanelText.includes('Talent Ledger') && repairedPanelText.includes('Ledger preview only. Earning and spending stay off.'), repairedPanelText.slice(0, 400));

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
    record('Unknown talent id hidden from UI', !unknownPanelText.includes('__unknown_talent__') && unknownPanelText.includes('Talent Tree Preview') && unknownPanelText.includes('Survivor') && unknownPanelText.includes('Preview only'), unknownPanelText.slice(0, 300));
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
      malformedSave.player.talents = { pointsEarned:99, pointsSpent:88, unlocked:{ [TALENT_IDS.survivorStart]:true }, spent:{ [TALENT_IDS.survivorStart]:true }, unlockedIds:[TALENT_IDS.survivorStart] };
      malformedSave.player.talentUnlockIds = [TALENT_IDS.survivorStart];
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
      record(`Malformed talentLedger repairs safely: ${entry.name}`, !!repairedLedger?.ledger && repairedLedger.ledger.previewOnly === true && repairedLedger.ledger.unlocked === false && repairedLedger.ledger.lifetimePoints === 0 && repairedLedger.ledger.availablePoints === 0 && repairedLedger.ledger.spentPoints === 0 && Array.isArray(repairedLedger.ledger.earnedSources) && repairedLedger.ledger.earnedSources.length === 1 && repairedLedger.summary?.canEarn === true && repairedLedger.summary?.canSpend === false && repairedLedger.talentSummary?.pointsEarned === 0 && repairedLedger.talentSummary?.pointsSpent === 0 && repairedLedger.talentSummary?.pointsAvailable === 0 && Array.isArray(repairedLedger.talentSummary?.unlockedIds) && repairedLedger.talentSummary.unlockedIds.length === 0, JSON.stringify(repairedLedger));
    }

    // Boss trophy foundation: fresh save, forced award, reload, malformed repair.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const bossEmptyText = await getBossTrophyText();
    {
      const bossEmptyLower = bossEmptyText.toLowerCase();
      record('Boss trophy empty state stays readable', bossEmptyLower.includes('defeat bosses to start the collection.') && bossEmptyLower.includes('recorded collection') && bossEmptyLower.includes('missing trophy case') && bossEmptyLower.includes('last recorded: none yet.') && (bossEmptyLower.includes('trophy hall') || bossEmptyLower.includes('collection records')), bossEmptyText.slice(0, 320));
      record('Retired Gear Hall archive shell appears', bossEmptyLower.includes('archive shelf') && bossEmptyLower.includes('retired gear records') && bossEmptyLower.includes('famous gear memory stays display-only') && bossEmptyLower.includes('earlier dungeon revisit stays removed'), bossEmptyText.slice(0, 500));
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
    record('Retired item archive UI shows record card', retiredRelicDexAfterGrant.includes('DevTools Retired Item Test') && retiredRelicDexAfterGrant.includes('Rating') && retiredRelicDexAfterGrant.includes('iLvl ') && retiredRelicDexAfterGrant.includes('Famous Gear Record'), retiredRelicDexAfterGrant.slice(0, 700));
    const forceBossTrophy = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantBossTrophyForTest ? window.DungeonDexScenarioDevTools.grantBossTrophyForTest() : false)()`);
    record('Boss trophy record can be created', !!forceBossTrophy, String(forceBossTrophy));
    const bossTrophyStateAfterGrant = await getBossTrophyState();
    record('Boss trophy record fields are populated', Array.isArray(bossTrophyStateAfterGrant.records) && bossTrophyStateAfterGrant.records.length > 0 && bossTrophyStateAfterGrant.records[0].trophyName && bossTrophyStateAfterGrant.records[0].bossName && bossTrophyStateAfterGrant.records[0].count >= 1, JSON.stringify(bossTrophyStateAfterGrant.records[0] || null));
    const bossDexAfterGrant = await getBossTrophyText();
    record('Boss trophy UI shows compact record row', bossDexAfterGrant.includes('Best depth:') && bossDexAfterGrant.includes('Boss Trophy Summary') && /x1|x2|x3|1 \/ 10 rec\./.test(bossDexAfterGrant), bossDexAfterGrant.slice(0, 380));
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
    record('Retired item appears in Trophy Hall archive', archiveLower.includes(String(retireAccept.item.name || '').toLowerCase()) && archiveLower.includes(String(retireAccept.item.rarity || '').toLowerCase()) && archiveLower.includes(String(retireAccept.item.slot || '').toLowerCase()) && archiveLower.includes('famous gear record'), archiveTextAfterRetire.slice(0, 500));
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
    const firstUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.survivorStart)}))()`);
    const secondUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.survivorStart)}))()`);
    await evalScript(client, `S.player.talents.pointsEarned = 1; S.player.talents.pointsSpent = 1; S.player.talentPointsEarned = 1; S.player.talentPointsSpent = 1; S.player.talentPoints = 0; if (typeof save === 'function') save(S); if (typeof render === 'function') render(); return true;`);
    const noPointUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      return api && typeof api.unlock === 'function' ? api.unlock(S, ${JSON.stringify(TALENT_IDS.hunterClarity)}) : false;
    })()`);
    const safetySummary = await getSummary();
    record('Legacy unlock paths remain no-op and zeroed', safetyGrant === false && firstUnlock === false && secondUnlock === false && noPointUnlock === false && safetySummary && safetySummary.pointsEarned === 0 && safetySummary.pointsSpent === 0 && safetySummary.pointsAvailable === 0 && Array.isArray(safetySummary.unlockedIds) && safetySummary.unlockedIds.length === 0, JSON.stringify({ safetyGrant, firstUnlock, secondUnlock, noPointUnlock, safetySummary }));

    // Longer play path after failed talent calls.
    await clearSave(client);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && !!window.DungeonDexTalents && typeof render === 'function' && typeof S !== 'undefined' && !!S && !!S.player && document.body && document.readyState !== 'loading'`, 15000);
    const combatGrant = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    const combatUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.survivorStart)}))()`);
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
    const boardUnlock = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hunterClarity)}))()`);
    const boardRewardAfterUnlock = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts;
      const contract = api?.availableEliteContracts ? api.availableEliteContracts(S)?.[0] : null;
      const fallback = { id:'__smoke_contract__', baseReward:1000, reward:1000, floorBonusPerDepth:0, maxReward:1200 };
      return calculateContractReward(contract || fallback, S);
    })()`);
    record('Board Clarity unlock remains inert', boardGrant === false && boardUnlock === false, JSON.stringify({ boardGrant, boardUnlock }));
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
