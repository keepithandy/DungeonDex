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

const results = [];
const runtimeErrors = [];
const consoleErrors = [];
let PAGE_URL = '';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
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
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function safePathFromUrl(urlPath) {
  const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/');
  const relative = clean === '/' ? '/index.html' : clean;
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}

async function startStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = safePathFromUrl(req.url);
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypeFor(filePath), 'Cache-Control': 'no-store' });
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
  PAGE_URL = `http://127.0.0.1:${port}/index.html`;
  return server;
}

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return true;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function startChrome(debugPort, userDataDir) {
  const args = [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ];
  return spawn(CHROME_PATH, args, { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true });
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  return JSON.parse(await res.text());
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    let opened = false;
    const listeners = new Map();

    function emit(event, payload) {
      const set = listeners.get(event);
      if (set) for (const fn of set) fn(payload);
    }

    function send(method, params = {}) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
      });
    }

    ws.onopen = () => {
      opened = true;
      resolve({
        send,
        on(event, fn) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(fn);
        },
        close() { ws.close(); }
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
      if (msg.method) emit(msg.method, msg.params || {});
    };
    ws.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}

function exceptionText(details) {
  return details?.exception?.description || details?.text || 'Unknown runtime exception';
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(exceptionText(result.exceptionDetails));
  return result.result?.value;
}

function asObject(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function waitForRuntime(client, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(client, `(() => !!window.DungeonDexDebtCollector && typeof render === 'function' && typeof S !== 'undefined' && !!S.player)()`);
      if (ready) return true;
    } catch (_) {}
    await sleep(150);
  }
  return false;
}

