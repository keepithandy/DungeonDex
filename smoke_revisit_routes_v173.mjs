#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const FORBIDDEN = [
  'can' + 'Start' + 'Revisit' + 'Route',
  'start' + 'Revisit' + 'Route',
  'active' + 'Revisit' + 'Route' + 'Summary'
];
const results = [];
const consoleErrors = [];
const runtimeErrors = [];

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function record(name, ok, detail = ''){ results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`); }
async function waitForProcessExit(child, timeoutMs = 5000){
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  return await new Promise(resolve => {
    const onExit = () => { clearTimeout(timer); resolve(true); };
    const timer = setTimeout(() => { child.off('exit', onExit); resolve(false); }, timeoutMs);
    child.once('exit', onExit);
  });
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
async function pickPort(){ return await new Promise((resolve, reject) => { const server = net.createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(err => err ? reject(err) : resolve(port)); }); }); }
function safePathFromUrl(urlPath){ const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/'); const rel = clean === '/' ? '/index.html' : clean; const resolved = path.resolve(ROOT, `.${rel}`); if (!resolved.startsWith(ROOT)) throw new Error('path outside root'); return resolved; }
function mimeType(filePath){ const ext = path.extname(filePath).toLowerCase(); if (ext === '.html') return 'text/html; charset=utf-8'; if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8'; if (ext === '.css') return 'text/css; charset=utf-8'; if (ext === '.json') return 'application/json; charset=utf-8'; return 'application/octet-stream'; }
async function startStaticServer(){ const server = http.createServer(async (req, res) => { try { const filePath = safePathFromUrl(req.url); const data = await readFile(filePath); res.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' }); res.end(data); } catch (err) { res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(err?.message || String(err)); } }); const port = await new Promise((resolve, reject) => { server.on('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); }); return { server, url: `http://127.0.0.1:${port}/index.html` }; }
async function waitForHttp(url, timeoutMs = 15000){ const deadline = Date.now() + timeoutMs; let lastError = null; while (Date.now() < deadline) { try { const res = await fetch(url, { cache:'no-store' }); if (res.ok) return true; lastError = new Error(`HTTP ${res.status}`); } catch (err) { lastError = err; } await sleep(150); } throw lastError || new Error(`Timed out waiting for ${url}`); }
async function fetchJson(url){ const res = await fetch(url); return JSON.parse(await res.text()); }
async function startChrome(debugPort, userDataDir){ const chrome = spawn(CHROME_PATH, [`--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--user-data-dir=${userDataDir}`, 'about:blank'], { cwd: ROOT, detached:false, stdio:'ignore', windowsHide:true }); chrome.on('error', err => { throw err; }); return chrome; }
async function createCdpClient(wsUrl){ return await new Promise((resolve, reject) => { const ws = new WebSocket(wsUrl); const pending = new Map(); const listeners = new Map(); let nextId = 1; let opened = false; ws.onopen = () => { opened = true; resolve({ send(method, params = {}){ const id = nextId++; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolveSend, rejectSend) => pending.set(id, { resolve:resolveSend, reject:rejectSend })); }, on(event, fn){ if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); }, close(){ ws.close(); } }); }; ws.onerror = err => { if (!opened) reject(err); }; ws.onmessage = event => { const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data)); if (msg.id) { const entry = pending.get(msg.id); if (!entry) return; pending.delete(msg.id); if (msg.error) entry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`)); else entry.resolve(msg.result || {}); return; } if (msg.method && listeners.has(msg.method)) for (const fn of listeners.get(msg.method)) fn(msg.params || {}); }; ws.onclose = () => { for (const entry of pending.values()) entry.reject(new Error('CDP connection closed')); pending.clear(); if (!opened) reject(new Error('CDP connection closed before open')); }; }); }
async function evalByValue(client, expression){ const result = await client.send('Runtime.evaluate', { expression:`(() => (${expression}))()`, awaitPromise:true, returnByValue:true, replMode:true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Exception'); return result.result?.value; }
async function evalScript(client, script){ const result = await client.send('Runtime.evaluate', { expression:`(async () => { ${script} })()`, awaitPromise:true, returnByValue:true, replMode:true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Exception'); return result.result?.value; }
async function waitForCondition(client, predicate, timeoutMs = 15000, pollMs = 150){ const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { try { if (await evalByValue(client, predicate)) return true; } catch {} await sleep(pollMs); } return false; }
function cleanRuntimeExceptionValue(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function formatRuntimeLocation(url, lineNumber, columnNumber){ const cleanUrl = cleanRuntimeExceptionValue(url); const line = Number.isFinite(lineNumber) ? lineNumber + 1 : null; const column = Number.isFinite(columnNumber) ? columnNumber + 1 : null; if (!cleanUrl && line === null) return ''; const base = cleanUrl || '<unknown url>'; if (line === null) return base; return `${base}:${line}${column === null ? '' : `:${column}`}`; }
function formatRuntimeCallFrame(frame){ const functionName = cleanRuntimeExceptionValue(frame?.functionName) || '<anonymous>'; const location = formatRuntimeLocation(frame?.url, frame?.lineNumber, frame?.columnNumber); return location ? `${functionName} (${location})` : functionName; }
function formatRuntimeException(evt){ const details = evt?.exceptionDetails || {}; const exception = details.exception || {}; const text = cleanRuntimeExceptionValue(details.text); const description = cleanRuntimeExceptionValue(exception.description); const value = cleanRuntimeExceptionValue(exception.value); let message = description || value || text || 'Unknown runtime exception'; if (text && description && text !== description && !description.startsWith(text)) message = `${text} ${description}`; const location = formatRuntimeLocation(details.url, details.lineNumber, details.columnNumber); const callFrames = Array.isArray(details.stackTrace?.callFrames) ? details.stackTrace.callFrames.map(formatRuntimeCallFrame).filter(Boolean) : []; return [message, location ? `at ${location}` : '', callFrames.length ? `stack: ${callFrames.map(frame => `at ${frame}`).join(' <- ')}` : ''].filter(Boolean).join(' | '); }

async function main(){
  const server = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-revisit-smoke-'));
  const chrome = await startChrome(debugPort, userDataDir);
  let client = null;
  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');
    client = await createCdpClient(target.webSocketDebuggerUrl);
    client.on('Runtime.consoleAPICalled', msg => { if ((msg.type || '').toLowerCase() === 'error') consoleErrors.push((msg.args || []).map(arg => arg.value || arg.description || arg.type).join(' ')); });
    client.on('Runtime.exceptionThrown', evt => runtimeErrors.push(formatRuntimeException(evt)));
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: server.url });
    const ready = await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000);
    if (!ready) throw new Error('DungeonDex runtime did not initialize.');
    await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after reload.');
    await evalScript(client, `if (typeof renderArchive === 'function') renderArchive(); return true;`);
    const baselineAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const forbidden = ${JSON.stringify(FORBIDDEN)};
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null;
      const famousGearRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'famous_gear_route') || null : null;
      const rivalTraceRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'rival_trace_route') || null : null;
      const forbiddenPresent = forbidden.filter(name => Object.prototype.hasOwnProperty.call(api, name));
      return {
        forbiddenPresent,
        report: api.revisitActivationSurfaceLockdownReport ? api.revisitActivationSurfaceLockdownReport(S) : null,
        plan: api.revisitRouteActivationPlan ? api.revisitRouteActivationPlan(S) : null,
        summary: api.revisitRouteActivationSummary ? api.revisitRouteActivationSummary(S) : null,
        mirror: api.revisitRoutePreviewStateSummary ? api.revisitRoutePreviewStateSummary(S) : null,
        laneClarity: api.revisitLaneStatusClarity ? api.revisitLaneStatusClarity(S) : null,
        checklist: api.revisitTrophyEchoActivationChecklist ? api.revisitTrophyEchoActivationChecklist(S) : null,
        firstLane: api.revisitFirstActivationLane ? api.revisitFirstActivationLane(S) : null,
        secondLane: api.revisitSecondActivationLane ? api.revisitSecondActivationLane(S) : null,
        thirdLane: api.revisitThirdActivationLane ? api.revisitThirdActivationLane(S) : null,
        trophyStatus: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        trophyRoute,
        famousGearRoute,
        rivalTraceRoute,
        famousGearStatus: api.famousGearStatus ? api.famousGearStatus(S) : null,
        rivalTraceStatus: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        famousStartBlocked: api.startFamousGear ? api.startFamousGear(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        routeControls: Array.from(document.querySelectorAll('#revisitFoundationSlot [data-start-revisit], #revisitFoundationSlot [data-complete-trophy-echo], #revisitFoundationSlot [data-complete-famous-gear], #revisitFoundationSlot [data-complete-rival-trace]')).length,
        journalModel: typeof window.DDJournalV1SummaryModel === 'function' ? window.DDJournalV1SummaryModel(S) : null,
        townButtons: Array.from(document.querySelectorAll('button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Forbidden Revisit exports are absent', baselineAudit.forbiddenPresent.length === 0, JSON.stringify(baselineAudit.forbiddenPresent));
    record('Baseline Trophy Echo is locked without boss history', baselineAudit.trophyStatus?.locked === true && baselineAudit.trophyStatus?.available === false && baselineAudit.trophyStatus?.historyCount === 0 && baselineAudit.trophyRoute?.locked === true && baselineAudit.trophyRoute?.entryAvailable !== true, JSON.stringify({ trophyStatus:baselineAudit.trophyStatus, trophyRoute:baselineAudit.trophyRoute }));
    record('Baseline Famous Gear is locked and cannot start', baselineAudit.famousGearStatus?.locked === true && baselineAudit.famousGearStatus?.available === false && baselineAudit.famousGearRoute?.locked === true && baselineAudit.famousGearRoute?.entryAvailable !== true && baselineAudit.famousStartBlocked === null, JSON.stringify({ famousGearStatus:baselineAudit.famousGearStatus, famousGearRoute:baselineAudit.famousGearRoute, famousStartBlocked:baselineAudit.famousStartBlocked }));
    record('Baseline town card shows locked Trophy Echo, Famous Gear, and Rival Trace', baselineAudit.routeButtons.includes('Echo Locked') && baselineAudit.routeButtons.includes('Memory Locked') && baselineAudit.routeButtons.includes('Trace Locked') && baselineAudit.routeControls === 0 && /Locked until you have at least one boss trophy or boss record/i.test(baselineAudit.text) && /Locked until you have a retired gear record/i.test(baselineAudit.text) && /Locked until named rival history exists/i.test(baselineAudit.text), JSON.stringify({ routeButtons:baselineAudit.routeButtons, routeControls:baselineAudit.routeControls, text:baselineAudit.text.slice(0, 500) }));
    record('Baseline activation audit preserves primary dungeon path', baselineAudit.plan?.primaryPath === 'Enter Dungeon / Continue Run' && baselineAudit.summary?.hasLiveEntry === false && baselineAudit.report?.apiSurfaceSafe === true && baselineAudit.report?.trophyEchoPlayable === false && baselineAudit.report?.famousGearPlayable === false, JSON.stringify({ plan:baselineAudit.plan, summary:baselineAudit.summary, report:baselineAudit.report }));
    record('Revisit activation summary distinguishes finished and unfinished lanes', baselineAudit.summary?.currentLockedCount >= 0 && baselineAudit.summary?.currentPlayableCount >= 0 && baselineAudit.summary?.currentPreviewOnly === false && baselineAudit.summary?.allowedStates?.includes('planned') && baselineAudit.summary?.allowedStates?.includes('playable-now') && baselineAudit.summary?.allowedStates?.includes('active'), JSON.stringify(baselineAudit.summary));
    record('Unfinished lane clarity helper reports Board Echo and Debt Pressure as read-only', Array.isArray(baselineAudit.laneClarity) && baselineAudit.laneClarity.some(lane => lane.key === 'board_echo_route' && lane.bucket === 'planned' && lane.isPlanned === true && lane.isLocked === true && lane.isPlayable === false && lane.shortLabel === 'Planned') && baselineAudit.laneClarity.some(lane => lane.key === 'debt_pressure_route' && lane.bucket === 'locked' && lane.isLocked === true && lane.isPlayable === false && lane.shortLabel === 'Locked') && baselineAudit.laneClarity.every(lane => ['playable','finished','preview','planned','locked','unknown'].includes(lane.bucket)), JSON.stringify(baselineAudit.laneClarity));
    record('Guild Journal shows Board Echo preview copy and no start action', !!baselineAudit.journalModel && Array.isArray(baselineAudit.journalModel.sections) && baselineAudit.journalModel.sections.some(section => section.key === 'lanes' && /Board Echo/i.test(section.body || '') && /Planned|Locked/i.test(section.body || '') && !/Start Board Echo/i.test(section.body || '') && !/Start Board Echo/i.test(section.meta || '')));
    record('Primary dungeon entry path remains visible', baselineAudit.townButtons.some(label => /^(Enter Dungeon|Continue Run)$/i.test(label)), JSON.stringify(baselineAudit.townButtons));

    await evalScript(client, `window.DungeonDexScenarioDevTools.clearBossTrophies(); window.DungeonDexScenarioDevTools.clearRetiredRelics(); window.DungeonDexScenarioDevTools.clearGearMemoryForTest(); return true;`);
    await evalScript(client, `window.DungeonDexScenarioDevTools.grantBossTrophyForTest(); if (typeof render === 'function') render(); return true;`);
    await evalScript(client, `if (typeof renderArchive === 'function') renderArchive(); return true;`);
    const availableAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null;
      const famousGearRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'famous_gear_route') || null : null;
      const rivalTraceRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'rival_trace_route') || null : null;
      return {
        checklist: api.revisitTrophyEchoActivationChecklist ? api.revisitTrophyEchoActivationChecklist(S) : null,
        status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        famousGearStatus: api.famousGearStatus ? api.famousGearStatus(S) : null,
        rivalTraceStatus: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        report: api.revisitActivationSurfaceLockdownReport ? api.revisitActivationSurfaceLockdownReport(S) : null,
        firstLane: api.revisitFirstActivationLane ? api.revisitFirstActivationLane(S) : null,
        secondLane: api.revisitSecondActivationLane ? api.revisitSecondActivationLane(S) : null,
        thirdLane: api.revisitThirdActivationLane ? api.revisitThirdActivationLane(S) : null,
        trophyRoute,
        famousGearRoute,
        rivalTraceRoute,
        routes,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        routeControls: Array.from(document.querySelectorAll('#revisitFoundationSlot [data-start-revisit], #revisitFoundationSlot [data-complete-trophy-echo], #revisitFoundationSlot [data-complete-famous-gear], #revisitFoundationSlot [data-complete-rival-trace]')).length,
        journalModel: typeof window.DDJournalV1SummaryModel === 'function' ? window.DDJournalV1SummaryModel(S) : null,
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    const unrelatedRoutesInactive = Array.isArray(availableAudit.routes) && availableAudit.routes.filter(route => !['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'].includes(String(route?.key || ''))).every(route => route.playable !== true && route.entryAvailable !== true && route.completionAvailable !== true);
    record('Trophy Echo becomes available with boss history', availableAudit.status?.available === true && availableAudit.status?.locked === false && availableAudit.status?.historyCount >= 1 && availableAudit.trophyRoute?.playable === true && availableAudit.trophyRoute?.entryAvailable === true && availableAudit.trophyRoute?.startAvailable === true, JSON.stringify({ status:availableAudit.status, trophyRoute:availableAudit.trophyRoute }));
    record('Town card exposes Start Trophy Echo and keeps Famous Gear and Rival Trace locked', availableAudit.routeButtons.includes('Start Trophy Echo') && availableAudit.routeControls >= 1 && /Memory Locked/i.test(availableAudit.text) && /Trace Locked/i.test(availableAudit.text) && availableAudit.famousGearStatus?.locked === true && availableAudit.rivalTraceStatus?.locked === true && availableAudit.famousGearRoute?.playable !== true && availableAudit.famousGearRoute?.entryAvailable !== true && availableAudit.rivalTraceRoute?.playable !== true && availableAudit.rivalTraceRoute?.entryAvailable !== true && unrelatedRoutesInactive, JSON.stringify({ routeButtons:availableAudit.routeButtons, famousGearRoute:availableAudit.famousGearRoute, rivalTraceRoute:availableAudit.rivalTraceRoute, routes:availableAudit.routes }));
    record('Board Echo remains non-playable in the journal surface after route activation checks', !!availableAudit.journalModel && Array.isArray(availableAudit.journalModel.sections) && availableAudit.journalModel.sections.some(section => section.key === 'lanes' && /Board Echo/i.test(section.body || '') && /Planned|Locked/i.test(section.body || '') && !/Start Board Echo/i.test(section.body || '') && !/Start Board Echo/i.test(section.meta || '')));
    record('Checklist and lane metadata reflect live Revisit lanes', availableAudit.checklist?.playable === true && availableAudit.checklist?.routeEntryAvailable === true && availableAudit.checklist?.mutatesSave === true && availableAudit.firstLane?.hasLiveEntry === true && availableAudit.firstLane?.locked === false && availableAudit.report?.trophyEchoPlayable === true && availableAudit.report?.famousGearPlayable === false && availableAudit.report?.famousGearActive === false && availableAudit.thirdLane?.locked === true, JSON.stringify({ checklist:availableAudit.checklist, firstLane:availableAudit.firstLane, secondLane:availableAudit.secondLane, thirdLane:availableAudit.thirdLane, report:availableAudit.report }));

    const startedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.startTrophyEcho ? api.startTrophyEcho(S) : null;
      if (typeof render === 'function') render();
      return {
        result,
        active: api.activeTrophyEcho ? api.activeTrophyEcho(S) : null,
        status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: JSON.stringify(S.player?.revisitState || null),
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Trophy Echo can start and creates an active echo state', !!startedAudit.result && startedAudit.status?.active === true && startedAudit.active?.routeKey === 'trophy_echo_route' && /Resolve Echo/i.test(startedAudit.routeButtons.join(' ')), JSON.stringify(startedAudit));
    record('Active Trophy Echo shows readable boss-memory flavor', /Active memory:/i.test(startedAudit.text) && /Echo/i.test(startedAudit.text) && /Resolve Echo/i.test(startedAudit.text), JSON.stringify(startedAudit.text.slice(0, 500)));
    const duplicateStartAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.startTrophyEcho ? api.startTrophyEcho(S) : null;
      if (typeof render === 'function') render();
      return { result, status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null, revisitState: S.player?.revisitState || null };
    })()`);
    record('Duplicate Trophy Echo start is blocked while active', duplicateStartAudit.result === null && duplicateStartAudit.status?.active === true && duplicateStartAudit.revisitState?.trophyEcho?.active?.routeKey === 'trophy_echo_route', JSON.stringify(duplicateStartAudit));

    const completedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.completeTrophyEcho ? api.completeTrophyEcho(S) : null;
      if (typeof render === 'function') render();
      return {
        result,
        status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        summary: api.trophyEchoResultSummary ? api.trophyEchoResultSummary(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Trophy Echo can complete and records history', !!completedAudit.result && completedAudit.status?.active === false && completedAudit.summary?.completedAt > 0 && Array.isArray(completedAudit.revisitState?.trophyEcho?.history) && completedAudit.revisitState.trophyEcho.history.length >= 1 && completedAudit.revisitState.trophyEcho.memoryMarks >= 1, JSON.stringify(completedAudit));
    record('Completion shows a result summary and reopens the lane', /Last Result:/i.test(completedAudit.text) && completedAudit.routeButtons.includes('Start Trophy Echo') && /Memory Mark/i.test(completedAudit.text), JSON.stringify(completedAudit.text.slice(0, 500)));
    const duplicateCompleteAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.completeTrophyEcho ? api.completeTrophyEcho(S) : null;
      if (typeof render === 'function') render();
      return { result, status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null, revisitState: S.player?.revisitState || null };
    })()`);
    record('Duplicate Trophy Echo resolve is blocked after completion', duplicateCompleteAudit.result === null && duplicateCompleteAudit.status?.active === false && duplicateCompleteAudit.revisitState?.trophyEcho?.memoryMarks === completedAudit.revisitState?.trophyEcho?.memoryMarks, JSON.stringify(duplicateCompleteAudit));
    record('Debt stays unchanged and Trophy Echo does not alter locked Talent state', baselineAudit.debtSnapshot === availableAudit.debtSnapshot && availableAudit.debtSnapshot === startedAudit.debtSnapshot && startedAudit.debtSnapshot === completedAudit.debtSnapshot && JSON.stringify(baselineAudit.talentSnapshot ? { learned:JSON.parse(baselineAudit.talentSnapshot).learned, unlocks:JSON.parse(baselineAudit.talentSnapshot).unlocks } : null) === JSON.stringify(availableAudit.talentSnapshot ? { learned:JSON.parse(availableAudit.talentSnapshot).learned, unlocks:JSON.parse(availableAudit.talentSnapshot).unlocks } : null) && JSON.stringify(availableAudit.talentSnapshot ? { learned:JSON.parse(availableAudit.talentSnapshot).learned, unlocks:JSON.parse(availableAudit.talentSnapshot).unlocks } : null) === JSON.stringify(startedAudit.talentSnapshot ? { learned:JSON.parse(startedAudit.talentSnapshot).learned, unlocks:JSON.parse(startedAudit.talentSnapshot).unlocks } : null) && JSON.stringify(startedAudit.talentSnapshot ? { learned:JSON.parse(startedAudit.talentSnapshot).learned, unlocks:JSON.parse(startedAudit.talentSnapshot).unlocks } : null) === JSON.stringify(completedAudit.talentSnapshot ? { learned:JSON.parse(completedAudit.talentSnapshot).learned, unlocks:JSON.parse(completedAudit.talentSnapshot).unlocks } : null), JSON.stringify({ debt:[baselineAudit.debtSnapshot, availableAudit.debtSnapshot, startedAudit.debtSnapshot, completedAudit.debtSnapshot], talent:[baselineAudit.talentSnapshot, availableAudit.talentSnapshot, startedAudit.talentSnapshot, completedAudit.talentSnapshot] }));

    await evalScript(client, `window.DungeonDexScenarioDevTools.clearRetiredRelics(); window.DungeonDexScenarioDevTools.clearGearMemoryForTest(); window.DungeonDexScenarioDevTools.grantRetiredRelicForTest(); if (typeof render === 'function') render(); return true;`);
    const famousAvailableAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null;
      const famousGearRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'famous_gear_route') || null : null;
      return {
        famousGearStatus: api.famousGearStatus ? api.famousGearStatus(S) : null,
        famousGearRoute,
        trophyStatus: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        trophyRoute,
        routes,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        routeControls: Array.from(document.querySelectorAll('#revisitFoundationSlot [data-start-revisit], #revisitFoundationSlot [data-complete-trophy-echo], #revisitFoundationSlot [data-complete-famous-gear]')).length,
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    const famousRoutesInactive = Array.isArray(famousAvailableAudit.routes) && famousAvailableAudit.routes.filter(route => !['trophy_echo_route', 'famous_gear_route'].includes(String(route?.key || ''))).every(route => route.playable !== true && route.entryAvailable !== true && route.completionAvailable !== true);
    record('Famous Gear becomes available with retired gear history', famousAvailableAudit.famousGearStatus?.available === true && famousAvailableAudit.famousGearStatus?.locked === false && famousAvailableAudit.famousGearRoute?.playable === true && famousAvailableAudit.famousGearRoute?.entryAvailable === true && famousAvailableAudit.famousGearRoute?.startAvailable === true, JSON.stringify({ famousGearStatus:famousAvailableAudit.famousGearStatus, famousGearRoute:famousAvailableAudit.famousGearRoute }));
    record('Town card exposes Start Famous Gear Memory while Trophy Echo stays playable', famousAvailableAudit.routeButtons.includes('Start Famous Gear Memory') && !famousAvailableAudit.routeButtons.includes('Memory Locked') && /Playable:/i.test(famousAvailableAudit.text) && /Famous Gear Memory/i.test(famousAvailableAudit.text) && famousAvailableAudit.trophyStatus?.available === true && famousAvailableAudit.trophyRoute?.playable === true && famousRoutesInactive, JSON.stringify({ routeButtons:famousAvailableAudit.routeButtons, famousGearRoute:famousAvailableAudit.famousGearRoute, routes:famousAvailableAudit.routes, text:famousAvailableAudit.text.slice(0, 500) }));
    record('Famous Gear and Trophy Echo remain debt- and talent-neutral before starting', completedAudit.debtSnapshot === famousAvailableAudit.debtSnapshot && completedAudit.talentSnapshot === famousAvailableAudit.talentSnapshot, JSON.stringify({ debt:[completedAudit.debtSnapshot, famousAvailableAudit.debtSnapshot], talent:[completedAudit.talentSnapshot, famousAvailableAudit.talentSnapshot] }));

    const famousStartedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.startFamousGear ? api.startFamousGear(S) : null;
      if (typeof save === 'function') save(S);
      if (typeof render === 'function') render();
      return {
        result,
        active: api.activeFamousGear ? api.activeFamousGear(S) : null,
        status: api.famousGearStatus ? api.famousGearStatus(S) : null,
        summary: api.famousGearResultSummary ? api.famousGearResultSummary(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Famous Gear can start and creates an active archive memory state', !!famousStartedAudit.result && famousStartedAudit.status?.active === true && famousStartedAudit.active?.routeKey === 'famous_gear_route' && /Resolve Memory/i.test(famousStartedAudit.routeButtons.join(' ')), JSON.stringify(famousStartedAudit));
    record('Active Famous Gear shows readable archive-memory flavor', /Active memory:/i.test(famousStartedAudit.text) && /Memory/i.test(famousStartedAudit.text) && /Resolve Memory/i.test(famousStartedAudit.text), JSON.stringify(famousStartedAudit.text.slice(0, 500)));
    const famousDuplicateStartAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.startFamousGear ? api.startFamousGear(S) : null;
      if (typeof render === 'function') render();
      return { result, status: api.famousGearStatus ? api.famousGearStatus(S) : null, revisitState: S.player?.revisitState || null };
    })()`);
    record('Duplicate Famous Gear start is blocked while active', famousDuplicateStartAudit.result === null && famousDuplicateStartAudit.status?.active === true && famousDuplicateStartAudit.revisitState?.famousGear?.active?.routeKey === 'famous_gear_route', JSON.stringify(famousDuplicateStartAudit));

    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after Famous Gear active reload.');
    const famousActiveReloadAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      return {
        status: api.famousGearStatus ? api.famousGearStatus(S) : null,
        active: api.activeFamousGear ? api.activeFamousGear(S) : null,
        summary: api.famousGearResultSummary ? api.famousGearResultSummary(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Active Famous Gear persists after reload', famousActiveReloadAudit.status?.active === true && famousActiveReloadAudit.active?.routeKey === 'famous_gear_route' && famousActiveReloadAudit.revisitState?.famousGear?.active?.routeKey === 'famous_gear_route' && famousActiveReloadAudit.routeButtons.includes('Resolve Memory') && /Active/i.test(famousActiveReloadAudit.text), JSON.stringify(famousActiveReloadAudit));
    const famousTalentSummary = snapshot => {
      const data = JSON.parse(String(snapshot || '{}'));
      return {
        availablePoints: Math.max(0, Math.floor(Number(data?.ledger?.availablePoints || 0))),
        spentPoints: Math.max(0, Math.floor(Number(data?.ledger?.spentPoints || 0))),
        lifetimePoints: Math.max(0, Math.floor(Number(data?.ledger?.lifetimePoints || 0))),
        awardClaimCount: Object.keys(data?.ledger?.awardClaims || {}).length,
        earningEnabled: data?.earning?.enabled === true,
        pointsAwarded: Math.max(0, Math.floor(Number(data?.earning?.pointsAwarded || 0)))
      };
    };
    record('Famous Gear keeps debt and Talent unchanged while active', famousAvailableAudit.debtSnapshot === famousStartedAudit.debtSnapshot && famousStartedAudit.debtSnapshot === famousActiveReloadAudit.debtSnapshot && JSON.stringify(famousTalentSummary(famousAvailableAudit.talentSnapshot)) === JSON.stringify(famousTalentSummary(famousStartedAudit.talentSnapshot)) && JSON.stringify(famousTalentSummary(famousStartedAudit.talentSnapshot)) === JSON.stringify(famousTalentSummary(famousActiveReloadAudit.talentSnapshot)), JSON.stringify({ debt:[famousAvailableAudit.debtSnapshot, famousStartedAudit.debtSnapshot, famousActiveReloadAudit.debtSnapshot], talent:[famousTalentSummary(famousAvailableAudit.talentSnapshot), famousTalentSummary(famousStartedAudit.talentSnapshot), famousTalentSummary(famousActiveReloadAudit.talentSnapshot)] }));

    const famousCompletedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.completeFamousGear ? api.completeFamousGear(S) : null;
      if (typeof render === 'function') render();
      return {
        result,
        active: api.activeFamousGear ? api.activeFamousGear(S) : null,
        status: api.famousGearStatus ? api.famousGearStatus(S) : null,
        summary: api.famousGearResultSummary ? api.famousGearResultSummary(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Famous Gear can complete and records archive history', !!famousCompletedAudit.result && famousCompletedAudit.status?.active === false && famousCompletedAudit.status?.completed === true && famousCompletedAudit.summary?.completedAt > 0 && Array.isArray(famousCompletedAudit.revisitState?.famousGear?.history) && famousCompletedAudit.revisitState.famousGear.history.length >= 1 && famousCompletedAudit.revisitState.famousGear.completedKeys?.[famousCompletedAudit.result?.completionKey || ''] === true, JSON.stringify(famousCompletedAudit));
    record('Completion shows a recovered summary and reopens Famous Gear Memory', /Memory Recovered/i.test(famousCompletedAudit.text) && famousCompletedAudit.routeButtons.includes('Start Famous Gear Memory') && /Recovered/i.test(famousCompletedAudit.text), JSON.stringify(famousCompletedAudit.text.slice(0, 500)));
    const famousDuplicateCompleteAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.completeFamousGear ? api.completeFamousGear(S) : null;
      if (typeof render === 'function') render();
      return { result, status: api.famousGearStatus ? api.famousGearStatus(S) : null, revisitState: S.player?.revisitState || null };
    })()`);
    record('Duplicate Famous Gear resolve is blocked after completion', famousDuplicateCompleteAudit.result === null && famousDuplicateCompleteAudit.status?.active === false && famousDuplicateCompleteAudit.revisitState?.famousGear?.lastResult?.summary === famousCompletedAudit.revisitState?.famousGear?.lastResult?.summary, JSON.stringify(famousDuplicateCompleteAudit));

    await evalScript(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      if (!api || typeof api.rememberRival !== 'function') return false;
      if (!S.player) return false;
      if (api.clearRivals) api.clearRivals(S);
      const source = (api.ensure ? api.ensure(S).active : null) || (typeof ELITE_CONTRACTS !== 'undefined' && Array.isArray(ELITE_CONTRACTS) ? ELITE_CONTRACTS[0] : null);
      if (!source) return false;
      const fakeKiller = { contractTarget:true, contractId:source.id, name:source.eliteName || source.name || 'Rival Elite' };
      return !!api.rememberRival(S, source, fakeKiller);
    })()`);
    await evalScript(client, `if (typeof render === 'function') render(); return true;`);
    const rivalAvailableAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const rivalTraceRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'rival_trace_route') || null : null;
      return {
        status: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        route: rivalTraceRoute,
        thirdLane: api.revisitThirdActivationLane ? api.revisitThirdActivationLane(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        routes
      };
    })()`);
    const rivalRoutesInactive = Array.isArray(rivalAvailableAudit.routes) && rivalAvailableAudit.routes.filter(route => !['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'].includes(String(route?.key || ''))).every(route => route.playable !== true && route.entryAvailable !== true && route.completionAvailable !== true);
    record('Rival Trace becomes available with named rival history', rivalAvailableAudit.status?.available === true && rivalAvailableAudit.status?.locked === false && rivalAvailableAudit.route?.playable === true && rivalAvailableAudit.route?.entryAvailable === true && rivalAvailableAudit.route?.startAvailable === true, JSON.stringify({ status:rivalAvailableAudit.status, route:rivalAvailableAudit.route }));
    record('Town card exposes Start Rival Trace while other locked lanes stay locked', rivalAvailableAudit.routeButtons.includes('Start Rival Trace') && /Trace Locked/i.test(rivalAvailableAudit.text) === false && /Playable:/i.test(rivalAvailableAudit.text) && rivalRoutesInactive, JSON.stringify({ routeButtons:rivalAvailableAudit.routeButtons, route:rivalAvailableAudit.route, text:rivalAvailableAudit.text.slice(0, 500) }));

    const rivalStartedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.startRivalTrace ? api.startRivalTrace(S) : null;
      if (typeof save === 'function') save(S);
      if (typeof render === 'function') render();
      return {
        result,
        active: api.activeRivalTrace ? api.activeRivalTrace(S) : (api.activeRevisitRouteSummary ? api.activeRevisitRouteSummary(S) : null),
        status: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Rival Trace can start and creates an active archive trace state', !!rivalStartedAudit.result && rivalStartedAudit.status?.active === true && rivalStartedAudit.active?.routeKey === 'rival_trace_route' && /Resolve Trace/i.test(rivalStartedAudit.routeButtons.join(' ')), JSON.stringify(rivalStartedAudit));
    record('Active Rival Trace shows readable archive-trace flavor', /Active Memory:/i.test(rivalStartedAudit.text) && /Trace/i.test(rivalStartedAudit.text) && /Resolve Trace/i.test(rivalStartedAudit.text), JSON.stringify(rivalStartedAudit.text.slice(0, 500)));
    const rivalReloadStartAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      return {
        status: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        active: api.activeRivalTrace ? api.activeRivalTrace(S) : (api.activeRevisitRouteSummary ? api.activeRevisitRouteSummary(S) : null),
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null
      };
    })()`);
    record('Active Rival Trace persists before reload', rivalReloadStartAudit.status?.active === true && rivalReloadStartAudit.active?.routeKey === 'rival_trace_route' && rivalReloadStartAudit.revisitState?.rivalTrace?.active?.routeKey === 'rival_trace_route', JSON.stringify(rivalReloadStartAudit));
    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after Rival Trace active reload.');
    const rivalActiveReloadAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      return {
        status: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        active: api.activeRivalTrace ? api.activeRivalTrace(S) : (api.activeRevisitRouteSummary ? api.activeRevisitRouteSummary(S) : null),
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    record('Active Rival Trace persists after reload', rivalActiveReloadAudit.status?.active === true && rivalActiveReloadAudit.active?.routeKey === 'rival_trace_route' && rivalActiveReloadAudit.revisitState?.rivalTrace?.active?.routeKey === 'rival_trace_route' && rivalActiveReloadAudit.routeButtons.includes('Resolve Trace') && /Active/i.test(rivalActiveReloadAudit.text), JSON.stringify(rivalActiveReloadAudit));

    const rivalCompletedAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const result = api.completeRivalTrace ? api.completeRivalTrace(S) : null;
      if (typeof render === 'function') render();
      return {
        result,
        active: api.rivalTraceStatus ? api.rivalTraceStatus(S) : null,
        summary: api.activeRivalTrace ? api.activeRivalTrace(S) : (api.activeRevisitRouteSummary ? api.activeRevisitRouteSummary(S) : null),
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null
      };
    })()`);
    record('Rival Trace can complete and records archive history', !!rivalCompletedAudit.result && rivalCompletedAudit.active?.active === false && rivalCompletedAudit.active?.completed === true && Array.isArray(rivalCompletedAudit.revisitState?.rivalTrace?.history) && rivalCompletedAudit.revisitState.rivalTrace.history.length >= 1 && rivalCompletedAudit.revisitState.rivalTrace.completedKeys?.[rivalCompletedAudit.result?.completionKey || ''] === true, JSON.stringify(rivalCompletedAudit));
    record('Completion shows a recovered trace summary and reopens Rival Trace', /Trace recorded/i.test(rivalCompletedAudit.text) && rivalCompletedAudit.routeButtons.includes('Start Rival Trace') && /Recovered/i.test(rivalCompletedAudit.text), JSON.stringify(rivalCompletedAudit.text.slice(0, 500)));

    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after Famous Gear completion reload.');
    const reloadAudit = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : [];
      const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null;
      const famousGearRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'famous_gear_route') || null : null;
      return {
        status: api.trophyEchoStatus ? api.trophyEchoStatus(S) : null,
        summary: api.trophyEchoResultSummary ? api.trophyEchoResultSummary(S) : null,
        famousGearStatus: api.famousGearStatus ? api.famousGearStatus(S) : null,
        famousGearSummary: api.famousGearResultSummary ? api.famousGearResultSummary(S) : null,
        trophyRoute,
        famousGearRoute,
        routes,
        routeButtons: Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean),
        text: document.getElementById('revisitFoundationSlot')?.innerText || '',
        revisitState: S.player?.revisitState || null,
        debtSnapshot: JSON.stringify(S.player?.debtCollector || {}),
        talentSnapshot: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null })
      };
    })()`);
    const reloadRoutesInactive = Array.isArray(reloadAudit.routes) && reloadAudit.routes.filter(route => !['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'].includes(String(route?.key || ''))).every(route => route.playable !== true && route.entryAvailable !== true && route.completionAvailable !== true);
    record('Completion persists after save and reload', reloadAudit.status?.memoryMarks >= 1 && Array.isArray(reloadAudit.revisitState?.trophyEcho?.history) && reloadAudit.revisitState.trophyEcho.history.length >= 1 && reloadAudit.summary?.rewardMark >= 1 && reloadAudit.routeButtons.includes('Start Trophy Echo') && reloadAudit.famousGearStatus?.completed === true && reloadAudit.famousGearSummary?.summary === famousCompletedAudit.summary?.summary, JSON.stringify(reloadAudit));
    record('Reloaded state keeps Famous Gear recovered and Trophy Echo available', reloadAudit.famousGearStatus?.completed === true && reloadAudit.famousGearStatus?.active === false && /Recovered/i.test(reloadAudit.text) && reloadAudit.status?.available === true && reloadAudit.status?.active === false && reloadAudit.trophyRoute?.playable === true && reloadAudit.famousGearRoute?.status === 'Recovered' && reloadRoutesInactive, JSON.stringify(reloadAudit.text.slice(0, 500)));
    record('Famous Gear reload preserves history and does not alter Trophy Echo memory marks', Array.isArray(reloadAudit.revisitState?.famousGear?.history) && reloadAudit.revisitState.famousGear.history.length >= 1 && reloadAudit.revisitState.famousGear.lastResult?.summary === famousCompletedAudit.revisitState?.famousGear?.lastResult?.summary && reloadAudit.status?.memoryMarks === completedAudit.status?.memoryMarks, JSON.stringify({ famousGear:reloadAudit.revisitState?.famousGear, trophyStatus:reloadAudit.status }));
    record('No console or runtime errors', consoleErrors.length === 0 && runtimeErrors.length === 0, JSON.stringify({ consoleErrors, runtimeErrors }));
  } finally {
    if (client) {
      try { await client.send('Browser.close'); } catch {}
      client.close();
    }
    if (!await waitForProcessExit(chrome, 3000)) {
      chrome.kill();
      await waitForProcessExit(chrome, 3000);
    }
    await removeTempProfile(userDataDir);

    await new Promise(resolve => server.server.close(resolve));
  }
  const failed = results.filter(result => !result.ok);
  console.log(`\nRevisit route smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
