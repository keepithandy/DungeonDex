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
const results = [];
const consoleErrors = [];
const runtimeErrors = [];

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function record(name, ok, detail = ''){ results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`); }
async function pickPort(){ return await new Promise((resolve, reject) => { const server = net.createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(err => err ? reject(err) : resolve(port)); }); }); }
function safePathFromUrl(urlPath){ const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/'); const rel = clean === '/' ? '/index.html' : clean; const resolved = path.resolve(ROOT, `.${rel}`); if (!resolved.startsWith(ROOT)) throw new Error('path outside root'); return resolved; }
function mimeType(filePath){ const ext = path.extname(filePath).toLowerCase(); if (ext === '.html') return 'text/html; charset=utf-8'; if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8'; if (ext === '.css') return 'text/css; charset=utf-8'; if (ext === '.json') return 'application/json; charset=utf-8'; return 'application/octet-stream'; }
async function startStaticServer(){ const server = http.createServer(async (req, res) => { try { const data = await readFile(safePathFromUrl(req.url)); res.writeHead(200, { 'Content-Type': mimeType(safePathFromUrl(req.url)), 'Cache-Control': 'no-store' }); res.end(data); } catch (err) { res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' }); res.end(err?.message || String(err)); } }); const port = await new Promise((resolve, reject) => { server.on('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); }); return { server, url:`http://127.0.0.1:${port}/index.html` }; }
async function waitForHttp(url, timeoutMs = 15000){ const deadline = Date.now() + timeoutMs; let lastError = null; while (Date.now() < deadline) { try { const res = await fetch(url, { cache:'no-store' }); if (res.ok) return true; lastError = new Error(`HTTP ${res.status}`); } catch (err) { lastError = err; } await sleep(150); } throw lastError || new Error(`Timed out waiting for ${url}`); }
async function fetchJson(url){ const res = await fetch(url); return JSON.parse(await res.text()); }
async function waitForProcessExit(child, timeoutMs = 5000){ if (!child || child.exitCode !== null || child.signalCode !== null) return true; return await new Promise(resolve => { const onExit = () => { clearTimeout(timer); resolve(true); }; const timer = setTimeout(() => { child.off('exit', onExit); resolve(false); }, timeoutMs); child.once('exit', onExit); }); }
async function removeTempProfile(userDataDir){ for (let attempt = 1; attempt <= 8; attempt += 1) { try { await rm(userDataDir, { recursive:true, force:true }); return; } catch (err) { if (!['EBUSY','EPERM','ENOTEMPTY'].includes(err?.code) || attempt === 8) throw err; await sleep(attempt * 100); } } }
async function startChrome(debugPort, userDataDir){ return spawn(CHROME_PATH, [`--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--user-data-dir=${userDataDir}`, 'about:blank'], { cwd:ROOT, detached:false, stdio:'ignore', windowsHide:true }); }
async function createCdpClient(wsUrl){ return await new Promise((resolve, reject) => { const ws = new WebSocket(wsUrl); const pending = new Map(); const listeners = new Map(); let nextId = 1; let opened = false; ws.onopen = () => { opened = true; resolve({ send(method, params = {}){ const id = nextId++; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolveSend, rejectSend) => pending.set(id, { resolve:resolveSend, reject:rejectSend })); }, on(event, fn){ if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); }, close(){ ws.close(); } }); }; ws.onerror = err => { if (!opened) reject(err); }; ws.onmessage = event => { const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data)); if (msg.id) { const entry = pending.get(msg.id); if (!entry) return; pending.delete(msg.id); if (msg.error) entry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`)); else entry.resolve(msg.result || {}); return; } if (msg.method && listeners.has(msg.method)) for (const fn of listeners.get(msg.method)) fn(msg.params || {}); }; ws.onclose = () => { for (const entry of pending.values()) entry.reject(new Error('CDP connection closed')); pending.clear(); if (!opened) reject(new Error('CDP connection closed before open')); }; }); }
async function evalByValue(client, expression){ const result = await client.send('Runtime.evaluate', { expression:`(() => (${expression}))()`, awaitPromise:true, returnByValue:true, replMode:true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Exception'); return result.result?.value; }
async function evalScript(client, script){ const result = await client.send('Runtime.evaluate', { expression:`(async () => { ${script} })()`, awaitPromise:true, returnByValue:true, replMode:true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Exception'); return result.result?.value; }
async function waitForCondition(client, predicate, timeoutMs = 15000, pollMs = 150){ const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { try { if (await evalByValue(client, predicate)) return true; } catch {} await sleep(pollMs); } return false; }

async function main(){
  const server = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-revisit-ledger-smoke-'));
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
    await client.send('Page.navigate', { url:server.url });
    if (!await waitForCondition(client, `!!window.DDRevisitArchiveCodex && typeof renderArchive === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('Archive codex did not initialize.');
    await evalScript(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); return true;`);
    await client.send('Page.reload', { ignoreCache:true });
    if (!await waitForCondition(client, `!!window.DDRevisitArchiveCodex && typeof renderArchive === 'function' && typeof S !== 'undefined' && !!S.player`, 15000)) throw new Error('Archive codex did not initialize after reload.');

    const emptyAudit = await evalByValue(client, `(() => {
      renderArchive();
      if (window.DDRevisitArchiveCodexRender) window.DDRevisitArchiveCodexRender();
      const panel = document.getElementById('archivePanel');
      return {
        loaded: !!window.DDRevisitArchiveCodex,
        text: panel?.innerText || '',
        codexCount: panel?.querySelectorAll('.revisit-codex-head').length || 0,
        controls: panel?.querySelectorAll('.revisit-codex-head button, .revisit-codex-tags button, .revisit-codex-list button, .revisit-codex-list input, .revisit-codex-list select, .revisit-codex-list textarea').length || 0
      };
    })()`);
    record('Revisit Archive Codex script loads once', emptyAudit.loaded === true && emptyAudit.codexCount === 1, JSON.stringify(emptyAudit));
    record('Empty Revisit Memory Ledger renders locked read-only copy', /Revisit Memory Ledger/i.test(emptyAudit.text) && /No Revisit memories recorded yet/i.test(emptyAudit.text) && /Trophy Echo/i.test(emptyAudit.text) && /Famous Gear Memory/i.test(emptyAudit.text) && /Rival Trace/i.test(emptyAudit.text) && emptyAudit.controls === 0, JSON.stringify(emptyAudit));

    const populatedAudit = await evalByValue(client, `(() => {
      const before = {
        debt: JSON.stringify(S.player?.debtCollector || {}),
        talent: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null }),
        gear: JSON.stringify(S.player?.gear || {}),
        wallet: JSON.stringify({ gold:S.player?.gold, xp:S.player?.xp, level:S.player?.level })
      };
      S.player.revisitState = S.player.revisitState || {};
      S.player.revisitState.trophyEcho = { memoryMarks:1, history:[{ memoryTitle:'Ashwake Echo', bossName:'Ashwake Brute', summary:'A safe boss memory was recorded.', completedAt:Date.now() - 3000 }] };
      S.player.revisitState.famousGear = { completedKeys:{ 'famous-test':true }, history:[{ memoryTitle:'Old Blade Memory', itemName:'Old Blade', slot:'weapon', summary:'A retired weapon memory was recovered.', completedAt:Date.now() - 2000 }] };
      S.player.revisitState.rivalTrace = { completedKeys:{ 'rival-test':true }, history:[{ memoryTitle:'Rival Trace: Ember Warden', eliteName:'Ember Warden', floorName:'Lowfire Stair', summary:'A named rival trace was recovered.', completedAt:Date.now() - 1000 }] };
      renderArchive();
      if (window.DDRevisitArchiveCodexRender) window.DDRevisitArchiveCodexRender();
      const panel = document.getElementById('archivePanel');
      const after = {
        debt: JSON.stringify(S.player?.debtCollector || {}),
        talent: JSON.stringify({ ledger:S.player?.talentLedger || null, earning:S.player?.talentEarning || null, learned:S.player?.talentLearnedIds || null, unlocks:S.player?.talentUnlockIds || null }),
        gear: JSON.stringify(S.player?.gear || {}),
        wallet: JSON.stringify({ gold:S.player?.gold, xp:S.player?.xp, level:S.player?.level })
      };
      return {
        text: panel?.innerText || '',
        codexCount: panel?.querySelectorAll('.revisit-codex-head').length || 0,
        recordCards: panel?.querySelectorAll('.revisit-codex-line').length || 0,
        controls: panel?.querySelectorAll('.revisit-codex-head button, .revisit-codex-tags button, .revisit-codex-list button, .revisit-codex-list input, .revisit-codex-list select, .revisit-codex-list textarea').length || 0,
        unchanged: JSON.stringify(before) === JSON.stringify(after),
        before,
        after
      };
    })()`);
    record('Populated Revisit Memory Ledger shows all three lane histories', populatedAudit.codexCount === 1 && populatedAudit.recordCards >= 3 && /3 records/i.test(populatedAudit.text) && /Trophy Echo: 1 Memory Marks/i.test(populatedAudit.text) && /Famous Gear Memory: 1 recovered/i.test(populatedAudit.text) && /Rival Trace: 1 traced/i.test(populatedAudit.text) && /Ashwake Echo/i.test(populatedAudit.text) && /Old Blade Memory/i.test(populatedAudit.text) && /Rival Trace: Ember Warden/i.test(populatedAudit.text), JSON.stringify({ text:populatedAudit.text.slice(0, 900), recordCards:populatedAudit.recordCards }));
    record('Revisit Memory Ledger is display-only and leaves core state unchanged', populatedAudit.controls === 0 && populatedAudit.unchanged === true, JSON.stringify({ controls:populatedAudit.controls, before:populatedAudit.before, after:populatedAudit.after }));
    record('No console or runtime errors', consoleErrors.length === 0 && runtimeErrors.length === 0, JSON.stringify({ consoleErrors, runtimeErrors }));
  } finally {
    if (client) { try { await client.send('Browser.close'); } catch {} client.close(); }
    if (!await waitForProcessExit(chrome, 3000)) { chrome.kill(); await waitForProcessExit(chrome, 3000); }
    await removeTempProfile(userDataDir);
    await new Promise(resolve => server.server.close(resolve));
  }
  const failed = results.filter(result => !result.ok);
  console.log(`\nRevisit archive ledger smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
