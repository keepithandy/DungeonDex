#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGE_DIR = path.join(ROOT, 'archive', 'packages');
const OUTPUT_NAME = 'DungeonDex_v1265_package_gate_smoke.zip';
const OUTPUT_ZIP = path.join(PACKAGE_DIR, OUTPUT_NAME);
const STAGE_NAME = '_itch_staging_v1265_package_gate';
const STAGE_DIR = path.join(PACKAGE_DIR, STAGE_NAME);
const DEVTOOLS_ONLY_FILES = [
  'js/systems/13_devtools_overlay.js',
  'js/systems/14_devtools_scenarios.js',
  'js/systems/15_devtools_balance_reports.js',
  'js/systems/43_devkit_reset_hold.js'
];
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function run(command, args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function candidateBrowserPaths() {
  return [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium',
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : ''
  ].filter(Boolean);
}

function browserPath() {
  return candidateBrowserPaths().find(candidate => existsSync(candidate)) || '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pickPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function mimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.js') return 'application/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  return 'application/octet-stream';
}

function localPath(root, urlPath) {
  const requested = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/');
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}

async function startStaticServer(root) {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = localPath(root, request.url);
      const data = await readFile(filePath);
      response.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' });
      response.end(data);
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error?.message || String(error));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  return { server, pageUrl: `http://127.0.0.1:${port}/index.html?devtools=0` };
}

async function waitForHttp(url) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const listeners = new Map();
    const pending = new Map();
    let nextId = 1;
    let opened = false;
    socket.onopen = () => {
      opened = true;
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveMessage, rejectMessage) => pending.set(id, { resolve: resolveMessage, reject: rejectMessage }));
        },
        on(event, listener) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(listener);
        },
        close() { socket.close(); }
      });
    };
    socket.onerror = error => { if (!opened) reject(error); };
    socket.onmessage = event => {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (message.id) {
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message || 'CDP error'));
        else entry.resolve(message.result || {});
        return;
      }
      for (const listener of listeners.get(message.method) || []) listener(message.params || {});
    };
    socket.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed');
  return result.result?.value;
}

async function waitForRuntime(client) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(client, `(() => typeof render === 'function' && typeof S !== 'undefined' && !!document.getElementById('startRunBtn'))()`)) return;
    await sleep(150);
  }
  throw new Error('Extracted DungeonDex runtime did not initialize.');
}

