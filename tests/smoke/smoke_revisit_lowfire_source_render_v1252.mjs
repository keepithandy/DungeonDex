#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const BOARD_SELECTOR = '#questPanel .town-board-shell, #questPanel.town-board-shell, .town-section-shell.town-board-shell';
const REVISIT_SELECTOR = '.town-section-shell.town-board-shell #revisitPanel, #questPanel #revisitPanel, #revisitPanel';
const ELITE_SELECTOR = '.town-section-shell.town-board-shell .elite-contract-board, #questPanel .elite-contract-board, .elite-contract-board';
const TROPHY_START_SELECTOR = '#revisitPanel [data-start-revisit="trophy_echo_route"]';

const results = [];
const consoleErrors = [];
const runtimeErrors = [];

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function record(name, ok, detail = ''){ results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`); }

async function pickPort(){
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

function safePathFromUrl(urlPath){
  const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/');
  const rel = clean === '/' ? '/index.html' : clean;
  const resolved = path.resolve(ROOT, `.${rel}`);
  if (!resolved.startsWith(ROOT)) throw new Error('path outside root');
  return resolved;
}

function mimeType(filePath){
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function startStaticServer(){
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = safePathFromUrl(req.url);
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' });
      res.end(data);
    } catch (err) {
      res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(err?.message || String(err));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  return { server, url: `http://127.0.0.1:${port}/index.html` };
}

async function waitForHttp(url, timeoutMs = 15000){
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache:'no-store' });
      if (res.ok) return true;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function fetchJson(url){
  const res = await fetch(url);
  return JSON.parse(await res.text());
}

async function startChrome(debugPort, userDataDir){
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--window-size=390,844',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { cwd: ROOT, detached:false, stdio:'ignore', windowsHide:true });
  chrome.on('error', err => { throw err; });
  return chrome;
}

