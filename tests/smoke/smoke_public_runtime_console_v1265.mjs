#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const DEVTOOLS_ONLY_FILES = [
  '13_devtools_overlay.js',
  '14_devtools_scenarios.js',
  '15_devtools_balance_reports.js',
  '43_devkit_reset_hold.js'
];
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function browserPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  return [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium',
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : '',
    process.platform === 'win32' ? 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' : '',
    localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    localAppData ? path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : ''
  ].filter(Boolean).find(candidate => existsSync(candidate)) || '';
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
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function sourcePath(urlPath) {
  const requestPath = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/');
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}

async function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = sourcePath(request.url);
      response.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' });
      response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error?.message || String(error));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  return { server, url: `http://127.0.0.1:${port}/index.html?devtools=0` };
}

async function waitForHttp(url, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url, { cache: 'no-store' })).ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createClient(wsUrl) {
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
  const response = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed');
  return response.result?.value;
}

async function waitFor(client, expression, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(client, expression)) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function consoleText(args = []) {
  return args.map(arg => arg.value ?? arg.description ?? arg.unserializableValue ?? arg.type ?? '').join(' ').trim();
}

function sourceFrom(stackTrace, fallback = {}) {
  const frame = stackTrace?.callFrames?.[0] || {};
  const url = frame.url || fallback.url || '';
  const line = Number.isInteger(frame.lineNumber) ? frame.lineNumber + 1 : Number.isInteger(fallback.lineNumber) ? fallback.lineNumber + 1 : 0;
  const column = Number.isInteger(frame.columnNumber) ? frame.columnNumber + 1 : Number.isInteger(fallback.columnNumber) ? fallback.columnNumber + 1 : 0;
  return url ? `${url}${line ? `:${line}${column ? `:${column}` : ''}` : ''}` : 'source unavailable';
}