async function main() {
  let extractedDir = '';
  let server = null;
  let chrome = null;
  let client = null;
  try {
    const builder = await run('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'tools', 'build_itch_ready.ps1'),
      '-RepoRoot', ROOT, '-OutputName', OUTPUT_NAME, '-StageName', STAGE_NAME, '-SkipSmoke', '-KeepStage'
    ]);
    record('Itch package builder creates a staged ZIP', builder.code === 0 && existsSync(OUTPUT_ZIP) && existsSync(STAGE_DIR), builder.stderr || builder.stdout.slice(-500));
    assert.equal(builder.code, 0, builder.stderr || builder.stdout);

    const strictStage = await run('python', [path.join(ROOT, 'tools', 'check_dungeondex_package.py'), STAGE_DIR]);
    record('Strict checker accepts the staged package', strictStage.code === 0 && /Summary: PASS/.test(strictStage.stdout), strictStage.stdout.slice(-500));
    assert.equal(strictStage.code, 0, strictStage.stdout);

    const excludedStageFiles = await Promise.all(DEVTOOLS_ONLY_FILES.map(async relative => {
      try { await access(path.join(STAGE_DIR, relative)); return relative; } catch { return ''; }
    }));
    record('Stage excludes all development-only runtime files', excludedStageFiles.every(value => !value), excludedStageFiles.filter(Boolean).join(', '));
    assert.ok(excludedStageFiles.every(value => !value));

    extractedDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-package-gate-'));
    const expand = await run('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Expand-Archive -LiteralPath ${quotePowerShell(OUTPUT_ZIP)} -DestinationPath ${quotePowerShell(extractedDir)} -Force`
    ]);
    record('ZIP extracts into a clean directory', expand.code === 0 && existsSync(path.join(extractedDir, 'index.html')), expand.stderr || expand.stdout.slice(-500));
    assert.equal(expand.code, 0, expand.stderr || expand.stdout);

    const strictExtracted = await run('python', [path.join(ROOT, 'tools', 'check_dungeondex_package.py'), extractedDir]);
    record('Strict checker accepts the extracted package', strictExtracted.code === 0 && /Summary: PASS/.test(strictExtracted.stdout), strictExtracted.stdout.slice(-500));
    assert.equal(strictExtracted.code, 0, strictExtracted.stdout);

    const extractedDevtools = await Promise.all(DEVTOOLS_ONLY_FILES.map(async relative => {
      try { await access(path.join(extractedDir, relative)); return relative; } catch { return ''; }
    }));
    record('Extracted ZIP contains no development-only runtime files', extractedDevtools.every(value => !value), extractedDevtools.filter(Boolean).join(', '));
    assert.ok(extractedDevtools.every(value => !value));

    const chromePath = browserPath();
    if (!chromePath) throw new Error('No Chromium browser found for extracted-package verification.');
    const serverResult = await startStaticServer(extractedDir);
    server = serverResult.server;
    const debugPort = await pickPort();
    const profileDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-package-browser-'));
    chrome = spawn(chromePath, [
      `--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--disable-background-networking',
      '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--mute-audio',
      `--user-data-dir=${profileDir}`, 'about:blank'
    ], { cwd: extractedDir, detached: false, stdio: 'ignore', windowsHide: true });
    try {
      await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const target = targets.find(entry => entry.type === 'page');
      if (!target?.webSocketDebuggerUrl) throw new Error('No Chromium page target found.');
      client = await createCdpClient(target.webSocketDebuggerUrl);
      const consoleIssues = [];
      const runtimeIssues = [];
      const networkIssues = [];
      client.on('Runtime.consoleAPICalled', event => {
        if (['error', 'warning', 'assert'].includes(String(event.type || '').toLowerCase())) {
          consoleIssues.push((event.args || []).map(arg => arg.value || arg.description || arg.type || '').join(' '));
        }
      });
      client.on('Runtime.exceptionThrown', event => runtimeIssues.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'Unknown exception'));
      client.on('Network.responseReceived', event => {
        if (Number(event.response?.status || 0) >= 400) networkIssues.push(`${event.response.status} ${event.response.url}`);
      });
      client.on('Network.loadingFailed', event => networkIssues.push(event.errorText || 'Network load failed'));
      await client.send('Page.enable');
      await client.send('Runtime.enable');
      await client.send('Network.enable');
      await client.send('Page.navigate', { url: serverResult.pageUrl });
      await waitForRuntime(client);
      await evaluate(client, `localStorage.removeItem('dungeondex_emberfall_v109'); true`);
      await client.send('Page.reload', { ignoreCache: true });
      await waitForRuntime(client);
      await sleep(900);

      const before = await evaluate(client, `(() => ({
        devtoolsDisabled: window.DUNGEONDEX_DEVTOOLS_ENABLED === false && window.DUNGEONDEX_DEVTOOLS_GATE?.reason === 'query-disabled',
        town: document.querySelector('.screen.active')?.id === 'screen-town',
        journal: document.getElementById('guildJournalPanel')?.innerText || '',
        required: !!document.querySelector('link[rel="manifest"][href*="manifest.json"]')
          && performance.getEntriesByType('resource').some(entry => entry.name.includes('app.js'))
          && performance.getEntriesByType('resource').some(entry => entry.name.includes('styles.css'))
          && typeof navigator.serviceWorker?.register === 'function'
      }))()`);
      record('Extracted public runtime loads with DevTools disabled', before.devtoolsDisabled && before.town && before.required, JSON.stringify(before));
      record('Extracted build includes the Guild Journal Chronicle', /Guild Chronicle/.test(before.journal) && /Guild Journal/.test(before.journal), before.journal.slice(0, 300));

      const journalNavigation = await evaluate(client, `(() => {
        document.getElementById('tab-archive')?.click();
        return { active: document.querySelector('.screen.active')?.id || '', journal: document.getElementById('guildJournalPanel')?.innerText || '' };
      })()`);
      record('Extracted package navigates to the Guild Journal', journalNavigation.active === 'screen-archive' && /Guild Journal/.test(journalNavigation.journal), JSON.stringify(journalNavigation));
      await evaluate(client, `document.getElementById('tab-town')?.click(); true`);

      const navigation = await evaluate(client, `(() => {
        document.getElementById('startRunBtn')?.click();
        return { clicked: true };
      })()`);
      await sleep(700);
      const dungeonLoaded = await evaluate(client, `(() => ({ active: document.querySelector('.screen.active')?.id || '', runActive: !!S?.run?.active }))()`);
      record('Extracted package enters the dungeon', navigation.clicked && dungeonLoaded.active === 'screen-run' && dungeonLoaded.runActive, JSON.stringify(dungeonLoaded));
      record('Extracted public runtime has no console, runtime, or local-request failures', consoleIssues.length === 0 && runtimeIssues.length === 0 && networkIssues.length === 0, JSON.stringify({ consoleIssues, runtimeIssues, networkIssues }));
    } finally {
      try { client?.close(); } catch {}
      try { chrome?.kill(); } catch {}
      try { await rm(profileDir, { recursive: true, force: true }); } catch {}
    }
  } finally {
    try { await new Promise(resolve => server ? server.close(resolve) : resolve()); } catch {}
    if (extractedDir) await rm(extractedDir, { recursive: true, force: true });
    await rm(STAGE_DIR, { recursive: true, force: true });
    await rm(OUTPUT_ZIP, { force: true });
  }

  const failed = results.filter(result => !result.ok);
  console.log(`Package build and extraction smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