async function createCdpClient(wsUrl){
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      resolve({
        send(method, params = {}){
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveSend, rejectSend) => pending.set(id, { resolve:resolveSend, reject:rejectSend }));
        },
        on(event, fn){
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(fn);
        },
        close(){ ws.close(); }
      });
    };
    ws.onerror = err => { if (!opened) reject(err); };
    ws.onmessage = event => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`));
        else entry.resolve(msg.result || {});
        return;
      }
      if (msg.method && listeners.has(msg.method)) for (const fn of listeners.get(msg.method)) fn(msg.params || {});
    };
    ws.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}

async function evalByValue(client, expression){
  const result = await client.send('Runtime.evaluate', { expression:`(() => (${expression}))()`, awaitPromise:true, returnByValue:true, replMode:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.exception?.value || result.exceptionDetails.text || 'Exception');
  return result.result?.value;
}

async function evalScript(client, script){
  const result = await client.send('Runtime.evaluate', { expression:`(async () => { ${script} })()`, awaitPromise:true, returnByValue:true, replMode:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.exception?.value || result.exceptionDetails.text || 'Exception');
  return result.result?.value;
}

async function waitForCondition(client, predicate, timeoutMs = 15000, pollMs = 150){
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await evalByValue(client, predicate)) return true; } catch {}
    await sleep(pollMs);
  }
  return false;
}

async function forceTownView(client){
  await evalScript(client, `
    const townButton = Array.from(document.querySelectorAll('button'))
      .find(button => /^Town$/i.test(String(button.textContent || '').trim()));
    if (townButton) townButton.click();
    if (typeof render === 'function') render();
    return true;
  `);
  await waitForCondition(client, `${JSON.stringify(BOARD_SELECTOR)} && !!document.querySelector(${JSON.stringify(BOARD_SELECTOR)})`, 5000, 100);
}

function cleanRuntimeExceptionValue(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function formatRuntimeLocation(url, lineNumber, columnNumber){
  const cleanUrl = cleanRuntimeExceptionValue(url);
  const line = Number.isFinite(lineNumber) ? lineNumber + 1 : null;
  const column = Number.isFinite(columnNumber) ? columnNumber + 1 : null;
  if (!cleanUrl && line === null) return '';
  const base = cleanUrl || '<unknown url>';
  if (line === null) return base;
  return `${base}:${line}${column === null ? '' : `:${column}`}`;
}
function formatRuntimeException(evt){
  const details = evt?.exceptionDetails || {};
  const exception = details.exception || {};
  const text = cleanRuntimeExceptionValue(details.text);
  const description = cleanRuntimeExceptionValue(exception.description);
  const value = cleanRuntimeExceptionValue(exception.value);
  const location = formatRuntimeLocation(details.url, details.lineNumber, details.columnNumber);
  return [description || value || text || 'Unknown runtime exception', location ? `at ${location}` : ''].filter(Boolean).join(' | ');
}

async function removeTempProfile(userDataDir, attempts = 8){
  const retryable = new Set(['EBUSY', 'EPERM', 'ENOTEMPTY']);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(userDataDir, { recursive:true, force:true });
      return;
    } catch (err) {
      if (!retryable.has(err?.code) || attempt === attempts) throw err;
      await sleep(attempt * 100);
    }
  }
}

async function waitForProcessExit(child, timeoutMs = 5000){
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  return await new Promise(resolve => {
    const onExit = () => { clearTimeout(timer); resolve(true); };
    const timer = setTimeout(() => { child.off('exit', onExit); resolve(false); }, timeoutMs);
    child.once('exit', onExit);
  });
}

async function main(){
  const server = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-revisit-source-smoke-'));
  const chrome = await startChrome(debugPort, userDataDir);
  let client = null;

  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');

    client = await createCdpClient(target.webSocketDebuggerUrl);
    client.on('Runtime.consoleAPICalled', msg => {
      if ((msg.type || '').toLowerCase() === 'error') consoleErrors.push((msg.args || []).map(arg => arg.value || arg.description || arg.type).join(' '));
    });
    client.on('Runtime.exceptionThrown', evt => runtimeErrors.push(formatRuntimeException(evt)));
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: server.url });

    const ready = await waitForCondition(client, `typeof render === 'function' && typeof S !== 'undefined' && !!S.player && !!window.DungeonDexEliteContracts`, 15000);
    if (!ready) throw new Error('DungeonDex runtime did not initialize.');

    await client.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:3, mobile:true });
    await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
    await client.send('Page.reload', { ignoreCache:true });

    const readyAfterReload = await waitForCondition(client, `typeof render === 'function' && typeof S !== 'undefined' && !!S.player && !!window.DungeonDexEliteContracts`, 15000);
    if (!readyAfterReload) throw new Error('DungeonDex runtime did not initialize after reload.');

    await forceTownView(client);

    const baseline = await evalByValue(client, `(() => {
      const headerSlot = document.getElementById('revisitFoundationSlot');
      const boardShell = document.querySelector(${JSON.stringify(BOARD_SELECTOR)});
      const oldHelperFlags = {
        aboveEliteSafe: !!window.__dungeondexRevisitAboveEliteBoardSlotSafe,
        aboveEliteSlot: !!window.__dungeondexRevisitAboveEliteBoardSlot,
        sourceSlot: !!window.__dungeondexRevisitLowfireBoardSourceSlot,
        wrappedAboveElite: !!window.renderTown?.__ddRevisitAboveEliteWrapped,
        wrappedSourceSlot: !!window.renderTown?.__ddRevisitSourceSlotWrapped
      };
      return {
        runtimeReady: typeof render === 'function' && typeof S !== 'undefined' && !!S.player,
        title: document.title || '',
        headerText: headerSlot?.innerText || '',
        headerChildren: headerSlot?.children?.length || 0,
        boardExists: !!boardShell,
        oldHelperFlags,
        townButtons: Array.from(document.querySelectorAll('button')).map(button => String(button.textContent || '').trim()).filter(Boolean)
      };
    })()`);

    record('Runtime initializes on mobile viewport', baseline.runtimeReady === true, JSON.stringify({ title:baseline.title }));
    record('Town view renders Lowfire Board shell', baseline.boardExists === true, JSON.stringify({ boardExists:baseline.boardExists }));
    record('Old Revisit bridge/helper flags are absent', Object.values(baseline.oldHelperFlags).every(value => value === false), JSON.stringify(baseline.oldHelperFlags));
    record('Old Revisit header slot starts empty when no lane is visible', baseline.headerChildren === 0 && baseline.headerText.trim() === '', JSON.stringify({ headerChildren:baseline.headerChildren, headerText:baseline.headerText }));
    record('Primary Town buttons still render', baseline.townButtons.some(label => /^(Enter Dungeon|Continue Run)$/i.test(label)) && baseline.townButtons.some(label => /^Rest/i.test(label)), JSON.stringify(baseline.townButtons));

    await evalScript(client, `
      if (!window.DungeonDexScenarioDevTools) throw new Error('DungeonDexScenarioDevTools unavailable.');
      if (typeof window.DungeonDexScenarioDevTools.clearBossTrophies === 'function') window.DungeonDexScenarioDevTools.clearBossTrophies();
      if (typeof window.DungeonDexScenarioDevTools.clearRetiredRelics === 'function') window.DungeonDexScenarioDevTools.clearRetiredRelics();
      if (typeof window.DungeonDexScenarioDevTools.clearGearMemoryForTest === 'function') window.DungeonDexScenarioDevTools.clearGearMemoryForTest();
      if (typeof window.DungeonDexScenarioDevTools.grantBossTrophyForTest !== 'function') throw new Error('grantBossTrophyForTest unavailable.');
      window.DungeonDexScenarioDevTools.grantBossTrophyForTest();
      if (typeof render === 'function') render();
      return true;
    `);
    await forceTownView(client);

    const placement = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const headerSlot = document.getElementById('revisitFoundationSlot');
      const boardShell = document.querySelector(${JSON.stringify(BOARD_SELECTOR)});
      const revisitPanel = document.querySelector(${JSON.stringify(REVISIT_SELECTOR)});
      const eliteBoard = document.querySelector(${JSON.stringify(ELITE_SELECTOR)});
      const allRevisitPanels = Array.from(document.querySelectorAll('#revisitPanel'));
      const startButton = document.querySelector(${JSON.stringify(TROPHY_START_SELECTOR)});
      const oldHeaderButton = document.querySelector('#revisitFoundationSlot [data-start-revisit], #revisitFoundationSlot button');
      const panelText = revisitPanel?.innerText || '';
      const boardText = boardShell?.innerText || '';
      const status = api.trophyEchoStatus ? api.trophyEchoStatus(S) : null;
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null;
      const order = revisitPanel && eliteBoard ? !!(revisitPanel.compareDocumentPosition(eliteBoard) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
      return {
        headerText: headerSlot?.innerText || '',
        headerChildren: headerSlot?.children?.length || 0,
        boardExists: !!boardShell,
        revisitInBoard: !!(boardShell && revisitPanel && boardShell.contains(revisitPanel)),
        eliteBoardExists: !!(boardShell && eliteBoard && boardShell.contains(eliteBoard)),
        panelCount: allRevisitPanels.length,
        order,
        hasStartButton: !!startButton,
        oldHeaderButton: !!oldHeaderButton,
        panelText,
        boardText,
        status,
        trophyRoute,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);

    record('Boss trophy fixture makes Trophy Echo available', placement.status?.available === true && placement.trophyRoute?.playable === true, JSON.stringify({ status:placement.status, trophyRoute:placement.trophyRoute }));
    record('Revisit panel renders inside Lowfire Board source flow', placement.revisitInBoard === true && placement.boardExists === true, JSON.stringify({ revisitInBoard:placement.revisitInBoard, boardExists:placement.boardExists }));
    record('Old Revisit header slot is cleared after source render', placement.headerChildren === 0 && placement.headerText.trim() === '' && placement.oldHeaderButton === false, JSON.stringify({ headerChildren:placement.headerChildren, headerText:placement.headerText, oldHeaderButton:placement.oldHeaderButton }));
    record('Only one #revisitPanel exists', placement.panelCount === 1, JSON.stringify({ panelCount:placement.panelCount }));
    record('Revisit appears before Lowfire Elite Board', placement.order === true && placement.eliteBoardExists === true, JSON.stringify({ order:placement.order, eliteBoardExists:placement.eliteBoardExists }));
    record('Revisit panel exposes Start Trophy Echo in board area', placement.hasStartButton === true && /Start Trophy Echo/i.test(placement.panelText), JSON.stringify({ hasStartButton:placement.hasStartButton, panelText:placement.panelText.slice(0, 500) }));
    record('Lowfire Elite Board still renders after Revisit', /Lowfire Elite Board/i.test(placement.boardText) && /WANTED|Active Hunt|No Active/i.test(placement.boardText), JSON.stringify({ boardText:placement.boardText.slice(0, 800) }));

    const clickAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const debtBefore = JSON.stringify(S.player?.debtCollector || {});
      const talentBefore = JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null });
      const button = document.querySelector(${JSON.stringify(TROPHY_START_SELECTOR)});
      if (button) button.click();
      const statusAfterClick = api.trophyEchoStatus ? api.trophyEchoStatus(S) : null;
      if (typeof render === 'function') render();
      const boardShellAfter = document.querySelector(${JSON.stringify(BOARD_SELECTOR)});
      const revisitPanelAfter = document.querySelector(${JSON.stringify(REVISIT_SELECTOR)});
      const eliteBoardAfter = document.querySelector(${JSON.stringify(ELITE_SELECTOR)});
      const orderAfter = revisitPanelAfter && eliteBoardAfter ? !!(revisitPanelAfter.compareDocumentPosition(eliteBoardAfter) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
      const debtAfter = JSON.stringify(S.player?.debtCollector || {});
      const talentAfter = JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null });
      return {
        clicked: !!button,
        statusAfterClick,
        active: api.activeTrophyEcho ? api.activeTrophyEcho(S) : null,
        panelStillInBoard: !!(boardShellAfter && revisitPanelAfter && boardShellAfter.contains(revisitPanelAfter)),
        eliteStillExists: !!(boardShellAfter && eliteBoardAfter && boardShellAfter.contains(eliteBoardAfter)),
        orderAfter,
        debtUnchanged: debtBefore === debtAfter,
        talentUnchanged: talentBefore === talentAfter
      };
    })()`);

    record('Start Trophy Echo button remains responsive', clickAudit.clicked === true && clickAudit.statusAfterClick?.active === true && clickAudit.active?.routeKey === 'trophy_echo_route', JSON.stringify({ clicked:clickAudit.clicked, statusAfterClick:clickAudit.statusAfterClick, active:clickAudit.active }));
    record('Revisit stays above Elite Board after button action and render', clickAudit.panelStillInBoard === true && clickAudit.eliteStillExists === true && clickAudit.orderAfter === true, JSON.stringify({ panelStillInBoard:clickAudit.panelStillInBoard, eliteStillExists:clickAudit.eliteStillExists, orderAfter:clickAudit.orderAfter }));
    record('Revisit start stays Debt/Talent-neutral', clickAudit.debtUnchanged === true && clickAudit.talentUnchanged === true, JSON.stringify({ debtUnchanged:clickAudit.debtUnchanged, talentUnchanged:clickAudit.talentUnchanged }));
    record('No browser console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    record('No runtime exceptions', runtimeErrors.length === 0, runtimeErrors.join(' | '));
  } finally {
    if (client) { try { client.close(); } catch {} }
    server.server.close();
    if (chrome) {
      chrome.kill();
      await waitForProcessExit(chrome, 5000);
    }
    await removeTempProfile(userDataDir).catch(() => {});
  }

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nCompact smoke result: ${passed}/${results.length} passed`);
  if (failed > 0) {
    console.error('\nFailed checks:');
    for (const result of results.filter(entry => !entry.ok)) console.error(`- ${result.name}${result.detail ? ` :: ${result.detail}` : ''}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