async function main() {
  const chromePath = browserPath();
  assert.ok(chromePath, 'Chrome or Chromium is required for the public runtime console smoke.');

  let server;
  let chrome;
  let client;
  let profileDir = '';
  try {
    const serverResult = await startServer();
    server = serverResult.server;
    const debugPort = await pickPort();
    profileDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-public-runtime-'));
    chrome = spawn(chromePath, [
      `--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--disable-background-networking',
      '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--mute-audio',
      `--user-data-dir=${profileDir}`, 'about:blank'
    ], { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true });

    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const target = targets.find(entry => entry.type === 'page');
    assert.ok(target?.webSocketDebuggerUrl, 'Chromium did not expose a page debugging target.');
    client = await createClient(target.webSocketDebuggerUrl);

    let activeSurface = 'startup';
    const issues = [];
    const requests = new Map();
    const addIssue = (kind, message, source) => issues.push({ surface: activeSurface, kind, message: String(message || 'Unknown failure'), source: source || 'source unavailable' });
    client.on('Runtime.consoleAPICalled', event => {
      if (['error', 'warning', 'assert'].includes(String(event.type || '').toLowerCase())) {
        addIssue(`console-${event.type}`, consoleText(event.args), sourceFrom(event.stackTrace));
      }
    });
    client.on('Runtime.exceptionThrown', event => {
      const detail = event.exceptionDetails || {};
      addIssue('uncaught-exception', detail.exception?.description || detail.text, sourceFrom(detail.stackTrace, detail));
    });
    client.on('Network.requestWillBeSent', event => requests.set(event.requestId, event.request?.url || ''));
    client.on('Network.responseReceived', event => {
      if (Number(event.response?.status || 0) >= 400) addIssue('http-failure', `${event.response.status} ${event.response.url}`, event.response.url);
    });
    client.on('Network.loadingFailed', event => addIssue('network-failure', event.errorText || 'Network load failed', requests.get(event.requestId) || 'source unavailable'));

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__ddPublicRuntimeUnhandledRejections = [];
      window.addEventListener('unhandledrejection', event => {
        const reason = event.reason;
        window.__ddPublicRuntimeUnhandledRejections.push({
          message: String(reason?.stack || reason?.message || reason || 'Unhandled promise rejection'),
          source: location.href
        });
      });
    ` });
    await client.send('Page.navigate', { url: serverResult.url });
    await waitFor(client, `typeof render === 'function' && typeof S !== 'undefined' && !!document.getElementById('startRunBtn')`, 'DungeonDex runtime initialization');
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); sessionStorage.clear(); true`);
    await client.send('Page.reload', { ignoreCache: true });
    await waitFor(client, `typeof render === 'function' && typeof S !== 'undefined' && !!document.getElementById('startRunBtn')`, 'fresh public runtime initialization');
    await sleep(500);

    activeSurface = 'Intro modal';
    const intro = await evaluate(client, `(() => ({
      open: document.getElementById('introModal')?.hidden === false,
      close: !!document.getElementById('introModalCloseBtn'),
      enter: !!document.getElementById('introModalEnterDungeonBtn'),
      text: document.getElementById('introModalContent')?.innerText || ''
    }))()`);
    record('Public runtime opens the intro modal', intro.open && intro.close, JSON.stringify(intro));
    record('Fresh public runtime receives the DungeonDex first-descent welcome', intro.enter
      && /DungeonDex/.test(intro.text)
      && /Records from the Hollow Stair/.test(intro.text)
      && /Welcome to the Guild\. Enter the Hollow Stair, survive what you can, and let the Journal remember what mattered\./.test(intro.text), intro.text.slice(0, 320));
    await evaluate(client, `document.getElementById('introModalCloseBtn')?.click(); true`);
    await waitFor(client, `document.getElementById('introModal')?.hidden === true`, 'intro modal close');

    activeSurface = 'Town';
    const town = await evaluate(client, `(() => ({ active: document.querySelector('.screen.active')?.id || '', devtoolsDisabled: window.DUNGEONDEX_DEVTOOLS_ENABLED === false, devtoolsReason: window.DUNGEONDEX_DEVTOOLS_GATE?.reason || '' }))()`);
    record('Public runtime loads Town with DevTools disabled', town.active === 'screen-town' && town.devtoolsDisabled, JSON.stringify(town));

    activeSurface = 'Town shortcuts';
    await evaluate(client, `document.getElementById('tab-gear')?.click(); true`);
    await waitFor(client, `document.querySelector('.screen.active')?.id === 'screen-gear'`, 'Gear route before Town shortcut');
    await evaluate(client, `(() => {
      const townTab = document.getElementById('tab-town');
      townTab?.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, button:0, buttons:1, pointerId:73, pointerType:'touch', isPrimary:true, clientX:12, clientY:12 }));
      return !!townTab;
    })()`);
    await sleep(520);
    const townShortcuts = await evaluate(client, `(() => {
      const townTab = document.getElementById('tab-town');
      const menu = document.getElementById('ddxTownShortcuts');
      return {
        open: !!menu && !menu.hidden,
        expanded: townTab?.getAttribute('aria-expanded') || '',
        role: menu?.getAttribute('role') || '',
        labels: Array.from(menu?.querySelectorAll('[data-town-shortcut]') || []).map(button => button.textContent?.trim() || '')
      };
    })()`);
    record('Holding Town opens live Market, Forge, and Elite shortcuts', townShortcuts.open
      && townShortcuts.expanded === 'true'
      && townShortcuts.role === 'menu'
      && JSON.stringify(townShortcuts.labels) === JSON.stringify(['Lowfire Market', 'Lowfire Forge', 'Elite Contracts']), JSON.stringify(townShortcuts));
    const heldTownClick = await evaluate(client, `(() => {
      const townTab = document.getElementById('tab-town');
      townTab?.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, button:0, buttons:0, pointerId:73, pointerType:'touch', isPrimary:true, clientX:12, clientY:12 }));
      townTab?.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
      return {
        menuOpen: document.getElementById('ddxTownShortcuts')?.hidden === false,
        active: document.querySelector('.screen.active')?.id || ''
      };
    })()`);
    record('Town hold does not collapse into a normal Town click', heldTownClick.menuOpen && heldTownClick.active === 'screen-gear', JSON.stringify(heldTownClick));
    await evaluate(client, `document.querySelector('[data-town-shortcut="forge"]')?.click(); true`);
    await waitFor(client, `document.activeElement?.id === 'forgePanel' && document.getElementById('ddxTownShortcuts')?.hidden === true`, 'Lowfire Forge Town shortcut');
    const forgeShortcut = await evaluate(client, `({ active: document.querySelector('.screen.active')?.id || '', focus: document.activeElement?.id || '' })`);
    record('Town Forge shortcut scrolls and focuses the existing Forge panel', forgeShortcut.active === 'screen-town' && forgeShortcut.focus === 'forgePanel', JSON.stringify(forgeShortcut));
    await evaluate(client, `(() => {
      const townTab = document.getElementById('tab-town');
      townTab?.focus();
      townTab?.dispatchEvent(new KeyboardEvent('keydown', { key:'F10', shiftKey:true, bubbles:true, cancelable:true }));
      return true;
    })()`);
    await waitFor(client, `document.getElementById('ddxTownShortcuts')?.hidden === false`, 'keyboard Town shortcut menu open');
    await evaluate(client, `document.querySelector('[data-town-shortcut="elite"]')?.click(); true`);
    await waitFor(client, `document.activeElement?.id === 'questPanel' && document.getElementById('ddxTownShortcuts')?.hidden === true`, 'Elite Contracts Town shortcut');
    const eliteShortcut = await evaluate(client, `({ active: document.querySelector('.screen.active')?.id || '', focus: document.activeElement?.id || '' })`);
    record('Keyboard Town menu reaches the existing Elite Contracts board', eliteShortcut.active === 'screen-town' && eliteShortcut.focus === 'questPanel', JSON.stringify(eliteShortcut));

    activeSurface = 'Trophy Echo';
    const trophyEcho = await evaluate(client, `(() => ({ panel: !!document.getElementById('revisitPanel'), text: document.getElementById('revisitPanel')?.innerText || '' }))()`);
    record('Town exposes the Trophy Echo surface', trophyEcho.panel && /Trophy Echo/.test(trophyEcho.text), trophyEcho.text.slice(0, 220));

    async function visitTab(surface, id, expectedScreen) {
      activeSurface = surface;
      await evaluate(client, `document.getElementById(${JSON.stringify(id)})?.click(); true`);
      await waitFor(client, `document.querySelector('.screen.active')?.id === ${JSON.stringify(expectedScreen)}`, `${surface} route`);
      const state = await evaluate(client, `document.querySelector('.screen.active')?.id || ''`);
      record(`Public runtime navigates to ${surface}`, state === expectedScreen, state);
    }

    await visitTab('Gear', 'tab-gear', 'screen-gear');

    // A fresh public save intentionally has no gear. This calls the existing read-only modal renderer without changing save or gameplay state.
    activeSurface = 'Gear inspection modal';
    const detail = await evaluate(client, `(() => {
      window.DungeonDexGearDetailModal?.open({ source: 'Inspection', slot: 'weapon', item: { id: 'runtime-console-fixture', name: 'Inspection Fixture', slot: 'weapon', rarity: 'common', power: 1 } });
      return { open: !!document.getElementById('gearDetailModal'), close: !!document.querySelector('[data-gear-detail-close]') };
    })()`);
    record('Public runtime opens the read-only gear inspection modal', detail.open && detail.close, JSON.stringify(detail));
    await evaluate(client, `document.querySelector('[data-gear-detail-close]')?.click(); true`);
    await waitFor(client, `!document.getElementById('gearDetailModal')`, 'gear inspection modal close');

    await visitTab('Archive', 'tab-dex', 'screen-dex');
    await visitTab('Guild Journal', 'tab-archive', 'screen-archive');
    const journal = await evaluate(client, `document.getElementById('guildJournalPanel')?.innerText || ''`);
    record('Guild Journal remains available in the public runtime', /Guild Journal/.test(journal), journal.slice(0, 220));

    activeSurface = 'Town';
    await evaluate(client, `document.getElementById('tab-town')?.click(); true`);
    await waitFor(client, `document.querySelector('.screen.active')?.id === 'screen-town'`, 'Town route before dungeon entry');

    activeSurface = 'Dungeon';
    await evaluate(client, `document.getElementById('startRunBtn')?.click(); true`);
    await waitFor(client, `document.querySelector('.screen.active')?.id === 'screen-run' && !!S?.run?.active`, 'dungeon entry');
    const dungeon = await evaluate(client, `({ active: document.querySelector('.screen.active')?.id || '', runActive: !!S?.run?.active })`);
    record('Public runtime enters the dungeon', dungeon.active === 'screen-run' && dungeon.runActive, JSON.stringify(dungeon));

    const unhandled = await evaluate(client, `window.__ddPublicRuntimeUnhandledRejections || []`);
    unhandled.forEach(entry => addIssue('unhandled-rejection', entry.message, entry.source));
    const forbiddenLoads = [...new Set([...requests.values()].filter(url => DEVTOOLS_ONLY_FILES.some(file => String(url).includes(file))))];
    forbiddenLoads.forEach(url => addIssue('development-only-runtime-load', url, url));
    record('Public runtime has no console, exception, rejection, asset, request, or DevTools-load failures', issues.length === 0, JSON.stringify(issues));
  } finally {
    try { client?.close(); } catch {}
    try { chrome?.kill(); } catch {}
    try { await new Promise(resolve => server ? server.close(resolve) : resolve()); } catch {}
    try { if (profileDir) await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } catch {}
  }

  const failed = results.filter(result => !result.ok);
  console.log(`Public runtime console smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
