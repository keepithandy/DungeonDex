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
    client.on('Runtime.exceptionThrown', evt => runtimeErrors.push(evt.exceptionDetails?.text || evt.exceptionDetails?.exception?.description || 'Unknown runtime exception'));
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: server.url });
    const ready = await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000);
    if (!ready) throw new Error('DungeonDex runtime did not initialize.');
    await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitActivationSurfaceLockdown && !!window.DungeonDexEliteContracts && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after reload.');
    const audit = await evalByValue(client, `(() => { const api = window.DungeonDexEliteContracts || {}; const forbidden = ${JSON.stringify(FORBIDDEN)}; const before = JSON.stringify({ player:S.player, run:S.run }); const routes = api.revisitRoutePreviews ? api.revisitRoutePreviews(S) : []; const gates = api.revisitUnlockGates ? api.revisitUnlockGates(S) : []; const plan = api.revisitRouteActivationPlan ? api.revisitRouteActivationPlan(S) : null; const summary = api.revisitRouteActivationSummary ? api.revisitRouteActivationSummary(S) : null; const mirror = api.revisitRoutePreviewStateSummary ? api.revisitRoutePreviewStateSummary(S) : null; const firstLane = api.revisitFirstActivationLane ? api.revisitFirstActivationLane(S) : null; const secondLane = api.revisitSecondActivationLane ? api.revisitSecondActivationLane(S) : null; const checklist = api.revisitTrophyEchoActivationChecklist ? api.revisitTrophyEchoActivationChecklist(S) : null; const report = api.revisitActivationSurfaceLockdownReport ? api.revisitActivationSurfaceLockdownReport(S) : null; const after = JSON.stringify({ player:S.player, run:S.run }); const apiKeys = Object.keys(api); const forbiddenPresent = forbidden.filter(name => Object.prototype.hasOwnProperty.call(api, name)); const routeButtons = Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean); const routeAttrs = Array.from(document.querySelectorAll('#revisitFoundationSlot [onclick], #revisitFoundationSlot [data-action], #revisitFoundationSlot [data-route], #revisitFoundationSlot [data-enter], #revisitFoundationSlot a[href]')).length; const townButtons = Array.from(document.querySelectorAll('button')).map(button => String(button.textContent || '').trim()).filter(Boolean); const text = document.getElementById('revisitFoundationSlot')?.innerText || ''; const trophyRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null : null; const famousGearRoute = Array.isArray(routes) ? routes.find(route => String(route?.key || '') === 'famous_gear_route') || null : null; const previewContractSafe = Array.isArray(routes) && routes.every(route => !route || (typeof route === 'object' && route.locked === true && route.playable !== true && route.active !== true && route.entryAvailable !== true && route.startAvailable !== true && route.enterAvailable !== true && route.claimAvailable !== true && route.completeAvailable !== true && route.unlockAvailable !== true && route.rewardAvailable !== true && route.rewardTableAvailable !== true && route.claimRecordAvailable !== true && route.completionAvailable !== true && route.mutatesSave !== true)); const trophyLaneSafe = trophyRoute && trophyRoute.key === 'trophy_echo_route' && trophyRoute.title === 'Trophy Echo Route' && trophyRoute.locked === true && trophyRoute.playable !== true && trophyRoute.active !== true && trophyRoute.entryAvailable !== true && trophyRoute.startAvailable !== true && trophyRoute.enterAvailable !== true && trophyRoute.claimAvailable !== true && trophyRoute.completeAvailable !== true && trophyRoute.unlockAvailable !== true && trophyRoute.rewardAvailable !== true && trophyRoute.rewardTableAvailable !== true && trophyRoute.claimRecordAvailable !== true && trophyRoute.completionAvailable !== true && trophyRoute.mutatesSave !== true; const famousLaneSafe = famousGearRoute && famousGearRoute.key === 'famous_gear_route' && famousGearRoute.title === 'Famous Gear Memory Route' && famousGearRoute.locked === true && famousGearRoute.playable !== true && famousGearRoute.active !== true && famousGearRoute.entryAvailable !== true && famousGearRoute.startAvailable !== true && famousGearRoute.enterAvailable !== true && famousGearRoute.claimAvailable !== true && famousGearRoute.completeAvailable !== true && famousGearRoute.unlockAvailable !== true && famousGearRoute.rewardAvailable !== true && famousGearRoute.rewardTableAvailable !== true && famousGearRoute.claimRecordAvailable !== true && famousGearRoute.completionAvailable !== true && famousGearRoute.mutatesSave !== true; return { before, after, routes, gates, plan, summary, mirror, firstLane, secondLane, checklist, report, apiKeys, forbiddenPresent, routeButtons, routeAttrs, townButtons, text, trophyRoute, famousGearRoute, previewContractSafe, trophyLaneSafe, famousLaneSafe }; })()`);
    record('Forbidden Revisit exports are absent', audit.forbiddenPresent.length === 0, JSON.stringify(audit.forbiddenPresent));
    record('Lockdown report passes', audit.report?.apiSurfaceSafe === true && audit.report?.forbiddenExportsRemoved === true && audit.report?.liveEntry === false && audit.report?.rewardAvailable === false && audit.report?.completionAvailable === false && audit.report?.mutatesSave === false, JSON.stringify(audit.report));
    record('Route previews remain locked', Array.isArray(audit.routes) && audit.routes.length >= 3 && audit.routes.every(route => route.locked === true && route.playable !== true && route.active !== true), JSON.stringify(audit.routes?.map(route => ({ key:route.key, locked:route.locked }))));
    record('Activation plan remains inert', audit.plan?.status === 'Planning only' && audit.plan?.entryAvailable === false && audit.plan?.rewardAvailable === false && audit.plan?.completionAvailable === false && audit.plan?.primaryPath === 'Enter Dungeon / Continue Run', JSON.stringify(audit.plan));
    record('Activation summary remains preview-only', audit.summary?.currentPreviewOnly === true && audit.summary?.hasLiveEntry === false && audit.summary?.hasRewards === false && audit.summary?.hasCompletion === false, JSON.stringify(audit.summary));
    record('Preview mirror remains inert', audit.mirror?.currentPreviewOnly === true && audit.mirror?.hasLiveEntry === false && audit.mirror?.hasRewards === false && audit.mirror?.hasCompletion === false, JSON.stringify(audit.mirror));
    record('Revisit lanes stay planned-only', audit.firstLane?.laneKey === 'trophy-echo' && audit.firstLane?.hasLiveEntry === false && audit.secondLane?.laneKey === 'famous-gear-memory' && audit.secondLane?.hasLiveEntry === false, JSON.stringify({ firstLane:audit.firstLane, secondLane:audit.secondLane }));
    record('Trophy Echo activation checklist remains planning-only', audit.checklist?.checklistId === 'trophy_echo_activation_checklist_v1' && audit.checklist?.laneOrder === 1 && audit.checklist?.secondLaneKey === 'famous-gear-memory' && audit.checklist?.planningOnly === true && audit.checklist?.locked === true && audit.checklist?.readOnly === true && audit.checklist?.playable === false && audit.checklist?.active === false, JSON.stringify(audit.checklist));
    record('Trophy Echo checklist exposes no live controls or mutation', audit.checklist?.routeEntryAvailable === false && audit.checklist?.startButtonAvailable === false && audit.checklist?.rewardAvailable === false && audit.checklist?.completionAvailable === false && audit.checklist?.claimAvailable === false && audit.checklist?.mutatesSave === false && audit.checklist?.primaryPath === 'Enter Dungeon / Continue Run', JSON.stringify({ routeEntryAvailable:audit.checklist?.routeEntryAvailable, startButtonAvailable:audit.checklist?.startButtonAvailable, rewardAvailable:audit.checklist?.rewardAvailable, completionAvailable:audit.checklist?.completionAvailable, claimAvailable:audit.checklist?.claimAvailable, mutatesSave:audit.checklist?.mutatesSave, primaryPath:audit.checklist?.primaryPath }));
    record('Trophy Echo content seed exists and stays preview-only', audit.previewContractSafe && audit.trophyLaneSafe && audit.famousLaneSafe && String(audit.trophyRoute?.previewText || '').length > 0 && Array.isArray(audit.trophyRoute?.flavorHooks) && audit.trophyRoute.flavorHooks.length >= 3 && Array.isArray(audit.trophyRoute?.echoExamples) && audit.trophyRoute.echoExamples.length >= 3 && audit.firstLane?.laneKey === 'trophy-echo' && audit.firstLane?.locked === true && audit.firstLane?.readOnly === true && audit.firstLane?.hasRewards === false && audit.firstLane?.hasCompletion === false && audit.secondLane?.laneKey === 'famous-gear-memory' && audit.secondLane?.locked === true && audit.secondLane?.readOnly === true, JSON.stringify({ trophyRoute:audit.trophyRoute, famousGearRoute:audit.famousGearRoute, firstLane:audit.firstLane, secondLane:audit.secondLane }));
    record('Revisit helpers do not mutate state', audit.before === audit.after, JSON.stringify({ before:audit.before, after:audit.after }));
    record('Revisit town slot has no route controls', audit.routeButtons.length === 0 && audit.routeAttrs === 0, JSON.stringify({ routeButtons:audit.routeButtons, routeAttrs:audit.routeAttrs }));
    record('Primary dungeon entry path remains visible', audit.townButtons.some(label => /^(Enter Dungeon|Continue Run)$/i.test(label)), JSON.stringify(audit.townButtons));
    record('Revisit foundation slot remains empty', audit.text.trim() === '', JSON.stringify(audit.text.slice(0, 500)));
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
