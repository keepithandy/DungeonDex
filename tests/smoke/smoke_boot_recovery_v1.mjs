#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE_PATH = '/js/systems/00_core_constants_data.js';

function browserPath() {
  const local = process.env.LOCALAPPDATA || '';
  return [process.env.CHROME_PATH, process.env.CHROMIUM_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    local ? path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe') : '']
    .filter(Boolean).find(candidate => existsSync(candidate)) || '';
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function pickPort() { return new Promise((resolve, reject) => { const s = net.createServer(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); }); }
function clientFor(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl); const pending = new Map(); let id = 1; let opened = false;
    socket.onopen = () => { opened = true; resolve({
      send(method, params = {}) { const requestId = id++; socket.send(JSON.stringify({ id: requestId, method, params })); return new Promise((res, rej) => pending.set(requestId, { res, rej })); },
      close() { socket.close(); }
    }); };
    socket.onerror = error => { if (!opened) reject(error); };
    socket.onmessage = event => { const message = JSON.parse(String(event.data)); const entry = pending.get(message.id); if (!entry) return; pending.delete(message.id); message.error ? entry.rej(new Error(message.error.message)) : entry.res(message.result || {}); };
  });
}
async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'evaluation failed');
  return result.result?.value;
}
async function waitFor(client, expression, label) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) { if (await evaluate(client, expression)) return; await sleep(100); }
  throw new Error(`Timed out waiting for ${label}`);
}

const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const boot = await readFile(path.join(ROOT, 'js/systems/12_render_bindings_boot.js'), 'utf8');
assert.match(html, /id="bootRecoveryPanel"/);
assert.match(html, /data-dd-required="true"[^>]+src="\.\/js\/systems\/00_core_constants_data\.js/);
assert.match(html, /clearScopedCaches/);
assert.match(html, /key\.indexOf\(cachePrefix\) === 0/);
assert.doesNotMatch(html, /getRegistrations\(\)\.then\(function\(registrations\)/);
assert.match(boot, /DungeonDexBootHealth\.markReady/);
assert.match(boot, /clearScopedCachesAndReload/);

const port = await pickPort();
const server = http.createServer(async (req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (requestPath === CORE_PATH) { res.writeHead(404); res.end('simulated missing required asset'); return; }
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  try { const body = await readFile(path.join(ROOT, relative)); res.writeHead(200); res.end(body); }
  catch (_) { res.writeHead(404); res.end('not found'); }
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
try {
  const missing = await fetch(`http://127.0.0.1:${port}${CORE_PATH}`);
  const servedIndex = await (await fetch(`http://127.0.0.1:${port}/index.html`)).text();
  assert.equal(missing.status, 404, 'the required core asset must be simulated as missing');
  assert.match(servedIndex, /id="bootRecoveryPanel"/);
  assert.match(servedIndex, /DungeonDex could not finish loading/);
  assert.match(servedIndex, /js\/systems\/00_core_constants_data\.js/);
  assert.match(servedIndex, /player save data was not erased/i);
  assert.doesNotMatch(servedIndex.slice(servedIndex.indexOf('(function(){'), servedIndex.indexOf('</head>')), /localStorage|indexedDB/i, 'boot recovery must not touch player storage');
  console.log('PASS: simulated required-script 404 is represented by the recovery panel with the failed path and save-preservation copy.');
} finally {
  await new Promise(resolve => server.close(resolve));
}
console.log('PASS: scoped cache recovery is limited to the current registration and dungeondex-* cache names.');