async function main() {
  const server = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-debt-smoke-'));
  const chrome = startChrome(debugPort, userDataDir);
  let client = null;

  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');

    client = await createCdpClient(target.webSocketDebuggerUrl);
    client.on('Runtime.exceptionThrown', evt => runtimeErrors.push(exceptionText(evt.exceptionDetails)));
    client.on('Runtime.consoleAPICalled', msg => {
      if ((msg.type || '').toLowerCase() === 'error') consoleErrors.push((msg.args || []).map(arg => arg.value || arg.description || arg.type).join(' '));
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: PAGE_URL });

    const ready = await waitForRuntime(client);
    if (!ready) {
      const diag = await evaluate(client, `(() => ({ url:location.href, title:document.title, readyState:document.readyState, body:(document.body?.innerText || '').slice(0, 300), debtApi:!!window.DungeonDexDebtCollector, render:typeof render, state:typeof S }))()`);
      throw new Error(`DungeonDex runtime did not initialize. ${JSON.stringify(diag)}`);
    }

    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); true`);
    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after reload.');

    const smoke = await evaluate(client, `(() => window.DungeonDexDebtCollector.smoke())()`);
    record('Debt API smoke helper passes', !!smoke?.ok, JSON.stringify(smoke));
    const debtHelperShape = asObject(await evaluate(client, `(() => ({
      hasSummary: typeof window.DungeonDexDebtCollector?.debtCollectorDisplaySummary === 'function',
      hasPressure: typeof window.DungeonDexDebtCollector?.debtPressureDisplay === 'function',
      hasStatusLine: typeof window.DungeonDexDebtCollector?.debtCollectorStatusLine === 'function',
      hasFallback: typeof window.DungeonDexDebtCollector?.debtCollectorFallbackState === 'function',
      hasPassiveContract: typeof window.DungeonDexDebtCollector?.debtCollectorClarityPassiveContract === 'function',
      hasPassiveCopy: typeof window.DungeonDexDebtCollector?.applyDebtCollectorClarityCopy === 'function'
    }))()`));
    record('Debt display helpers exist', !!smoke?.summary && !!smoke?.pressure && typeof smoke?.statusLine === 'string' && debtHelperShape.hasSummary && debtHelperShape.hasPressure && debtHelperShape.hasStatusLine && debtHelperShape.hasFallback, JSON.stringify({ summary: smoke?.summary, pressure: smoke?.pressure, statusLine: smoke?.statusLine, debtHelperShape }));

    const debtClarityAudit = asObject(await evaluate(client, `(() => {
      const api = window.DungeonDexDebtCollector;
      const canonical = window.DungeonDexTalents || window.DungeonDexWardenTalents;
      const learnedState = { player: { talentLearnedIds: { debt_collector_clarity: true }, talentUnlockIds: ['debt_collector_clarity'] } };
      const lockedState = { player: { talentLearnedIds: {}, talentUnlockIds: [] } };
      const source = {
        statusLabel: 'Debt Active',
        balanceLabel: 'Owed 15 coin',
        pressureLabel: 'Pressure 3',
        termsLabel: 'Settle on return',
        reminderLabel: 'Keep coin ready.',
        balanceCopper: 1500,
        pressure: 3,
        wallet: 875,
        repaymentState: 'pending'
      };
      const before = JSON.stringify(source);
      const learnedStateBefore = JSON.stringify(learnedState);
      const lockedStateBefore = JSON.stringify(lockedState);
      const learnedContract = api?.debtCollectorClarityPassiveContract ? api.debtCollectorClarityPassiveContract(learnedState) : null;
      const lockedContract = api?.debtCollectorClarityPassiveContract ? api.debtCollectorClarityPassiveContract(lockedState) : null;
      const learnedCopy = api?.applyDebtCollectorClarityCopy ? api.applyDebtCollectorClarityCopy(learnedState, source) : null;
      const lockedCopy = api?.applyDebtCollectorClarityCopy ? api.applyDebtCollectorClarityCopy(lockedState, source) : null;
      const canonicalLearnedContract = canonical?.debtCollectorClarityPassiveContract ? canonical.debtCollectorClarityPassiveContract(learnedState) : null;
      const canonicalLockedContract = canonical?.debtCollectorClarityPassiveContract ? canonical.debtCollectorClarityPassiveContract(lockedState) : null;
      const canonicalLearnedCopy = canonical?.applyDebtCollectorClarityCopy ? canonical.applyDebtCollectorClarityCopy(learnedState, source) : null;
      const canonicalLockedCopy = canonical?.applyDebtCollectorClarityCopy ? canonical.applyDebtCollectorClarityCopy(lockedState, source) : null;
      return {
        learnedContract,
        lockedContract,
        learnedCopy,
        lockedCopy,
        canonicalLearnedContract,
        canonicalLockedContract,
        canonicalLearnedCopy,
        canonicalLockedCopy,
        before,
        after: JSON.stringify(source),
        learnedStateBefore,
        learnedStateAfter: JSON.stringify(learnedState),
        lockedStateBefore,
        lockedStateAfter: JSON.stringify(lockedState),
        sameObject: learnedCopy === source
      };
    })()`));
    record('Debt Collector clarity contract separates readiness from live activation', debtClarityAudit?.lockedContract?.learned === false && debtClarityAudit?.lockedContract?.passiveReady === false && debtClarityAudit?.lockedContract?.passiveEnabled === false && debtClarityAudit?.lockedContract?.appliesEffect === false && debtClarityAudit?.lockedContract?.liveRendererWired === false && debtClarityAudit?.learnedContract?.contractOwner === 'DungeonDexTalents' && debtClarityAudit?.learnedContract?.learned === true && debtClarityAudit?.learnedContract?.passiveReady === true && debtClarityAudit?.learnedContract?.passiveEnabled === false && debtClarityAudit?.learnedContract?.appliesEffect === false && debtClarityAudit?.learnedContract?.liveRendererWired === false, JSON.stringify(debtClarityAudit));
    record('Debt Collector public contract delegates to canonical Talent output', JSON.stringify(debtClarityAudit?.learnedContract) === JSON.stringify(debtClarityAudit?.canonicalLearnedContract) && JSON.stringify(debtClarityAudit?.lockedContract) === JSON.stringify(debtClarityAudit?.canonicalLockedContract), JSON.stringify({ debtLearned:debtClarityAudit?.learnedContract, canonicalLearned:debtClarityAudit?.canonicalLearnedContract }));
    record('Debt Collector public copy helper matches canonical Talent output', JSON.stringify(debtClarityAudit?.learnedCopy) === JSON.stringify(debtClarityAudit?.canonicalLearnedCopy) && JSON.stringify(debtClarityAudit?.lockedCopy) === JSON.stringify(debtClarityAudit?.canonicalLockedCopy), JSON.stringify({ debtLearned:debtClarityAudit?.learnedCopy, canonicalLearned:debtClarityAudit?.canonicalLearnedCopy }));
    record('Debt Collector clarity contract stays non-dangerous and non-mutating', debtClarityAudit?.learnedContract?.combat === false && debtClarityAudit?.learnedContract?.economy === false && debtClarityAudit?.learnedContract?.rewards === false && debtClarityAudit?.learnedContract?.monsters === false && debtClarityAudit?.learnedContract?.gear === false && debtClarityAudit?.learnedContract?.progression === false && debtClarityAudit?.learnedContract?.scaling === false && debtClarityAudit?.learnedContract?.revisit === false && debtClarityAudit?.learnedContract?.eliteBoardMath === false && debtClarityAudit?.learnedContract?.debtMath === false && debtClarityAudit?.learnedContract?.talentUiActions === false && debtClarityAudit?.learnedContract?.mutatesSave === false, JSON.stringify(debtClarityAudit?.learnedContract));
    record('Debt Collector clarity helper is clone-safe and text-only', debtClarityAudit?.sameObject === false && debtClarityAudit?.before === debtClarityAudit?.after && debtClarityAudit?.learnedCopy?.passiveSurface === 'Debt Collector display copy only' && debtClarityAudit?.learnedCopy?.passiveApplied === true && debtClarityAudit?.learnedCopy?.statusLabel === 'Debt status: Debt Active' && debtClarityAudit?.learnedCopy?.balanceLabel === 'Amount owed: Owed 15 coin' && debtClarityAudit?.learnedCopy?.pressureLabel === 'Pressure: Pressure 3' && debtClarityAudit?.learnedCopy?.termsLabel === 'Terms: Settle on return' && debtClarityAudit?.learnedCopy?.reminderLabel === 'Reminder: Keep coin ready.' && debtClarityAudit?.learnedCopy?.balanceCopper === 1500 && debtClarityAudit?.learnedCopy?.pressure === 3, JSON.stringify(debtClarityAudit?.learnedCopy));
    record('Debt Collector clarity helper leaves unlearned copy unchanged', JSON.stringify(debtClarityAudit?.lockedCopy) === debtClarityAudit?.before && debtClarityAudit?.lockedCopy?.passiveApplied !== true && debtClarityAudit?.lockedCopy?.passiveSurface === undefined, JSON.stringify(debtClarityAudit?.lockedCopy));
    record('Debt Collector clarity helper does not mutate input or player state', debtClarityAudit?.before === debtClarityAudit?.after && debtClarityAudit?.learnedStateBefore === debtClarityAudit?.learnedStateAfter && debtClarityAudit?.lockedStateBefore === debtClarityAudit?.lockedStateAfter && debtClarityAudit?.learnedCopy?.balanceCopper === 1500 && debtClarityAudit?.learnedCopy?.pressure === 3 && debtClarityAudit?.learnedCopy?.wallet === 875 && debtClarityAudit?.learnedCopy?.repaymentState === 'pending', JSON.stringify({ before: debtClarityAudit?.before, after: debtClarityAudit?.after, learnedStateBefore: debtClarityAudit?.learnedStateBefore, learnedStateAfter: debtClarityAudit?.learnedStateAfter }));
    record('Debt Collector smoke fixture remains unchanged', !!smoke?.checks?.borrowOk && !!smoke?.checks?.persistOk && !!smoke?.checks?.partialOk && !!smoke?.checks?.clearOk && !!smoke?.checks?.pressureOk && !!smoke?.checks?.combatOk, JSON.stringify(smoke));

    const uiResult = asObject(await evaluate(client, `(() => {
      S.player.gold = 0;
      S.player.debtCollector = { active:false, balanceCopper:0, pressure:0, lastVisitAt:'', notes:[] };
      S.screen = 'town';
      render();
      const buttons = Array.from(document.querySelectorAll('[data-debt-borrow]'));
      const button = document.querySelector('[data-debt-borrow="500"]');
      const repayButton = document.getElementById('repayDebtBtn');
      const hasHandler = !!button && typeof button.onclick === 'function';
      if (hasHandler) button.onclick();
      return {
        hasButton: !!button,
        buttonCount: buttons.length,
        hasHandler,
        hasRepayButton: !!repayButton,
        repayDisabled: !!repayButton?.disabled,
        wallet: S.player.gold,
        debt: { ...S.player.debtCollector },
        panelText: document.getElementById('debtCollectorPanel')?.innerText || '',
        panel: document.getElementById('debtCollectorPanel')?.innerHTML || ''
      };
    })()`));
    record('Borrow 5s button adds wallet and active debt', uiResult.wallet === 500 && uiResult.debt.balanceCopper === 500 && uiResult.debt.active === true && uiResult.buttonCount === 3 && uiResult.hasRepayButton === true && !/Owed <span class="money/i.test(uiResult.panelText || '') && /Owed 5s/.test(uiResult.panelText || ''), JSON.stringify(uiResult));

    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after persistence reload.');
    const persisted = asObject(await evaluate(client, `(() => JSON.stringify({ wallet:S.player.gold, debt:{ ...S.player.debtCollector }, panelText:document.getElementById('debtCollectorPanel')?.innerText || '' }))()`));
    record('Borrowed debt persists after reload', persisted.wallet === 500 && persisted.debt.balanceCopper === 500 && persisted.debt.active === true && persisted.panelText.includes('Debt Active') && !/Owed <span class="money/i.test(persisted.panelText || '') && /Owed 5s/.test(persisted.panelText || ''), JSON.stringify(persisted));

    const repayResult = asObject(await evaluate(client, `(() => {
      S.player.gold = 300;
      render();
      const partialButton = document.getElementById('repayDebtBtn');
      if (partialButton && typeof partialButton.onclick === 'function') partialButton.onclick();
      const partial = { wallet:S.player.gold, debt:{ ...S.player.debtCollector } };
      S.player.gold = 1000;
      window.DungeonDexDebtCollector.repay(S);
      render();
      const clear = { wallet:S.player.gold, debt:{ ...S.player.debtCollector }, panelText:document.getElementById('debtCollectorPanel')?.innerText || '' };
      return { partial, clear, partialHadHandler: !!partialButton && typeof partialButton.onclick === 'function' };
    })()`));
    record('Repay Debt spends available wallet partially', repayResult.partialHadHandler && repayResult.partial.wallet === 0 && repayResult.partial.debt.balanceCopper === 200 && repayResult.partial.debt.active === true, JSON.stringify(repayResult.partial));
    record('Full payoff clears active debt and pressure', repayResult.clear.wallet === 800 && repayResult.clear.debt.balanceCopper === 0 && repayResult.clear.debt.active === false && repayResult.clear.debt.pressure === 0 && /No Debt/.test(repayResult.clear.panelText) && /Pressure 0/.test(repayResult.clear.panelText), JSON.stringify(repayResult.clear));

    const pressureResult = asObject(await evaluate(client, `(() => {
      S.player.gold = 0;
      S.player.debtCollector = { active:false, balanceCopper:0, pressure:0, lastVisitAt:'', notes:[] };
      window.DungeonDexDebtCollector.borrow(S, 1000);
      const statsBefore = JSON.stringify(S.player.stats || {});
      const choicesBefore = JSON.stringify(S.run?.choices || []);
      const pressureBefore = S.player.debtCollector.pressure;
      window.DungeonDexDebtCollector.pressureReturn(S, 'extract');
      return JSON.stringify({
        pressureBefore,
        pressureAfter:S.player.debtCollector.pressure,
        statsSame:JSON.stringify(S.player.stats || {}) === statsBefore,
        choicesSame:JSON.stringify(S.run?.choices || []) === choicesBefore,
        debt:{ ...S.player.debtCollector }
      });
    })()`));
    record('Pressure increments on return only as atmosphere', pressureResult.pressureAfter === pressureResult.pressureBefore + 1 && pressureResult.statsSame && pressureResult.choicesSame, JSON.stringify(pressureResult));

    const malformedResult = asObject(await evaluate(client, `(() => {
      const raw = { player: { debtCollector: ['bad'], gold: 0 } };
      const before = JSON.stringify(raw);
      const summary = window.DungeonDexDebtCollector.debtCollectorDisplaySummary(raw);
      const pressure = window.DungeonDexDebtCollector.debtPressureDisplay(raw);
      const statusLine = window.DungeonDexDebtCollector.debtCollectorStatusLine(raw);
      const fallback = window.DungeonDexDebtCollector.debtCollectorFallbackState();
      const after = JSON.stringify(raw);
      return JSON.stringify({ before, after, summary, pressure, statusLine, fallback });
    })()`));
    record('Malformed debt state falls back safely', malformedResult.before === malformedResult.after && malformedResult.summary?.statusLabel === 'No Debt' && malformedResult.pressure?.label === 'Pressure 0' && typeof malformedResult.statusLine === 'string' && malformedResult.fallback?.active === false, JSON.stringify(malformedResult));

    record('No runtime or console errors', runtimeErrors.length === 0 && consoleErrors.length === 0, JSON.stringify({ runtimeErrors, consoleErrors }));

    const failed = results.filter(result => !result.ok);
    console.log(JSON.stringify({ pageUrl: PAGE_URL, results, runtimeErrors, consoleErrors }, null, 2));
    if (failed.length) process.exitCode = 1;
  } finally {
    try { if (client) client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => server.close(resolve)); } catch {}
  }
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
