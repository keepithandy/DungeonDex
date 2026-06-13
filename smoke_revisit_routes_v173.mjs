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
const consoleErrors = [];
const runtimeErrors = [];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function record(name, ok, detail = '') { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`); }
async function pickPort() { return await new Promise((resolve, reject) => { const server = net.createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(err => err ? reject(err) : resolve(port)); }); }); }
function mimeTypeFor(filePath) { const ext = path.extname(filePath).toLowerCase(); if (ext === '.html') return 'text/html; charset=utf-8'; if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8'; if (ext === '.css') return 'text/css; charset=utf-8'; if (ext === '.json') return 'application/json; charset=utf-8'; return 'application/octet-stream'; }
function safePathFromUrl(urlPath) { const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/'); const relative = clean === '/' ? '/index.html' : clean; const resolved = path.resolve(ROOT, `.${relative}`); if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`); return resolved; }
async function startStaticServer() { const server = http.createServer(async (req, res) => { try { const filePath = safePathFromUrl(req.url); const data = await readFile(filePath); res.writeHead(200, { 'Content-Type': mimeTypeFor(filePath), 'Cache-Control': 'no-store' }); res.end(data); } catch (err) { res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(err?.message || String(err)); } }); const port = await new Promise((resolve, reject) => { server.on('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); }); return { server, port, url: `http://127.0.0.1:${port}/index.html` }; }
async function waitForHttp(url, timeoutMs = 15000) { const deadline = Date.now() + timeoutMs; let lastError = null; while (Date.now() < deadline) { try { const res = await fetch(url, { cache: 'no-store' }); if (res.ok) return true; lastError = new Error(`HTTP ${res.status}`); } catch (err) { lastError = err; } await sleep(150); } throw lastError || new Error(`Timed out waiting for ${url}`); }
async function fetchJson(url) { const res = await fetch(url); return JSON.parse(await res.text()); }
async function startChrome(debugPort, userDataDir) { const chrome = spawn(CHROME_PATH, [`--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--user-data-dir=${userDataDir}`, 'about:blank'], { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true }); chrome.on('error', err => { throw err; }); return chrome; }
async function createCdpClient(wsUrl) { return await new Promise((resolve, reject) => { const ws = new WebSocket(wsUrl); const pending = new Map(); const listeners = new Map(); let nextId = 1; let opened = false; ws.onopen = () => { opened = true; resolve({ send(method, params = {}) { const id = nextId++; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolveSend, rejectSend) => pending.set(id, { resolve: resolveSend, reject: rejectSend })); }, on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); }, close() { ws.close(); } }); }; ws.onerror = err => { if (!opened) reject(err); }; ws.onmessage = event => { const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data)); if (msg.id) { const entry = pending.get(msg.id); if (!entry) return; pending.delete(msg.id); if (msg.error) entry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`)); else entry.resolve(msg.result || {}); return; } if (msg.method && listeners.has(msg.method)) for (const fn of listeners.get(msg.method)) fn(msg.params || {}); }; ws.onclose = () => { for (const entry of pending.values()) entry.reject(new Error('CDP connection closed')); pending.clear(); if (!opened) reject(new Error('CDP connection closed before open')); }; }); }
async function evalByValue(client, expression) { const result = await client.send('Runtime.evaluate', { expression: `(() => (${expression}))()`, awaitPromise: true, returnByValue: true, replMode: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Exception'); return result.result?.value; }
async function evalScript(client, script) { const result = await client.send('Runtime.evaluate', { expression: `(async () => { ${script} })()`, awaitPromise: true, returnByValue: true, replMode: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Exception'); return result.result?.value; }
async function waitForCondition(client, predicate, timeoutMs = 15000, pollMs = 150) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { try { if (await evalByValue(client, predicate)) return true; } catch {} await sleep(pollMs); } return false; }

async function main() {
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
    const ready = await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000);
    if (!ready) throw new Error('DungeonDex runtime did not initialize.');

    await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after reload.');

    const fresh = await evalByValue(client, `(() => {
      const before = JSON.stringify(S);
      const repaired = typeof normalizeRevisitState === 'function' ? normalizeRevisitState(undefined) : null;
      const api = window.DungeonDexEliteContracts || {};
      const hooks = typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(S) : null;
      const summary = typeof api.revisitCandidateSummary === 'function' ? api.revisitCandidateSummary(S) : null;
      const routes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : null;
      const routeSummary = typeof api.revisitRouteSummary === 'function' ? api.revisitRouteSummary(S) : null;
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : null;
      const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const after = JSON.stringify(S);
      const text = document.getElementById('revisitFoundationSlot')?.innerText || '';
      return {
        before,
        after,
        repaired,
        hooks,
        summary,
        routes,
        routeSummary,
        gates,
        gateSummary,
        text,
        hasCandidateLedger: text.includes('Earlier Dungeon Revisit'),
        hasPlannedRoutes: text.includes('Planned Return Routes'),
        hasLockedPreview: text.includes('Locked Preview'),
        hasRouteNotOpen: text.includes('Route not open yet'),
        hasEchoSource: text.includes('Echo source:'),
        hasReadOnlyPreview: text.includes('Read-only route preview'),
        hasUnlockCriteria: text.includes('Unlock Criteria'),
        hasPreviewOnly: text.includes('Preview only'),
        hasLockedGate: text.includes('Locked Gate'),
        hasGateRequirement: text.includes('Requirement:'),
        hasGateStatus: text.includes('Status: Preview only'),
        hasReadiness: text.includes('Signal strength') || text.includes('Faint Trace') || text.includes('Route Forming') || text.includes('Strong Echo') || text.includes('Not Open Yet')
      };
    })()`);
    record('normalizeRevisitState repairs missing revisitState', !!fresh.repaired && fresh.repaired.unlocked === false && Array.isArray(fresh.repaired.notedDistricts), JSON.stringify(fresh.repaired));
    record('revisit functions return stable shapes on fresh save', Array.isArray(fresh.hooks) && fresh.summary && fresh.routes && fresh.routeSummary && Array.isArray(fresh.gates) && fresh.gateSummary, JSON.stringify({ hooks: fresh.hooks?.length || 0, summary: fresh.summary, routes: fresh.routes?.length || 0, routeSummary: fresh.routeSummary, gates: fresh.gates?.length || 0, gateSummary: fresh.gateSummary }));
    record('Unlock gate helper exists and returns locked gate shapes', Array.isArray(fresh.gates) && fresh.gateSummary && fresh.gateSummary.total === fresh.gates.length && fresh.gateSummary.ready === 0 && fresh.gates.every(gate => gate.locked === true && gate.ready === false && typeof gate.key === 'string' && typeof gate.label === 'string' && typeof gate.gateType === 'string' && typeof gate.reason === 'string' && typeof gate.requirement === 'string' && typeof gate.progressLabel === 'string' && typeof gate.source === 'string'), JSON.stringify({ gates: fresh.gates?.slice(0, 3), gateSummary: fresh.gateSummary }));
    record('Town revisit slot renders candidate ledger and planned routes', fresh.hasCandidateLedger && fresh.hasPlannedRoutes && fresh.hasLockedPreview && fresh.hasRouteNotOpen && fresh.hasEchoSource && fresh.hasReadOnlyPreview && fresh.hasUnlockCriteria && fresh.hasPreviewOnly && fresh.hasLockedGate && fresh.hasGateRequirement && fresh.hasGateStatus && fresh.hasReadiness, fresh.text.slice(0, 500));
    record('Revisit helpers do not mutate state on fresh save', fresh.before === fresh.after, JSON.stringify({ before: fresh.before, after: fresh.after }));

    const malformed = await evalByValue(client, `(() => {
      S.player.revisitState = { unlocked: 'yes', lastViewedAt: 123, notedDistricts: ['A', '', null, 'B', 3, { x: 1 }] };
      const before = JSON.stringify(S.player.revisitState);
      const repaired = typeof normalizeRevisitState === 'function' ? normalizeRevisitState(S.player.revisitState) : null;
      const afterNormalize = JSON.stringify(S.player.revisitState);
      const api = window.DungeonDexEliteContracts || {};
      const hooks = typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(S) : [];
      const routes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : [];
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : [];
      const summary = typeof revisitCandidateSummary === 'function' ? revisitCandidateSummary(S) : null;
      const routeSummary = typeof revisitRouteSummary === 'function' ? revisitRouteSummary(S) : null;
      const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const text = document.getElementById('revisitFoundationSlot')?.innerText || '';
      return { before, afterNormalize, repaired, hooks, routes, gates, summary, routeSummary, gateSummary, text };
    })()`);
    record('normalizeRevisitState repairs malformed revisitState', malformed.repaired && typeof malformed.repaired.unlocked === 'boolean' && typeof malformed.repaired.lastViewedAt === 'string' && Array.isArray(malformed.repaired.notedDistricts), JSON.stringify(malformed.repaired));
    record('normalizeRevisitState leaves live state untouched when called directly', malformed.before === malformed.afterNormalize, JSON.stringify({ before: malformed.before, afterNormalize: malformed.afterNormalize }));
    record('Route previews stay locked/read-only', Array.isArray(malformed.routes) && malformed.routes.every(route => route.locked === true && typeof route.title === 'string' && typeof route.reason === 'string'), JSON.stringify(malformed.routes?.slice(0, 3)));
    record('Unlock gates tolerate malformed revisitState', Array.isArray(malformed.gates) && malformed.gateSummary && malformed.gateSummary.total === malformed.gates.length, JSON.stringify({ gates: malformed.gates?.slice(0, 3), gateSummary: malformed.gateSummary }));
    record('Unlock gates stay locked/read-only', Array.isArray(malformed.gates) && malformed.gates.every(gate => gate.locked === true && gate.ready === false && typeof gate.reason === 'string' && typeof gate.requirement === 'string' && typeof gate.progressLabel === 'string' && typeof gate.source === 'string'), JSON.stringify(malformed.gates?.slice(0, 3)));
    record('Unlock criteria appear as display strings only', Array.isArray(malformed.routes) && malformed.routes.every(route => Array.isArray(route.criteria) && route.criteria.every(text => typeof text === 'string' && text.trim().length > 0)), JSON.stringify(malformed.routes?.slice(0, 3)));
    record('Readiness labels appear as display strings only', Array.isArray(malformed.routes) && malformed.routes.every(route => typeof route.readiness === 'string' && /Faint Trace|Route Forming|Strong Echo|Not Open Yet/.test(route.readiness)), JSON.stringify(malformed.routes?.slice(0, 3)));
    record('Candidate and route outputs are display-safe', malformed.hooks.every(h => typeof h.label === 'string' && typeof h.detail === 'string' && typeof h.source === 'string') && malformed.routes.every(r => typeof r.title === 'string' && Array.isArray(r.hooks) && Array.isArray(r.criteria) && typeof r.readiness === 'string') && /Locked Preview/.test(malformed.text) && /Read-only route preview/.test(malformed.text) && /Unlock Criteria/.test(malformed.text) && /Signal strength/.test(malformed.text), JSON.stringify({ hookSample: malformed.hooks[0], routeSample: malformed.routes[0] }));

    const mutationCheck = await evalByValue(client, `(() => {
      const snapshot = JSON.stringify({
        player: {
          gold: S.player.gold,
          hp: S.player.hp,
          maxHp: S.player.maxHp,
          revisitState: S.player.revisitState,
          debtCollector: S.player.debtCollector,
          eliteContracts: S.player.eliteContracts,
          retiredRelics: S.player.retiredRelics
        },
        run: {
          active: S.run.active,
          floor: S.run.floor,
          monster: S.run.monster,
          choices: S.run.choices,
          combatLog: S.run.combatLog
        }
      });
      const api = window.DungeonDexEliteContracts || {};
      const hooks = revisitCandidateHooks(S);
      const summary = typeof api.revisitCandidateSummary === 'function' ? api.revisitCandidateSummary(S) : null;
      const routes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : [];
      const routeSummary = typeof api.revisitRouteSummary === 'function' ? api.revisitRouteSummary(S) : null;
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : [];
      const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const apiKeys = Object.keys(api);
      const buttons = Array.from(document.querySelectorAll('button')).map(button => String(button.textContent || '').trim()).filter(Boolean);
      const after = JSON.stringify({
        player: {
          gold: S.player.gold,
          hp: S.player.hp,
          maxHp: S.player.maxHp,
          revisitState: S.player.revisitState,
          debtCollector: S.player.debtCollector,
          eliteContracts: S.player.eliteContracts,
          retiredRelics: S.player.retiredRelics
        },
        run: {
          active: S.run.active,
          floor: S.run.floor,
          monster: S.run.monster,
          choices: S.run.choices,
          combatLog: S.run.combatLog
        }
      });
      return { snapshot, after, hooks, summary, routes, routeSummary, gates, gateSummary, apiKeys, buttons };
    })()`);
    record('Revisit summary helpers do not mutate player or run state', mutationCheck.snapshot === mutationCheck.after, JSON.stringify({ before: mutationCheck.snapshot, after: mutationCheck.after }));
    record('Unlock gate helpers do not mutate player or run state', mutationCheck.snapshot === mutationCheck.after && Array.isArray(mutationCheck.gates) && mutationCheck.gateSummary, JSON.stringify({ gateSummary: mutationCheck.gateSummary, gates: mutationCheck.gates?.slice(0, 3) }));
    record('Route previews remain inert and do not alter combat or movement state', mutationCheck.routes.every(route => route.locked === true) && mutationCheck.summary && mutationCheck.routeSummary && Array.isArray(mutationCheck.hooks), JSON.stringify({ summary: mutationCheck.summary, routeSummary: mutationCheck.routeSummary }));
    record('Readiness does not create active route state', mutationCheck.routes.every(route => route.locked === true && !route.entry && !route.reward && !route.teleport && !route.rerun && !route.completion && !route.scaling), JSON.stringify(mutationCheck.routes?.slice(0, 3)));
    record('Unlock gates remain inert and add no route mechanics', mutationCheck.gates.every(gate => gate.locked === true && gate.ready === false && !gate.entry && !gate.reward && !gate.teleport && !gate.rerun && !gate.completion && !gate.scaling), JSON.stringify(mutationCheck.gates?.slice(0, 3)));
    record('No revisit route entry API or button exists', mutationCheck.apiKeys.every(key => !/revisit.*(enter|start|claim|complete|reward|teleport|rerun|scale)/i.test(key)) && mutationCheck.buttons.every(label => !/revisit|return route|route preview|enter route/i.test(label)), JSON.stringify({ apiKeys: mutationCheck.apiKeys, buttons: mutationCheck.buttons }));

    const oldSave = await evalByValue(client, `(() => {
      const base = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})) || JSON.parse(JSON.stringify(S));
      delete base.player.revisitState;
      return base;
    })()`);
    await evalScript(client, `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(oldSave))}); return true;`);
    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForCondition(client, `!!window.DungeonDexScenarioDevTools && typeof render === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('DungeonDex runtime did not initialize after old-save reload.');
    const oldSaveResult = await evalByValue(client, `(() => {
      const repaired = typeof normalizeRevisitState === 'function' ? normalizeRevisitState(S.player.revisitState) : null;
      const hooks = typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(S) : [];
      const routes = typeof revisitRoutePreviews === 'function' ? revisitRoutePreviews(S) : [];
      const api = window.DungeonDexEliteContracts || {};
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : [];
      return { repaired, hooks, routes, gates };
    })()`);
    record('Old saves without revisitState are repaired safely', !!oldSaveResult.repaired && oldSaveResult.repaired.unlocked === false, JSON.stringify(oldSaveResult.repaired));
    record('Revisit hooks tolerate old saves without throwing', Array.isArray(oldSaveResult.hooks) && Array.isArray(oldSaveResult.routes) && Array.isArray(oldSaveResult.gates), JSON.stringify({ hooks: oldSaveResult.hooks.length, routes: oldSaveResult.routes.length, gates: oldSaveResult.gates.length }));

    record('No runtime or console errors', runtimeErrors.length === 0 && consoleErrors.length === 0, JSON.stringify({ runtimeErrors, consoleErrors }));
    console.log(JSON.stringify({ results, runtimeErrors, consoleErrors }, null, 2));
    if (results.some(r => !r.ok)) process.exitCode = 1;
  } finally {
    try { if (client) client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => server.server.close(() => resolve())); } catch {}
  }
}

main().catch(err => { console.error(err && err.stack ? err.stack : String(err)); process.exitCode = 1; });
