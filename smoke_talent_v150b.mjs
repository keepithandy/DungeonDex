#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
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
    const getTalentText = async () => await evalByValue(client, `(() => {
      const panel = document.getElementById('talentPanel');
      return panel ? panel.innerText : '';
    })()`);
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
    const freshPanelText = await getTalentText();
    record('Talent panel renders', ['Hardened Start', 'Board Regular', 'Stair Sense', 'Appraiser'].every(name => freshPanelText.includes(name)), freshPanelText.slice(0, 300));
    const freshUnlockBtn = await evalByValue(client, `(() => {
      const btn = document.querySelector('[data-learn-talent="${TALENT_IDS.hardened}"]');
      return !!btn && btn.disabled && /Need 1 point/.test(btn.textContent || '');
    })()`);
    record('Unlock buttons blocked with 0 points', !!freshUnlockBtn, 'Hardened Start button disabled');

    // Grant one point and unlock Hardened Start.
    const grantOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.grantTalentPoint(1))()`);
    record('grantTalentPoint(1)', !!grantOk, String(grantOk));
    const unlockOk = await evalByValue(client, `(() => window.DungeonDexScenarioDevTools.unlockTalentForTest(${JSON.stringify(TALENT_IDS.hardened)}))()`);
    record('unlockTalentForTest(Hardened Start)', !!unlockOk, String(unlockOk));
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
    await sleep(400);
    const afterExtractState = await evalByValue(client, `(() => ({ active: !!S.run?.active, screen: S.screen, hp: S.player.hp, maxHp: S.player.maxHp, saveOk: !!save(S) }))()`);
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
