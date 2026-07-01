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
      hasPassiveCopy: typeof window.DungeonDexDebtCollector?.applyDebtCollectorClarityCopy === 'function',
      hasRendererCopySource: typeof window.DungeonDexDebtCollector?.debtCollectorRendererCopySource === 'function',
      hasRendererCopyModel: typeof window.DungeonDexDebtCollector?.debtCollectorClarityRendererCopyModel === 'function',
      hasRepaymentContract: typeof window.DungeonDexDebtCollector?.debtCollectorRepaymentContract === 'function'
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
      const rendererLearnedState = {
        player: {
          gold: 875,
          debtCollector: { active:true, balanceCopper:1500, pressure:3, lastVisitAt:'Test Visit', notes:['Test note'] },
          talentLearnedIds: { debt_collector_clarity: true },
          talentUnlockIds: ['debt_collector_clarity']
        }
      };
      const rendererLockedState = JSON.parse(JSON.stringify(rendererLearnedState));
      rendererLockedState.player.talentLearnedIds = {};
      rendererLockedState.player.talentUnlockIds = [];
      const rendererLearnedBefore = JSON.stringify(rendererLearnedState);
      const rendererLockedBefore = JSON.stringify(rendererLockedState);
      const rendererSource = api?.debtCollectorRendererCopySource ? api.debtCollectorRendererCopySource(rendererLearnedState) : null;
      const learnedRendererModel = api?.debtCollectorClarityRendererCopyModel ? api.debtCollectorClarityRendererCopyModel(rendererLearnedState) : null;
      const lockedRendererModel = api?.debtCollectorClarityRendererCopyModel ? api.debtCollectorClarityRendererCopyModel(rendererLockedState) : null;
      const canonicalRendererModel = canonical?.debtCollectorClarityRendererCopyModel ? canonical.debtCollectorClarityRendererCopyModel(rendererLearnedState, rendererSource) : null;
      const learnedRepaymentContract = api?.debtCollectorRepaymentContract ? api.debtCollectorRepaymentContract(rendererLearnedState) : null;
      const lockedRepaymentContract = api?.debtCollectorRepaymentContract ? api.debtCollectorRepaymentContract(rendererLockedState) : null;
      const blockedRepaymentContract = api?.debtCollectorRepaymentContract ? api.debtCollectorRepaymentContract({ player: { gold:0, debtCollector:{ active:true, balanceCopper:1500, pressure:3 } } }) : null;
      const livePanelBefore = document.getElementById('debtCollectorPanel')?.innerHTML || '';
      const livePanelAfter = document.getElementById('debtCollectorPanel')?.innerHTML || '';
      return {
        learnedContract,
        lockedContract,
        learnedCopy,
        lockedCopy,
        canonicalLearnedContract,
        canonicalLockedContract,
        canonicalLearnedCopy,
        canonicalLockedCopy,
        rendererSource,
        learnedRendererModel,
        lockedRendererModel,
        canonicalRendererModel,
        learnedRepaymentContract,
        lockedRepaymentContract,
        blockedRepaymentContract,
        rendererLearnedBefore,
        rendererLearnedAfter: JSON.stringify(rendererLearnedState),
        rendererLockedBefore,
        rendererLockedAfter: JSON.stringify(rendererLockedState),
        livePanelBefore,
        livePanelAfter,
        before,
        after: JSON.stringify(source),
        learnedStateBefore,
        learnedStateAfter: JSON.stringify(learnedState),
        lockedStateBefore,
        lockedStateAfter: JSON.stringify(lockedState),
        sameObject: learnedCopy === source
      };
    })()`));
    record('Debt Collector clarity contract separates readiness from live activation', debtClarityAudit?.lockedContract?.learned === false && debtClarityAudit?.lockedContract?.passiveReady === false && debtClarityAudit?.lockedContract?.passiveEnabled === false && debtClarityAudit?.lockedContract?.appliesEffect === false && debtClarityAudit?.lockedContract?.liveRendererWired === false && debtClarityAudit?.learnedContract?.contractOwner === 'DungeonDexTalents' && debtClarityAudit?.learnedContract?.learned === true && debtClarityAudit?.learnedContract?.passiveReady === true && debtClarityAudit?.learnedContract?.passiveEnabled === false && debtClarityAudit?.learnedContract?.appliesEffect === false && debtClarityAudit?.learnedContract?.liveRendererWired === false && debtClarityAudit?.learnedContract?.guarded === true, JSON.stringify(debtClarityAudit));
    record('Debt Collector public contract delegates to canonical Talent output', JSON.stringify(debtClarityAudit?.learnedContract) === JSON.stringify(debtClarityAudit?.canonicalLearnedContract) && JSON.stringify(debtClarityAudit?.lockedContract) === JSON.stringify(debtClarityAudit?.canonicalLockedContract), JSON.stringify({ debtLearned:debtClarityAudit?.learnedContract, canonicalLearned:debtClarityAudit?.canonicalLearnedContract }));
    record('Debt Collector public copy helper matches canonical Talent output', JSON.stringify(debtClarityAudit?.learnedCopy) === JSON.stringify(debtClarityAudit?.canonicalLearnedCopy) && JSON.stringify(debtClarityAudit?.lockedCopy) === JSON.stringify(debtClarityAudit?.canonicalLockedCopy), JSON.stringify({ debtLearned:debtClarityAudit?.learnedCopy, canonicalLearned:debtClarityAudit?.canonicalLearnedCopy }));
    record('Debt Collector renderer copy-model helpers exist', debtHelperShape.hasRendererCopySource === true && debtHelperShape.hasRendererCopyModel === true, JSON.stringify(debtHelperShape));
    record('Debt Collector repayment activation contract is live and bounded', debtHelperShape.hasRepaymentContract === true && debtClarityAudit?.learnedRepaymentContract?.liveGameplayAction === true && debtClarityAudit?.learnedRepaymentContract?.repaymentActionLive === true && debtClarityAudit?.learnedRepaymentContract?.panelActionWired === true && debtClarityAudit?.learnedRepaymentContract?.enabled === true && debtClarityAudit?.learnedRepaymentContract?.maxRepayCopper === 875 && debtClarityAudit?.learnedRepaymentContract?.appliesEffect === true && debtClarityAudit?.learnedRepaymentContract?.mutatesStateOnAction === true && debtClarityAudit?.learnedRepaymentContract?.mutatesSave === true && debtClarityAudit?.learnedRepaymentContract?.affectsDebtBalance === true && debtClarityAudit?.learnedRepaymentContract?.affectsWallet === true && debtClarityAudit?.learnedRepaymentContract?.debtMath === true && debtClarityAudit?.learnedRepaymentContract?.repayment === true && debtClarityAudit?.learnedRepaymentContract?.economy === true && debtClarityAudit?.learnedRepaymentContract?.pressure === false && debtClarityAudit?.learnedRepaymentContract?.combat === false && debtClarityAudit?.learnedRepaymentContract?.rewards === false && debtClarityAudit?.learnedRepaymentContract?.progression === false && debtClarityAudit?.learnedRepaymentContract?.revisit === false && debtClarityAudit?.learnedRepaymentContract?.trophyEcho === false && debtClarityAudit?.learnedRepaymentContract?.talentPointEconomy === false && debtClarityAudit?.learnedRepaymentContract?.talentEarning === false && debtClarityAudit?.learnedRepaymentContract?.talentSpending === false && debtClarityAudit?.learnedRepaymentContract?.copyModelRendererWired === true && debtClarityAudit?.learnedRepaymentContract?.liveRendererWired === false, JSON.stringify(debtClarityAudit?.learnedRepaymentContract));
    record('Debt repayment contract blocks only unaffordable repayment', debtClarityAudit?.lockedRepaymentContract?.enabled === true && debtClarityAudit?.lockedRepaymentContract?.copyModelRendererWired === false && debtClarityAudit?.blockedRepaymentContract?.enabled === false && debtClarityAudit?.blockedRepaymentContract?.blockedReason === 'no_coin' && debtClarityAudit?.blockedRepaymentContract?.maxRepayCopper === 0, JSON.stringify({ locked:debtClarityAudit?.lockedRepaymentContract, blocked:debtClarityAudit?.blockedRepaymentContract }));
    record('Unlearned Debt renderer copy model returns default fragments', JSON.stringify(debtClarityAudit?.lockedRendererModel) === JSON.stringify(debtClarityAudit?.rendererSource), JSON.stringify(debtClarityAudit?.lockedRendererModel));
    record('Learned Debt renderer copy model returns guarded preview fragments', debtClarityAudit?.learnedRendererModel?.title === 'Debt Collector' && debtClarityAudit?.learnedRendererModel?.summaryText === 'Active debt. Pressure is visible.' && debtClarityAudit?.learnedRendererModel?.statusText === 'Debt Active' && debtClarityAudit?.learnedRendererModel?.balanceText === 'Owed 15s' && debtClarityAudit?.learnedRendererModel?.pressureText === 'Pressure 3' && debtClarityAudit?.learnedRendererModel?.pressureDetail === 'Rising' && debtClarityAudit?.learnedRendererModel?.flavorText === 'Owed 15s. Rising' && debtClarityAudit?.learnedRendererModel?.termsText === 'Repay spends purse coin. Pressure is visible only.' && debtClarityAudit?.learnedRendererModel?.statusMetaText === 'Debt Active' && debtClarityAudit?.learnedRendererModel?.lastVisitText === 'Test Visit' && debtClarityAudit?.learnedRendererModel?.notesText === '1 note' && debtClarityAudit?.learnedRendererModel?.clarityApplied === true && debtClarityAudit?.learnedRendererModel?.copyModelRendererWired === true && debtClarityAudit?.learnedRendererModel?.passiveApplied === false && debtClarityAudit?.learnedRendererModel?.previewOnly === true && debtClarityAudit?.learnedRendererModel?.guarded === true && debtClarityAudit?.learnedRendererModel?.liveRendererWired === false, JSON.stringify(debtClarityAudit?.learnedRendererModel));
    record('Debt renderer copy model avoids nested labels', !/Status:\s*Debt status:|Pressure:\s*Pressure/i.test(JSON.stringify(debtClarityAudit?.learnedRendererModel || {})), JSON.stringify(debtClarityAudit?.learnedRendererModel));
    record('Debt renderer copy model delegates to canonical Talent output', JSON.stringify(debtClarityAudit?.learnedRendererModel) === JSON.stringify(debtClarityAudit?.canonicalRendererModel), JSON.stringify({ debt:debtClarityAudit?.learnedRendererModel, canonical:debtClarityAudit?.canonicalRendererModel }));
    record('Debt renderer copy model stays read-only and value-stable', debtClarityAudit?.rendererLearnedBefore === debtClarityAudit?.rendererLearnedAfter && debtClarityAudit?.rendererLockedBefore === debtClarityAudit?.rendererLockedAfter && debtClarityAudit?.learnedRendererModel?.balanceCopper === 1500 && debtClarityAudit?.learnedRendererModel?.pressure === 3 && debtClarityAudit?.learnedRendererModel?.wallet === 875 && debtClarityAudit?.learnedRendererModel?.repaymentState === 'available', JSON.stringify(debtClarityAudit?.learnedRendererModel));
    record('Debt live panel remains unchanged by copy-model dry run', debtClarityAudit?.livePanelBefore === debtClarityAudit?.livePanelAfter, JSON.stringify({ before:debtClarityAudit?.livePanelBefore, after:debtClarityAudit?.livePanelAfter }));
    const learnedPanelAudit = asObject(await evaluate(client, `(() => {
      S.player.gold = 875;
      S.player.debtCollector = { active:true, balanceCopper:1500, pressure:3, lastVisitAt:'Test Visit', notes:['Test note'] };
      S.player.talentLearnedIds = { debt_collector_clarity: true };
      S.player.talentUnlockIds = ['debt_collector_clarity'];
      render();
      const panel = document.getElementById('debtCollectorPanel');
      const repayButton = document.getElementById('repayDebtBtn');
      return JSON.stringify({
        html: panel?.innerHTML || '',
        text: panel?.innerText || '',
        repayButtonMode: repayButton?.dataset?.debtRepaymentMode || '',
        repayButtonMax: Number(repayButton?.dataset?.debtMaxRepay || 0),
        repaymentContract: window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S),
        wallet: S.player.gold,
        debt: { ...S.player.debtCollector },
        snapshot: JSON.stringify({ gold:S.player.gold, debt:{ ...S.player.debtCollector }, learnedIds:S.player.talentLearnedIds, unlockIds:S.player.talentUnlockIds })
      });
    })()`));
    record('Learned Debt panel keeps passive renderer guarded while exposing live repayment', learnedPanelAudit?.html.includes('Active debt. Pressure is visible.') && learnedPanelAudit?.html.includes('Debt Active') && learnedPanelAudit?.html.includes('Owed 15s') && learnedPanelAudit?.html.includes('Pressure 3 • Rising') && learnedPanelAudit?.html.includes('Clarity: learned helper only') && learnedPanelAudit?.html.includes('Debt Collector Clarity is not active here') && learnedPanelAudit?.html.includes('data-debt-clarity-mode="copy-model"') && learnedPanelAudit?.html.includes('data-debt-repayment-mode="live-gameplay"') && learnedPanelAudit?.repayButtonMode === 'live-gameplay' && learnedPanelAudit?.repayButtonMax === 875 && learnedPanelAudit?.repaymentContract?.copyModelRendererWired === true && learnedPanelAudit?.repaymentContract?.liveRendererWired === false && learnedPanelAudit?.repaymentContract?.appliesEffect === true && learnedPanelAudit?.html.includes('Status:</b> Debt Active') && learnedPanelAudit?.html.includes('Last Visit:</b> Test Visit') && learnedPanelAudit?.html.includes('Notes:</b> 1 note'), JSON.stringify(learnedPanelAudit));
    record('Learned Debt panel output avoids duplicate labels', !/Status:\s*Debt status:|Owed:\s*Amount owed:|Pressure:\s*Pressure\s*Pressure/i.test(learnedPanelAudit?.text || ''), JSON.stringify(learnedPanelAudit));
    record('Learned Debt panel leaves state unchanged after rendering', learnedPanelAudit?.wallet === 875 && learnedPanelAudit?.debt?.balanceCopper === 1500 && learnedPanelAudit?.debt?.pressure === 3 && learnedPanelAudit?.debt?.active === true && learnedPanelAudit?.snapshot === JSON.stringify({ gold:875, debt:{ active:true, balanceCopper:1500, pressure:3, lastVisitAt:'Test Visit', notes:['Test note'] }, learnedIds:{ debt_collector_clarity:true }, unlockIds:['debt_collector_clarity'] }), JSON.stringify(learnedPanelAudit));
    record('Debt Collector clarity contract stays non-dangerous and non-mutating', debtClarityAudit?.learnedContract?.combat === false && debtClarityAudit?.learnedContract?.economy === false && debtClarityAudit?.learnedContract?.rewards === false && debtClarityAudit?.learnedContract?.monsters === false && debtClarityAudit?.learnedContract?.gear === false && debtClarityAudit?.learnedContract?.progression === false && debtClarityAudit?.learnedContract?.scaling === false && debtClarityAudit?.learnedContract?.revisit === false && debtClarityAudit?.learnedContract?.eliteBoardMath === false && debtClarityAudit?.learnedContract?.debtMath === false && debtClarityAudit?.learnedContract?.talentUiActions === false && debtClarityAudit?.learnedContract?.mutatesSave === false, JSON.stringify(debtClarityAudit?.learnedContract));
    record('Debt Collector clarity helper is clone-safe and text-only', debtClarityAudit?.sameObject === false && debtClarityAudit?.before === debtClarityAudit?.after && debtClarityAudit?.learnedCopy?.passiveSurface === 'Debt Collector copy-model preview only' && debtClarityAudit?.learnedCopy?.passiveApplied === false && debtClarityAudit?.learnedCopy?.copyModelApplied === true && debtClarityAudit?.learnedCopy?.copyModelRendererWired === true && debtClarityAudit?.learnedCopy?.previewOnly === true && debtClarityAudit?.learnedCopy?.guarded === true && debtClarityAudit?.learnedCopy?.liveRendererWired === false && debtClarityAudit?.learnedCopy?.statusLabel === 'Debt status: Debt Active' && debtClarityAudit?.learnedCopy?.balanceLabel === 'Amount owed: Owed 15 coin' && debtClarityAudit?.learnedCopy?.pressureLabel === 'Pressure: Pressure 3' && debtClarityAudit?.learnedCopy?.termsLabel === 'Terms: Settle on return' && debtClarityAudit?.learnedCopy?.reminderLabel === 'Reminder: Keep coin ready.' && debtClarityAudit?.learnedCopy?.balanceCopper === 1500 && debtClarityAudit?.learnedCopy?.pressure === 3, JSON.stringify(debtClarityAudit?.learnedCopy));
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
      const talentBefore = JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null });
      const revisitBefore = JSON.stringify(S.player?.revisitState || null);
      const statsBefore = JSON.stringify(S.player?.stats || {});
      const choicesBefore = JSON.stringify(S.run?.choices || []);
      const contractBefore = window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S);
      if (partialButton && typeof partialButton.onclick === 'function') partialButton.onclick();
      const contractAfterPartial = window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S);
      const partial = {
        wallet:S.player.gold,
        debt:{ ...S.player.debtCollector },
        panelText:document.getElementById('debtCollectorPanel')?.innerText || '',
        panel:document.getElementById('debtCollectorPanel')?.innerHTML || '',
        contractBefore,
        contractAfterPartial,
        talentSame:JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null }) === talentBefore,
        revisitSame:JSON.stringify(S.player?.revisitState || null) === revisitBefore,
        statsSame:JSON.stringify(S.player?.stats || {}) === statsBefore,
        choicesSame:JSON.stringify(S.run?.choices || []) === choicesBefore
      };
      return { partial, partialHadHandler: !!partialButton && typeof partialButton.onclick === 'function' };
    })()`));
    record('Repay Debt spends available wallet partially', repayResult.partialHadHandler && repayResult.partial.wallet === 0 && repayResult.partial.debt.balanceCopper === 200 && repayResult.partial.debt.active === true && repayResult.partial.contractBefore?.maxRepayCopper === 300 && repayResult.partial.contractAfterPartial?.enabled === false && repayResult.partial.contractAfterPartial?.blockedReason === 'no_coin' && repayResult.partial.contractAfterPartial?.balanceCopper === 200 && repayResult.partial.contractAfterPartial?.walletCopper === 0 && /Owed 2s/.test(repayResult.partial.panelText || '') && /data-debt-repayment-mode="live-gameplay"/.test(repayResult.partial.panel || ''), JSON.stringify(repayResult.partial));
    record('Debt repayment does not touch Talent, Revisit, combat, or run choices', repayResult.partial?.talentSame === true && repayResult.partial?.revisitSame === true && repayResult.partial?.statsSame === true && repayResult.partial?.choicesSame === true, JSON.stringify(repayResult.partial));

    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after repayment reload.');
    const partialPersisted = asObject(await evaluate(client, `(() => JSON.stringify({ wallet:S.player.gold, debt:{ ...S.player.debtCollector }, panelText:document.getElementById('debtCollectorPanel')?.innerText || '', contract:window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S) }))()`));
    record('Partial repayment persists after reload', partialPersisted.wallet === 0 && partialPersisted.debt.balanceCopper === 200 && partialPersisted.debt.active === true && partialPersisted.contract?.enabled === false && partialPersisted.contract?.blockedReason === 'no_coin' && /Owed 2s/.test(partialPersisted.panelText || ''), JSON.stringify(partialPersisted));

    const clearResult = asObject(await evaluate(client, `(() => {
      S.player.gold = 1000;
      window.DungeonDexDebtCollector.repay(S);
      render();
      return JSON.stringify({ wallet:S.player.gold, debt:{ ...S.player.debtCollector }, panelText:document.getElementById('debtCollectorPanel')?.innerText || '', contract:window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S) });
    })()`));
    record('Full payoff clears active debt and pressure', clearResult.wallet === 800 && clearResult.debt.balanceCopper === 0 && clearResult.debt.active === false && clearResult.debt.pressure === 0 && clearResult.contract?.enabled === false && clearResult.contract?.blockedReason === 'no_debt' && /No Debt/.test(clearResult.panelText) && /Pressure 0/.test(clearResult.panelText), JSON.stringify(clearResult));

    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after payoff reload.');
    const clearPersisted = asObject(await evaluate(client, `(() => JSON.stringify({ wallet:S.player.gold, debt:{ ...S.player.debtCollector }, panelText:document.getElementById('debtCollectorPanel')?.innerText || '', contract:window.DungeonDexDebtCollector.debtCollectorRepaymentContract(S) }))()`));
    record('Cleared debt persists after reload', clearPersisted.wallet === 800 && clearPersisted.debt.balanceCopper === 0 && clearPersisted.debt.active === false && clearPersisted.debt.pressure === 0 && clearPersisted.contract?.blockedReason === 'no_debt' && /No Debt/.test(clearPersisted.panelText || ''), JSON.stringify(clearPersisted));

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
