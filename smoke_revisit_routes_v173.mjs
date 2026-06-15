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
      const previews = typeof api.revisitUnlockPreview === 'function' ? api.revisitUnlockPreview(S) : null;
      const previewSummary = typeof api.revisitUnlockPreviewSummary === 'function' ? api.revisitUnlockPreviewSummary(S) : null;
      const gatesAgain = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : null;
      const gateSummaryAgain = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const previewsAgain = typeof api.revisitUnlockPreview === 'function' ? api.revisitUnlockPreview(S) : null;
      const previewSummaryAgain = typeof api.revisitUnlockPreviewSummary === 'function' ? api.revisitUnlockPreviewSummary(S) : null;
      const unknownGateMeta = typeof revisitUnlockGateMeta === 'function' ? revisitUnlockGateMeta('malformed_route_preview') : null;
      const routeCards = Array.from(document.querySelectorAll('.revisit-route-card')).map(card => card.innerText || '');
      const routeCardButtons = Array.from(document.querySelectorAll('.revisit-route-card button')).map(button => button.textContent || '');
      const after = JSON.stringify(S);
      const text = document.getElementById('revisitFoundationSlot')?.innerText || '';
      const trophyPreview = Array.isArray(previews) ? previews.find(entry => entry && entry.key === 'trophy_echo_route') : null;
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
        previews,
        previewSummary,
        gatesAgain,
        gateSummaryAgain,
        previewsAgain,
        previewSummaryAgain,
        unknownGateMeta,
        routeCards,
        routeCardButtons,
        trophyPreview,
        text,
        hasCandidateLedger: text.includes('Earlier Dungeon Revisit'),
        hasPlannedRoutes: text.includes('Planned Return Routes'),
        hasLockedPreview: text.includes('Locked Preview'),
        hasRouteNotOpen: text.includes('Still locked'),
        hasEchoSource: text.includes('Source:') || text.includes('Echo source:'),
        hasReadOnlyPreview: text.includes('Preview notes only'),
        hasUnlockCriteria: text.includes('Future Conditions'),
        hasPreviewOnly: text.includes('Preview notes only'),
        hasLockedGate: text.includes('Locked Gate'),
        hasGateRequirement: text.includes('Requirement:'),
        hasGateStatus: text.includes('Signal: Route Forming') || text.includes('Signal: Still locked') || text.includes('Signal:'),
        hasReadiness: text.includes('Still locked') || text.includes('Future Unlock Preview'),
        hasUnlockPreview: text.includes('Future Unlock Preview'),
        hasFutureCondition: text.includes('Future Conditions'),
        hasPreviewOnlySafety: text.includes('Preview only - route access is unavailable.'),
        hasRouteAccessUnavailable: text.includes('route access is unavailable'),
        hasSafetyLabel: text.includes('Safety:'),
        hasSignalLabel: text.includes('Signal:'),
        hasRouteCards: routeCards.length >= 3,
        hasTrophyEchoRow: routeCards.some(card => card.includes('Trophy Echo')),
        hasStillLockedRow: routeCards.some(card => card.includes('Still locked')),
        hasFutureUnlockRow: routeCards.some(card => card.includes('Future Unlock Preview')),
        routeCardButtons
      };
    })()`);
    record('normalizeRevisitState repairs missing revisitState', !!fresh.repaired && fresh.repaired.unlocked === false && Array.isArray(fresh.repaired.notedDistricts), JSON.stringify(fresh.repaired));
    record('revisit functions return stable shapes on fresh save', Array.isArray(fresh.hooks) && fresh.summary && fresh.routes && fresh.routeSummary && Array.isArray(fresh.gates) && fresh.gateSummary, JSON.stringify({ hooks: fresh.hooks?.length || 0, summary: fresh.summary, routes: fresh.routes?.length || 0, routeSummary: fresh.routeSummary, gates: fresh.gates?.length || 0, gateSummary: fresh.gateSummary }));
    record('Unlock gate helper exists and returns locked gate shapes', Array.isArray(fresh.gates) && fresh.gateSummary && fresh.gateSummary.total === fresh.gates.length && fresh.gateSummary.ready === 0 && fresh.gateSummary.playable === 0 && fresh.gateSummary.diagnosticOnly === true && fresh.gateSummary.accessAvailable === false && typeof fresh.gateSummary.progressAverage === 'number' && typeof fresh.gateSummary.progressNoted === 'number' && fresh.gates.every(gate => gate.locked === true && gate.ready === false && gate.playable === false && typeof gate.key === 'string' && typeof gate.label === 'string' && typeof gate.gateType === 'string' && typeof gate.reason === 'string' && typeof gate.requirement === 'string' && typeof gate.progressLabel === 'string' && typeof gate.diagnosticLabel === 'string' && typeof gate.diagnosticDetail === 'string' && typeof gate.accessLabel === 'string' && /route access is unavailable/i.test(gate.accessLabel) && !/\b(ready|open|available|unlocked|usable)\b/i.test(gate.progressLabel) && !/\b(ready|open|available|unlocked|usable)\b/i.test(gate.diagnosticDetail) && typeof gate.progressCurrent === 'number' && typeof gate.progressRequired === 'number' && typeof gate.progressPercent === 'number' && Array.isArray(gate.signals) && gate.progressRequired >= 1 && gate.progressCurrent >= 0 && gate.progressPercent >= 0 && gate.progressPercent <= 100), JSON.stringify({ gates: fresh.gates?.slice(0, 3), gateSummary: fresh.gateSummary }));
    record('Unlock gate helper returns equivalent repeated output', JSON.stringify(fresh.gates) === JSON.stringify(fresh.gatesAgain) && JSON.stringify(fresh.gateSummary) === JSON.stringify(fresh.gateSummaryAgain), JSON.stringify({ first: fresh.gates?.slice(0, 3), second: fresh.gatesAgain?.slice(0, 3), summary: fresh.gateSummary, repeatedSummary: fresh.gateSummaryAgain }));
    record('Unlock preview helper exists and returns stable output', Array.isArray(fresh.previews) && fresh.previewSummary && fresh.previewSummary.total === fresh.previews.length && fresh.previewSummary.locked === fresh.previews.length && fresh.previewSummary.playable === 0 && JSON.stringify(fresh.previews) === JSON.stringify(fresh.previewsAgain) && JSON.stringify(fresh.previewSummary) === JSON.stringify(fresh.previewSummaryAgain), JSON.stringify({ previews: fresh.previews?.slice(0, 3), previewSummary: fresh.previewSummary, repeatedPreviewSummary: fresh.previewSummaryAgain }));
    record('Unlock gate keys labels and types are stable display values', Array.isArray(fresh.gates) && fresh.gates.every(gate => String(gate.key || '').trim().length > 0 && String(gate.label || '').trim().length > 0 && ['trophy', 'famousGear', 'rival', 'debt', 'board', 'unknown'].includes(gate.gateType)), JSON.stringify(fresh.gates?.slice(0, 3)));
    record('Unknown gate types fall back safely', fresh.unknownGateMeta && fresh.unknownGateMeta.gateType === 'unknown' && typeof fresh.unknownGateMeta.gateLabel === 'string' && typeof fresh.unknownGateMeta.reason === 'string' && typeof fresh.unknownGateMeta.requirement === 'string', JSON.stringify(fresh.unknownGateMeta));
    record('Town revisit slot renders candidate ledger and planned routes', fresh.hasCandidateLedger && fresh.hasPlannedRoutes && fresh.hasLockedPreview && fresh.hasPreviewOnly && fresh.hasRouteCards && fresh.hasTrophyEchoRow && fresh.hasStillLockedRow && fresh.hasFutureUnlockRow && Array.isArray(fresh.routeCardButtons) && fresh.routeCardButtons.every(btn => /Route Locked/i.test(btn)), JSON.stringify({ text: fresh.text.slice(0, 500), routeCards: fresh.routeCards, routeCardButtons: fresh.routeCardButtons }));
    record('Revisit helpers do not mutate state on fresh save', fresh.before === fresh.after, JSON.stringify({ before: fresh.before, after: fresh.after }));

    const edgeCases = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const cases = [
        { name: 'null state', state: null },
        { name: 'missing player', state: {} },
        { name: 'missing revisitState', state: { player: {}, run: {} } },
        { name: 'malformed revisitState', state: { player: { revisitState: 'bad', eliteContracts: 'bad', eliteTrophies: 'bad', retiredRelics: 'bad', debtCollector: 'bad' }, run: 'bad' } }
      ];
      return cases.map(testCase => {
        let before = '';
        let after = '';
        try { before = JSON.stringify(testCase.state); } catch (err) { before = '[unserializable]'; }
        try {
          const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(testCase.state) : null;
          const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(testCase.state) : null;
          const repeat = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(testCase.state) : null;
          try { after = JSON.stringify(testCase.state); } catch (err) { after = '[unserializable]'; }
          return {
            name: testCase.name,
            ok: Array.isArray(gates) && gateSummary && gateSummary.total === gates.length,
            gates,
            gateSummary,
            equivalent: JSON.stringify(gates) === JSON.stringify(repeat),
            notMutated: before === after,
            lockedOnly: Array.isArray(gates) && gates.every(gate => gate.locked === true && gate.ready === false),
            before,
            after
          };
        } catch (err) {
          try { after = JSON.stringify(testCase.state); } catch (inner) { after = '[unserializable]'; }
          return { name: testCase.name, ok: false, error: String(err && err.message ? err.message : err), before, after };
        }
      });
    })()`);
    record('Unlock gates tolerate missing and malformed state', Array.isArray(edgeCases) && edgeCases.every(entry => entry.ok && entry.equivalent && entry.notMutated && entry.lockedOnly), JSON.stringify(edgeCases.map(entry => ({ name: entry.name, ok: entry.ok, equivalent: entry.equivalent, notMutated: entry.notMutated, lockedOnly: entry.lockedOnly, total: entry.gateSummary?.total || 0, error: entry.error || '' }))));
    record('Unlock gates tolerate missing player', !!edgeCases.find(entry => entry.name === 'missing player' && entry.ok && entry.notMutated), JSON.stringify(edgeCases.find(entry => entry.name === 'missing player')));
    record('Unlock gates tolerate missing revisitState', !!edgeCases.find(entry => entry.name === 'missing revisitState' && entry.ok && entry.notMutated), JSON.stringify(edgeCases.find(entry => entry.name === 'missing revisitState')));
    record('Unlock gates tolerate malformed state without playable output', !!edgeCases.find(entry => entry.name === 'malformed revisitState' && entry.ok && entry.lockedOnly && entry.gateSummary?.ready === 0), JSON.stringify(edgeCases.find(entry => entry.name === 'malformed revisitState')));

    const malformed = await evalByValue(client, `(() => {
      S.player.revisitState = { unlocked: 'yes', lastViewedAt: 123, notedDistricts: ['A', '', null, 'B', 3, { x: 1 }] };
      const before = JSON.stringify(S.player.revisitState);
      const repaired = typeof normalizeRevisitState === 'function' ? normalizeRevisitState(S.player.revisitState) : null;
      const afterNormalize = JSON.stringify(S.player.revisitState);
      const api = window.DungeonDexEliteContracts || {};
      const hooks = typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(S) : [];
      const routes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : [];
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : [];
      const previews = typeof api.revisitUnlockPreview === 'function' ? api.revisitUnlockPreview(S) : [];
      const summary = typeof revisitCandidateSummary === 'function' ? revisitCandidateSummary(S) : null;
      const routeSummary = typeof revisitRouteSummary === 'function' ? revisitRouteSummary(S) : null;
      const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const previewSummary = typeof api.revisitUnlockPreviewSummary === 'function' ? api.revisitUnlockPreviewSummary(S) : null;
      const text = document.getElementById('revisitFoundationSlot')?.innerText || '';
      const routeCards = Array.from(document.querySelectorAll('#revisitFoundationSlot .revisit-route-card')).map(card => card.innerText || '');
      const routeSlotButtons = Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean);
      return { before, afterNormalize, repaired, hooks, routes, gates, previews, summary, routeSummary, gateSummary, previewSummary, text, routeCards, routeSlotButtons };
    })()`);
    record('normalizeRevisitState repairs malformed revisitState', malformed.repaired && typeof malformed.repaired.unlocked === 'boolean' && typeof malformed.repaired.lastViewedAt === 'string' && Array.isArray(malformed.repaired.notedDistricts), JSON.stringify(malformed.repaired));
    record('normalizeRevisitState leaves live state untouched when called directly', malformed.before === malformed.afterNormalize, JSON.stringify({ before: malformed.before, afterNormalize: malformed.afterNormalize }));
    record('Route previews stay locked/read-only', Array.isArray(malformed.routes) && malformed.routes.every(route => route.locked === true && typeof route.title === 'string' && typeof route.reason === 'string'), JSON.stringify(malformed.routes?.slice(0, 3)));
    record('Unlock gates tolerate malformed revisitState', Array.isArray(malformed.gates) && malformed.gateSummary && malformed.gateSummary.total === malformed.gates.length, JSON.stringify({ gates: malformed.gates?.slice(0, 3), gateSummary: malformed.gateSummary }));
    record('Unlock gates stay locked/read-only', Array.isArray(malformed.gates) && malformed.gates.every(gate => gate.locked === true && gate.ready === false && gate.playable === false && typeof gate.reason === 'string' && typeof gate.requirement === 'string' && typeof gate.progressLabel === 'string' && typeof gate.diagnosticLabel === 'string' && typeof gate.diagnosticDetail === 'string' && typeof gate.accessLabel === 'string' && /route access is unavailable/i.test(gate.accessLabel)), JSON.stringify(malformed.gates?.slice(0, 3)));
    record('Unlock previews stay locked/read-only', Array.isArray(malformed.previews) && malformed.previews.every(preview => preview.locked === true && preview.playable === false && typeof preview.previewState === 'string' && typeof preview.previewLabel === 'string' && typeof preview.previewReason === 'string' && typeof preview.previewRequirement === 'string' && typeof preview.previewSafety === 'string'), JSON.stringify(malformed.previews?.slice(0, 3)));
    record('Unlock criteria appear as display strings only', Array.isArray(malformed.routes) && malformed.routes.every(route => Array.isArray(route.criteria) && route.criteria.every(text => typeof text === 'string' && text.trim().length > 0)), JSON.stringify(malformed.routes?.slice(0, 3)));
    record('Readiness labels appear as display strings only', Array.isArray(malformed.routes) && malformed.routes.every(route => typeof route.readiness === 'string' && /Faint Trace|Route Forming|Strong Echo|Still locked|Future Unlock Preview/.test(route.readiness)), JSON.stringify(malformed.routes?.slice(0, 3)));
    record(
      'Candidate and route outputs are display-safe',
      malformed.hooks.every(h =>
        typeof h.label === 'string' &&
        typeof h.detail === 'string' &&
        typeof h.source === 'string'
      ) &&
      malformed.routes.every(r =>
        typeof r.title === 'string' &&
        Array.isArray(r.hooks) &&
        Array.isArray(r.criteria) &&
        typeof r.readiness === 'string'
      ) &&
      malformed.previews.every(preview =>
        typeof preview.key === 'string' &&
        typeof preview.previewState === 'string' &&
        typeof preview.previewLabel === 'string' &&
        typeof preview.previewReason === 'string' &&
        typeof preview.previewRequirement === 'string' &&
        typeof preview.previewSafety === 'string' &&
        preview.locked === true &&
        preview.playable === false &&
        !/(enter|entry|start|travel|begin|claim|complete|available now|ready to enter)/i.test(preview.previewSafety)
      ) &&
      malformed.previewSummary &&
      malformed.previewSummary.playable === 0 &&
      malformed.previewSummary.locked === malformed.previewSummary.total &&
      malformed.previewSummary.preview >= 1 &&
      /Locked Preview/.test(malformed.text) &&
      /Preview notes only/.test(malformed.text) &&
      /Future Conditions/.test(malformed.text) &&
      /Requirement:/.test(malformed.text) &&
      /Safety:/.test(malformed.text),
      JSON.stringify({
        hookSample: malformed.hooks[0],
        routeSample: malformed.routes[0],
        previewSample: malformed.previews[0],
        previewSummary: malformed.previewSummary
      })
    );

    const activationTests = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const routes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : [];
      const testRouteKey = routes.length > 0 ? String(routes[0].key || '') : 'trophy_echo_route';
      const beforeState = JSON.stringify({
        revisitState: S.player.revisitState,
        depth: S.player.depth,
        gold: S.player.gold,
        eliteContracts: S.player.eliteContracts,
        floor: S.run.floor,
        active: S.run.active
      });
      const canStart1 = typeof api.canStartRevisitRoute === 'function' ? api.canStartRevisitRoute(S, testRouteKey) : null;
      const canStart2 = typeof api.canStartRevisitRoute === 'function' ? api.canStartRevisitRoute(S, '') : null;
      const canStart3 = typeof api.canStartRevisitRoute === 'function' ? api.canStartRevisitRoute(null, testRouteKey) : null;
      const activeSummary1 = typeof api.activeRevisitRouteSummary === 'function' ? api.activeRevisitRouteSummary(S) : null;
      const startResult1 = typeof api.startRevisitRoute === 'function' ? api.startRevisitRoute(S, testRouteKey) : null;
      const startResult2 = typeof api.startRevisitRoute === 'function' ? api.startRevisitRoute(S, '') : null;
      const activeSummary2 = typeof api.activeRevisitRouteSummary === 'function' ? api.activeRevisitRouteSummary(S) : null;
      const afterState = JSON.stringify({
        revisitState: S.player.revisitState,
        depth: S.player.depth,
        gold: S.player.gold,
        eliteContracts: S.player.eliteContracts,
        floor: S.run.floor,
        active: S.run.active
      });
      return {
        testRouteKey,
        canStart1,
        canStart2,
        canStart3,
        activeSummary1,
        startResult1,
        startResult2,
        activeSummary2,
        beforeState,
        afterState,
        stateUnchanged: beforeState === afterState
      };
    })()`);
    record('canStartRevisitRoute returns false for locked routes on fresh save', activationTests.canStart1 === false, JSON.stringify({ canStart: activationTests.canStart1, route: activationTests.testRouteKey }));
    record('canStartRevisitRoute returns false for empty/missing route keys', activationTests.canStart2 === false, JSON.stringify({ canStart: activationTests.canStart2 }));
    record('canStartRevisitRoute returns false for null state', activationTests.canStart3 === false, JSON.stringify({ canStart: activationTests.canStart3 }));
    record('activeRevisitRouteSummary returns null when no route is active', activationTests.activeSummary1 === null, JSON.stringify({ summary: activationTests.activeSummary1 }));
    record('startRevisitRoute returns null for locked routes', activationTests.startResult1 === null, JSON.stringify({ result: activationTests.startResult1, route: activationTests.testRouteKey }));
    record('startRevisitRoute returns null for empty route keys', activationTests.startResult2 === null, JSON.stringify({ result: activationTests.startResult2 }));
    record('activeRevisitRouteSummary still returns null after failed start attempt', activationTests.activeSummary2 === null, JSON.stringify({ summary: activationTests.activeSummary2 }));
    record('Activation foundation does not mutate main progression on fresh save', activationTests.stateUnchanged === true, JSON.stringify({ before: activationTests.beforeState, after: activationTests.afterState }));

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
      const candidateObjectsBefore = JSON.stringify(hooks);
      const routeObjectsBefore = JSON.stringify(routes);
      const gates = typeof api.revisitUnlockGates === 'function' ? api.revisitUnlockGates(S) : [];
      const gateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(S) : null;
      const previews = typeof api.revisitUnlockPreview === 'function' ? api.revisitUnlockPreview(S) : [];
      const previewSummary = typeof api.revisitUnlockPreviewSummary === 'function' ? api.revisitUnlockPreviewSummary(S) : null;
      const candidateObjectsAfter = JSON.stringify(hooks);
      const routeObjectsAfter = JSON.stringify(routes);
      const previewObjectsBefore = JSON.stringify(previews);
      const previewObjectsAfter = JSON.stringify(previews);
      const apiKeys = Object.keys(api);
      const buttons = Array.from(document.querySelectorAll('button')).map(button => String(button.textContent || '').trim()).filter(Boolean);
      const routeSlotButtons = Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean);
      const routeCards = Array.from(document.querySelectorAll('#revisitFoundationSlot .revisit-route-card')).map(card => card.innerText || '');
      const routeSlotText = document.getElementById('revisitFoundationSlot')?.innerText || '';
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
      return { snapshot, after, hooks, summary, routes, routeSummary, gates, gateSummary, previews, previewSummary, candidateObjectsBefore, candidateObjectsAfter, routeObjectsBefore, routeObjectsAfter, previewObjectsBefore, previewObjectsAfter, apiKeys, buttons, routeSlotButtons, routeCards, routeSlotText };
    })()`);
    record('Revisit summary helpers do not mutate player or run state', mutationCheck.snapshot === mutationCheck.after, JSON.stringify({ before: mutationCheck.snapshot, after: mutationCheck.after }));
    record('Unlock gate helpers do not mutate player or run state', mutationCheck.snapshot === mutationCheck.after && Array.isArray(mutationCheck.gates) && mutationCheck.gateSummary, JSON.stringify({ gateSummary: mutationCheck.gateSummary, gates: mutationCheck.gates?.slice(0, 3) }));
    record('Unlock preview helpers do not mutate player or run state', mutationCheck.snapshot === mutationCheck.after && Array.isArray(mutationCheck.previews) && mutationCheck.previewSummary, JSON.stringify({ previewSummary: mutationCheck.previewSummary, previews: mutationCheck.previews?.slice(0, 3) }));
    record('Unlock gate helpers do not mutate candidate objects', mutationCheck.candidateObjectsBefore === mutationCheck.candidateObjectsAfter, JSON.stringify({ before: mutationCheck.candidateObjectsBefore, after: mutationCheck.candidateObjectsAfter }));
    record('Unlock gate helpers do not mutate route preview objects', mutationCheck.routeObjectsBefore === mutationCheck.routeObjectsAfter, JSON.stringify({ before: mutationCheck.routeObjectsBefore, after: mutationCheck.routeObjectsAfter }));
    record('Unlock preview helpers do not mutate preview objects', mutationCheck.previewObjectsBefore === mutationCheck.previewObjectsAfter, JSON.stringify({ before: mutationCheck.previewObjectsBefore, after: mutationCheck.previewObjectsAfter }));
    record('Route previews remain inert and do not alter combat or movement state', mutationCheck.routes.every(route => route.locked === true) && mutationCheck.summary && mutationCheck.routeSummary && Array.isArray(mutationCheck.hooks), JSON.stringify({ summary: mutationCheck.summary, routeSummary: mutationCheck.routeSummary }));
    record('Readiness does not create active route state', mutationCheck.routes.every(route => route.locked === true && !route.entry && !route.reward && !route.teleport && !route.rerun && !route.completion && !route.scaling), JSON.stringify(mutationCheck.routes?.slice(0, 3)));
    record('Trophy Echo exposes preview copy without becoming playable', Array.isArray(mutationCheck.previews) && mutationCheck.previews.every(preview => preview.locked === true && preview.playable === false) && !!mutationCheck.previews.find(preview => preview.key === 'trophy_echo_route' && preview.previewState === 'preview' && preview.previewLabel === 'Future Unlock Preview' && /future boss history/i.test(preview.previewReason || '') && preview.previewRequirement === 'Build more boss history.' && preview.previewSafety === 'Preview only - route access is unavailable.') && !!String(mutationCheck.routeSlotText || '').includes('Future Unlock Preview') && !!String(mutationCheck.routeSlotText || '').includes('Still locked') && !!String(mutationCheck.routeSlotText || '').includes('Safety:'), JSON.stringify({ trophyPreview: mutationCheck.previews?.find(preview => preview.key === 'trophy_echo_route'), previewSummary: mutationCheck.previewSummary, routeSlotText: String(mutationCheck.routeSlotText || '').slice(0, 500) }));
    record('Unlock gates remain inert and add no route mechanics', mutationCheck.gates.every(gate => gate.locked === true && gate.ready === false && gate.playable === false && !gate.entry && !gate.enter && !gate.start && !gate.travel && !gate.begin && !gate.action && !gate.enabled && !gate.unlocked && !gate.available && !gate.reward && !gate.rewards && !gate.teleport && !gate.rerun && !gate.combat && !gate.completion && !gate.complete && !gate.scaling && !gate.scale), JSON.stringify(mutationCheck.gates?.slice(0, 3)));
    record('Unlock gate summaries cannot imply playable route access', mutationCheck.gateSummary && mutationCheck.gateSummary.total === mutationCheck.gateSummary.locked && mutationCheck.gateSummary.ready === 0 && mutationCheck.gateSummary.playable === 0 && mutationCheck.gateSummary.diagnosticOnly === true && mutationCheck.gateSummary.accessAvailable === false && typeof mutationCheck.gateSummary.progressAverage === 'number' && typeof mutationCheck.gateSummary.progressNoted === 'number' && !mutationCheck.gateSummary.unlocked && !mutationCheck.gateSummary.available && !mutationCheck.gateSummary.entry && !mutationCheck.gateSummary.reward && !mutationCheck.gateSummary.completion && !mutationCheck.gateSummary.scaling, JSON.stringify(mutationCheck.gateSummary));
    record('Revisit gate checkpoint remains locked diagnostic-only', Array.isArray(mutationCheck.gates) && mutationCheck.gates.every(gate => gate.locked === true && gate.ready === false && gate.playable === false) && mutationCheck.gateSummary && mutationCheck.gateSummary.ready === 0 && mutationCheck.gateSummary.playable === 0 && mutationCheck.gateSummary.diagnosticOnly === true && mutationCheck.gateSummary.accessAvailable === false && mutationCheck.previewSummary && mutationCheck.previewSummary.playable === 0, JSON.stringify({ gates: mutationCheck.gates?.map(gate => ({ key: gate.key, locked: gate.locked, ready: gate.ready, playable: gate.playable })), gateSummary: mutationCheck.gateSummary, previewSummary: mutationCheck.previewSummary }));
    record('No revisit route entry API or button exists', mutationCheck.apiKeys.every(key => !/revisit.*(enter|entry|start|travel|begin|claim|complete|reward|teleport|rerun|scale|activate|launch)/i.test(key)) && mutationCheck.buttons.every(label => !/revisit|return route|route preview|enter route/i.test(label)), JSON.stringify({ apiKeys: mutationCheck.apiKeys, buttons: mutationCheck.buttons }));
    record('Route rows expose progress and safety copy', Array.isArray(mutationCheck.routeCards) && mutationCheck.routeCards.length >= 3 && Array.isArray(mutationCheck.routeSlotButtons) && mutationCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)), JSON.stringify({ routeSlotButtons: mutationCheck.routeSlotButtons, routeCards: mutationCheck.routeCards?.slice(0, 3) }));
    record('Route cards expose no Enter Start Travel or Begin action', Array.isArray(mutationCheck.routeSlotButtons) && mutationCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)) && !/(Enter|Start|Travel|Begin)\\s+(Revisit|Route|Return)/i.test(mutationCheck.routeSlotText || ''), JSON.stringify({ routeSlotButtons: mutationCheck.routeSlotButtons, routeSlotText: String(mutationCheck.routeSlotText || '').slice(0, 500) }));

    const trophyPlanCheck = await evalByValue(client, `(() => {
      const api = window.DungeonDexEliteContracts || {};
      const snapshot = JSON.stringify({
        player: {
          bossTrophies: S.player.bossTrophies,
          bossTrophyRecords: S.player.bossTrophyRecords,
          eliteTrophies: S.player.eliteTrophies,
          revisitState: S.player.revisitState
        },
        run: {
          active: S.run.active,
          floor: S.run.floor,
          monster: S.run.monster,
          choices: S.run.choices,
          combatLog: S.run.combatLog
        }
      });
      const plan = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(S) : null;
      const planAgain = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(S) : null;
      const planGlobal = typeof revisitTrophyEchoRulePlan === 'function' ? revisitTrophyEchoRulePlan(S) : null;
      const summary = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(S) : null;
      const summaryAgain = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(S) : null;
      const highState = {
        player: {
          bossTrophies: ['a', 'b', 'c', 'd'],
          bossTrophyRecords: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
          eliteTrophies: { collected: { e1: { id: 'e1' }, e2: { id: 'e2' } } },
          revisitState: { unlocked: true }
        },
        run: { active: false, floor: 1 }
      };
      const highPlan = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(highState) : null;
      const highSummary = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(highState) : null;
      const malformedState = {
        player: {
          bossTrophies: 'bad',
          bossTrophyRecords: 'bad',
          eliteTrophies: 'bad',
          revisitState: 'bad'
        },
        run: 'bad'
      };
      let malformedPlan = null;
      let malformedSummary = null;
      let malformedError = '';
      try {
        malformedPlan = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(malformedState) : null;
        malformedSummary = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(malformedState) : null;
      } catch (err) {
        malformedError = String(err && err.message ? err.message : err);
      }
      const after = JSON.stringify({
        player: {
          bossTrophies: S.player.bossTrophies,
          bossTrophyRecords: S.player.bossTrophyRecords,
          eliteTrophies: S.player.eliteTrophies,
          revisitState: S.player.revisitState
        },
        run: {
          active: S.run.active,
          floor: S.run.floor,
          monster: S.run.monster,
          choices: S.run.choices,
          combatLog: S.run.combatLog
        }
      });
      const routeSlot = document.getElementById('revisitFoundationSlot');
      const routeSlotText = routeSlot?.innerText || '';
      const routeSlotButtons = Array.from(document.querySelectorAll('#revisitFoundationSlot button')).map(button => String(button.textContent || '').trim()).filter(Boolean);
      const routeSlotActionAttrs = Array.from(document.querySelectorAll('#revisitFoundationSlot [data-action], #revisitFoundationSlot [data-route-action], #revisitFoundationSlot [onclick], #revisitFoundationSlot a[href]')).map(node => ({
        tag: node.tagName,
        text: String(node.textContent || '').trim(),
        action: node.getAttribute('data-action') || '',
        routeAction: node.getAttribute('data-route-action') || '',
        onclick: node.getAttribute('onclick') || '',
        href: node.getAttribute('href') || ''
      }));
      const apiKeys = Object.keys(api);
      const trophyEdgeInputs = [
        { name: 'null state', state: null },
        { name: 'missing player', state: {} },
        { name: 'empty player', state: { player: {} } },
        { name: 'malformed trophy arrays', state: { player: { bossTrophies: 'bad', eliteTrophies: 'bad', bossTrophyRecords: 'bad' } } },
        { name: 'mixed trophy arrays', state: { player: { bossTrophies: [null, 'x', 1, {}, { id: 'boss-a' }], eliteTrophies: { a: true, b: {}, c: null }, bossTrophyRecords: [null, {}, { bossKey: 'boss-b' }] } } },
        { name: 'high boss history', state: { player: { bossTrophies: new Array(50).fill({ bossKey: 'echo' }), eliteTrophies: { a: {}, b: {}, c: {}, d: {} }, bossTrophyRecords: new Array(50).fill({ bossKey: 'echo' }) } } }
      ];
      const edgeCases = trophyEdgeInputs.map(testCase => {
        let edgePlan = null;
        let edgePlanAgain = null;
        let edgeSummary = null;
        let edgeSummaryAgain = null;
        let edgeError = '';
        const before = (() => { try { return JSON.stringify(testCase.state); } catch (_) { return '[unserializable]'; } })();
        try {
          edgePlan = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(testCase.state) : null;
          edgePlanAgain = typeof api.revisitTrophyEchoRulePlan === 'function' ? api.revisitTrophyEchoRulePlan(testCase.state) : null;
          edgeSummary = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(testCase.state) : null;
          edgeSummaryAgain = typeof api.revisitTrophyEchoRuleSummary === 'function' ? api.revisitTrophyEchoRuleSummary(testCase.state) : null;
        } catch (err) {
          edgeError = String(err && err.message ? err.message : err);
        }
        const afterEdge = (() => { try { return JSON.stringify(testCase.state); } catch (_) { return '[unserializable]'; } })();
        return {
          name: testCase.name,
          before,
          after: afterEdge,
          plan: edgePlan,
          summary: edgeSummary,
          deterministic: JSON.stringify(edgePlan) === JSON.stringify(edgePlanAgain) && JSON.stringify(edgeSummary) === JSON.stringify(edgeSummaryAgain),
          notMutated: before === afterEdge,
          error: edgeError
        };
      });
      const highEdge = edgeCases.find(entry => entry.name === 'high boss history') || {};
      const highGateSummary = typeof api.revisitUnlockGateSummary === 'function' ? api.revisitUnlockGateSummary(highState) : null;
      const highPreviewSummary = typeof api.revisitUnlockPreviewSummary === 'function' ? api.revisitUnlockPreviewSummary(highState) : null;
      return { snapshot, after, plan, planAgain, planGlobal, summary, summaryAgain, highPlan, highSummary, malformedPlan, malformedSummary, malformedError, routeSlotText, routeSlotButtons, routeSlotActionAttrs, apiKeys, edgeCases, highEdge, highGateSummary, highPreviewSummary };
    })()`);
    record('Trophy Echo planning helpers exist and are deterministic', trophyPlanCheck.plan && trophyPlanCheck.summary && JSON.stringify(trophyPlanCheck.plan) === JSON.stringify(trophyPlanCheck.planAgain) && JSON.stringify(trophyPlanCheck.plan) === JSON.stringify(trophyPlanCheck.planGlobal) && JSON.stringify(trophyPlanCheck.summary) === JSON.stringify(trophyPlanCheck.summaryAgain), JSON.stringify({ plan: trophyPlanCheck.plan, summary: trophyPlanCheck.summary }));
    record('Trophy Echo rule plan stays locked inactive and non-playable', trophyPlanCheck.plan?.key === 'trophy_echo_route' && trophyPlanCheck.plan.locked === true && trophyPlanCheck.plan.ready === false && trophyPlanCheck.plan.playable === false && trophyPlanCheck.plan.active === false && trophyPlanCheck.plan.accessAvailable === false && trophyPlanCheck.plan.rewardAvailable === false && /route access is unavailable/i.test(trophyPlanCheck.plan.routeAccessLabel || '') && /future rule inactive/i.test(trophyPlanCheck.plan.ruleInactiveLabel || '') && typeof trophyPlanCheck.plan.signalCurrent === 'number' && typeof trophyPlanCheck.plan.signalRequired === 'number' && typeof trophyPlanCheck.plan.signalPercent === 'number' && Array.isArray(trophyPlanCheck.plan.signalSources) && Array.isArray(trophyPlanCheck.plan.antiFarmPolicy) && trophyPlanCheck.plan.rewardPolicy?.rewardAccess === false, JSON.stringify(trophyPlanCheck.plan));
    record('Trophy Echo rule summary cannot imply access', trophyPlanCheck.summary?.planned === true && trophyPlanCheck.summary.locked === true && trophyPlanCheck.summary.ready === 0 && trophyPlanCheck.summary.playable === 0 && trophyPlanCheck.summary.active === 0 && trophyPlanCheck.summary.accessAvailable === false && trophyPlanCheck.summary.rewardAvailable === false && typeof trophyPlanCheck.summary.signalCurrent === 'number' && typeof trophyPlanCheck.summary.signalRequired === 'number' && typeof trophyPlanCheck.summary.signalPercent === 'number' && trophyPlanCheck.summary.antiFarmGuardrails >= 5, JSON.stringify(trophyPlanCheck.summary));
    record('Trophy Echo planning helpers do not mutate player or run state', trophyPlanCheck.snapshot === trophyPlanCheck.after, JSON.stringify({ before: trophyPlanCheck.snapshot, after: trophyPlanCheck.after }));
    record('High boss-history signal still does not activate Trophy Echo', trophyPlanCheck.highPlan?.locked === true && trophyPlanCheck.highPlan.ready === false && trophyPlanCheck.highPlan.playable === false && trophyPlanCheck.highPlan.active === false && trophyPlanCheck.highPlan.accessAvailable === false && trophyPlanCheck.highPlan.rewardAvailable === false && trophyPlanCheck.highSummary?.ready === 0 && trophyPlanCheck.highSummary.playable === 0 && trophyPlanCheck.highSummary.active === 0 && trophyPlanCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)), JSON.stringify({ highPlan: trophyPlanCheck.highPlan, highSummary: trophyPlanCheck.highSummary, routeSlotButtons: trophyPlanCheck.routeSlotButtons }));
    record('Malformed boss-history structures keep Trophy Echo planning safe', !trophyPlanCheck.malformedError && trophyPlanCheck.malformedPlan?.locked === true && trophyPlanCheck.malformedPlan.ready === false && trophyPlanCheck.malformedPlan.playable === false && trophyPlanCheck.malformedPlan.active === false && trophyPlanCheck.malformedPlan.accessAvailable === false && trophyPlanCheck.malformedPlan.rewardAvailable === false && trophyPlanCheck.malformedSummary?.ready === 0 && trophyPlanCheck.malformedSummary.playable === 0, JSON.stringify({ malformedPlan: trophyPlanCheck.malformedPlan, malformedSummary: trophyPlanCheck.malformedSummary, malformedError: trophyPlanCheck.malformedError }));
    record('Trophy Echo planning tolerates edge-case boss history states', Array.isArray(trophyPlanCheck.edgeCases) && trophyPlanCheck.edgeCases.length >= 6 && trophyPlanCheck.edgeCases.every(entry => !entry.error && entry.deterministic && entry.notMutated && entry.plan?.key === 'trophy_echo_route' && entry.plan.locked === true && entry.plan.ready === false && entry.plan.playable === false && entry.plan.active === false && entry.plan.accessAvailable === false && entry.plan.rewardAvailable === false && entry.plan.rewardPolicy?.rewardAccess === false && entry.summary?.locked === true && entry.summary.ready === 0 && entry.summary.playable === 0 && entry.summary.active === 0 && entry.summary.accessAvailable === false && entry.summary.rewardAvailable === false && typeof entry.plan.signalCurrent === 'number' && typeof entry.plan.signalRequired === 'number' && entry.plan.signalRequired >= 1 && typeof entry.plan.signalPercent === 'number' && entry.plan.signalPercent >= 0 && entry.plan.signalPercent <= 100), JSON.stringify(trophyPlanCheck.edgeCases));
    record('High Trophy Echo signal does not create route access', trophyPlanCheck.highEdge?.plan?.signalCurrent >= trophyPlanCheck.highEdge?.plan?.signalRequired && trophyPlanCheck.highEdge.plan.signalPercent === 100 && trophyPlanCheck.highEdge.plan.locked === true && trophyPlanCheck.highEdge.plan.ready === false && trophyPlanCheck.highEdge.plan.playable === false && trophyPlanCheck.highEdge.plan.active === false && trophyPlanCheck.highEdge.plan.accessAvailable === false && trophyPlanCheck.highEdge.plan.rewardAvailable === false && trophyPlanCheck.highSummary?.ready === 0 && trophyPlanCheck.highSummary.playable === 0 && trophyPlanCheck.highSummary.active === 0 && trophyPlanCheck.highSummary.accessAvailable === false && trophyPlanCheck.highSummary.rewardAvailable === false && trophyPlanCheck.highGateSummary?.ready === 0 && trophyPlanCheck.highGateSummary.playable === 0 && trophyPlanCheck.highPreviewSummary?.playable === 0 && trophyPlanCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)) && trophyPlanCheck.routeSlotActionAttrs.length === 0 && trophyPlanCheck.apiKeys.every(key => !/revisit.*(enter|entry|start|travel|begin|claim|complete|reward|teleport|rerun|scale|activate|launch)/i.test(key)), JSON.stringify({ highEdge: trophyPlanCheck.highEdge, highSummary: trophyPlanCheck.highSummary, highGateSummary: trophyPlanCheck.highGateSummary, highPreviewSummary: trophyPlanCheck.highPreviewSummary, routeSlotButtons: trophyPlanCheck.routeSlotButtons, routeSlotActionAttrs: trophyPlanCheck.routeSlotActionAttrs }));
    record('Trophy Echo rule chain remains handoff-safe', trophyPlanCheck.plan && trophyPlanCheck.summary && trophyPlanCheck.highEdge?.plan?.locked === true && trophyPlanCheck.highEdge.plan.ready === false && trophyPlanCheck.highEdge.plan.playable === false && trophyPlanCheck.highEdge.plan.active === false && trophyPlanCheck.highEdge.plan.rewardAvailable === false && trophyPlanCheck.malformedPlan?.locked === true && trophyPlanCheck.malformedPlan.ready === false && trophyPlanCheck.malformedPlan.playable === false && trophyPlanCheck.malformedPlan.active === false && trophyPlanCheck.malformedPlan.rewardAvailable === false && trophyPlanCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)) && trophyPlanCheck.routeSlotActionAttrs.length === 0 && trophyPlanCheck.apiKeys.every(key => !/revisit.*(enter|entry|start|travel|begin|claim|complete|reward|teleport|rerun|scale|activate|launch)/i.test(key)), JSON.stringify({ plan: !!trophyPlanCheck.plan, summary: !!trophyPlanCheck.summary, high: trophyPlanCheck.highEdge?.plan, malformed: trophyPlanCheck.malformedPlan, routeSlotButtons: trophyPlanCheck.routeSlotButtons, routeSlotActionAttrs: trophyPlanCheck.routeSlotActionAttrs }));
    record('Trophy Echo anti-farming policy is present', Array.isArray(trophyPlanCheck.plan?.antiFarmPolicy) && /low-floor farming/i.test(trophyPlanCheck.plan.antiFarmPolicy.join(' ')) && /infinite revisit loops/i.test(trophyPlanCheck.plan.antiFarmPolicy.join(' ')) && /mandatory revisit grind/i.test(trophyPlanCheck.plan.antiFarmPolicy.join(' ')) && /stronger than main progression/i.test(trophyPlanCheck.plan.antiFarmPolicy.join(' ')) && /Enter Dungeon and Continue Run remain primary/i.test(trophyPlanCheck.plan.antiFarmPolicy.join(' ')), JSON.stringify(trophyPlanCheck.plan?.antiFarmPolicy));
    record('Trophy Echo reward policy remains planning only', trophyPlanCheck.plan?.rewardPolicy?.status === 'Planning only' && trophyPlanCheck.plan.rewardPolicy.rewardAccess === false && /Memory, trophy, and Dex identity rewards first/i.test(trophyPlanCheck.plan.rewardPolicy.allowedFutureClass || '') && Array.isArray(trophyPlanCheck.plan.rewardPolicy.disallowed) && trophyPlanCheck.plan.rewardPolicy.disallowed.length >= 4, JSON.stringify(trophyPlanCheck.plan?.rewardPolicy));
    record('Earlier Dungeon Revisit shows Trophy Echo planning copy without controls', /Trophy Echo Rule Planning/i.test(trophyPlanCheck.routeSlotText || '') && /Planning only/i.test(trophyPlanCheck.routeSlotText || '') && /Future rule inactive/i.test(trophyPlanCheck.routeSlotText || '') && /Boss-history signal/i.test(trophyPlanCheck.routeSlotText || '') && /Route access is unavailable/i.test(trophyPlanCheck.routeSlotText || '') && /No reward access/i.test(trophyPlanCheck.routeSlotText || '') && /Anti-farming/i.test(trophyPlanCheck.routeSlotText || '') && trophyPlanCheck.routeSlotButtons.every(btn => /Route Locked/i.test(btn)) && trophyPlanCheck.routeSlotActionAttrs.length === 0, JSON.stringify({ routeSlotText: String(trophyPlanCheck.routeSlotText || '').slice(0, 900), routeSlotButtons: trophyPlanCheck.routeSlotButtons, routeSlotActionAttrs: trophyPlanCheck.routeSlotActionAttrs }));
    record('No unsafe Trophy Echo planning API names exist', trophyPlanCheck.apiKeys.every(key => !/revisit.*(enter|entry|start|travel|begin|claim|complete|reward|teleport|rerun|scale|activate|launch)/i.test(key)), JSON.stringify(trophyPlanCheck.apiKeys));

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
