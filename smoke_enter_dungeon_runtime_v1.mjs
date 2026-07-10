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
const VERBOSE = process.env.DUNGEONDEX_SMOKE_VERBOSE === '1' || process.argv.includes('--verbose') || process.argv.includes('-v');

const results = [];
const consoleIssues = [];
const runtimeExceptions = [];
const networkFailures = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  if (!ok || VERBOSE) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function printSummary() {
  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`Enter Dungeon runtime smoke: ${passed}/${results.length} passing${failed ? `, ${failed} failing` : ''}`);
  if (failed) {
    console.log('Failed assertions:');
    results.filter(result => !result.ok).forEach(result => {
      console.log(`- ${result.name}${result.detail ? `: ${result.detail}` : ''}`);
    });
  }
  return failed;
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
  return { server, pageUrl: `http://127.0.0.1:${port}/index.html` };
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
  return spawn(CHROME_PATH, [
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
  ], { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true });
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  return JSON.parse(await res.text());
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;
    let opened = false;

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

function consoleText(msg) {
  return `${msg.type || 'log'}: ${(msg.args || []).map(arg => arg.value || arg.description || arg.type || '').join(' ')}`.trim();
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

async function waitForRuntime(client, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(client, `(() => typeof render === 'function' && typeof S !== 'undefined' && !!document.getElementById('startRunBtn'))()`);
      if (ready) return true;
    } catch (_) {}
    await sleep(150);
  }
  return false;
}

async function main() {
  const { server, pageUrl } = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-enter-smoke-'));
  const chrome = startChrome(debugPort, userDataDir);
  let client = null;

  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');

    client = await createCdpClient(target.webSocketDebuggerUrl);
    client.on('Runtime.exceptionThrown', evt => runtimeExceptions.push(exceptionText(evt.exceptionDetails)));
    client.on('Runtime.consoleAPICalled', msg => {
      const type = String(msg.type || '').toLowerCase();
      const text = consoleText(msg);
      if (['error', 'warning', 'assert'].includes(type) || /DungeonDex .*error/i.test(text)) consoleIssues.push(text);
    });
    client.on('Network.loadingFailed', evt => networkFailures.push(`${evt.type || 'Unknown'}: ${evt.errorText || 'load failed'}`));
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.navigate', { url: pageUrl });

    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize.');
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); true`);
    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after clearing save.');
    await sleep(700);

    const before = await evaluate(client, `(() => ({
      activeScreen: document.querySelector('.screen.active')?.id || '',
      townText: document.getElementById('screen-town')?.innerText || '',
      buttonText: document.getElementById('startRunBtn')?.innerText || '',
      townHubTitle: document.querySelector('#screen-town .town-hub-titlebar #districtName')?.innerText || '',
      townSectionCount: document.querySelectorAll('#screen-town .town-section-shell').length,
      boardShell: !!document.querySelector('#questPanel.town-board-shell'),
      marketShell: !!document.querySelector('#merchantPanel.town-market-shell'),
      forgeShell: !!document.querySelector('#forgePanel.town-forge-shell'),
      townSectionText: {
        board: document.getElementById('questPanel')?.innerText || '',
        market: document.getElementById('merchantPanel')?.innerText || '',
        forge: document.getElementById('forgePanel')?.innerText || ''
      },
      townActions: {
        enterDungeon: !!document.getElementById('startRunBtn'),
        refreshMarket: !!document.getElementById('refreshMerchantBtn'),
        forgeRelic: !!document.getElementById('forgeBtn'),
        gearTab: !!document.getElementById('tab-gear'),
        archiveTab: !!document.getElementById('tab-dex'),
        journalTab: !!document.getElementById('tab-archive')
      },
      revisitStartButtons: Array.from(document.querySelectorAll('[data-start-revisit]')).map(btn => btn.getAttribute('data-start-revisit') || '')
    }))()`);
    record('Town loads before Enter Dungeon', before.activeScreen === 'screen-town' && /Enter Dungeon|Continue Run/.test(before.buttonText), JSON.stringify(before));
    record('Town shell identity survives the full wrapper chain', before.townSectionCount >= 3 && before.boardShell && before.marketShell && before.forgeShell, JSON.stringify(before));
    record('Town sections retain readable final labels', /Lowfire Board/.test(before.townSectionText.board) && /Lowfire Market/.test(before.townSectionText.market) && /Lowfire Relic Forge|Relic Forge/.test(before.townSectionText.forge), JSON.stringify({ board: /Lowfire Board/.test(before.townSectionText.board), market: /Lowfire Market/.test(before.townSectionText.market), forge: /Lowfire Relic Forge|Relic Forge/.test(before.townSectionText.forge) }));
    record('Town actions preserve dungeon, market, gear, archive, and journal access', Object.values(before.townActions).every(Boolean), JSON.stringify(before.townActions));
    record('Town hub title remains visible', /Lowfire District/.test(before.townHubTitle), JSON.stringify(before));
    record('No Board Echo start action is exposed in town', !before.revisitStartButtons.includes('board_echo_route'), JSON.stringify(before.revisitStartButtons));

    const clickResult = await evaluate(client, `(() => {
      const btn = document.getElementById('startRunBtn');
      if (!btn) return { clicked:false, reason:'missing startRunBtn' };
      btn.click();
      return { clicked:true, text:btn.innerText };
    })()`);
    record('Enter Dungeon button clicked', clickResult?.clicked === true, JSON.stringify(clickResult));
    await sleep(900);

    const after = await evaluate(client, `(() => ({
      title: document.title,
      bodyTextLength: (document.body?.innerText || '').trim().length,
      activeScreen: document.querySelector('.screen.active')?.id || '',
      runActive: !!S?.run?.active,
      monsterName: S?.run?.monster?.name || '',
      runStatusText: document.getElementById('runStatus')?.innerText || '',
      combatPanelText: document.getElementById('combatPanel')?.innerText || '',
      combatLogText: document.getElementById('combatLog')?.innerText || '',
      saveButtonExists: !!document.getElementById('saveBtn'),
      tabCount: document.querySelectorAll('.tab').length
    }))()`);

    record('App does not blank after Enter Dungeon', after.bodyTextLength > 20 && after.saveButtonExists === true && after.tabCount >= 5, JSON.stringify(after));
    record('Run screen appears after Enter Dungeon', after.activeScreen === 'screen-run' && after.runActive === true, JSON.stringify(after));
    record('Run panels render after Enter Dungeon', [after.runStatusText, after.combatPanelText, after.combatLogText].every(text => String(text || '').trim().length > 0), JSON.stringify(after));

    for (const width of [320, 390, 868]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await sleep(100);
      const combatBar = await evaluate(client, `(() => {
        const stats = Array.from(document.querySelectorAll('.combat-hud.run-stat-grid .stat-box'));
        const labels = stats.map(box => box.querySelector('.small'));
        const actions = Array.from(document.querySelectorAll('.combat-device-actions button'));
        const statRects = stats.map(node => node.getBoundingClientRect());
        const actionRects = actions.map(node => node.getBoundingClientRect());
        const sameRow = rects => rects.length === 4 && rects.every(rect => Math.abs(rect.top - rects[0].top) < 1);
        const equalWidth = rects => rects.length === 4 && rects.every(rect => Math.abs(rect.width - rects[0].width) < 1);
        return {
          statCount: stats.length,
          actionCount: actions.length,
          labels: labels.map(node => node?.textContent?.trim() || ''),
          labelsVisible: labels.every(node => node && getComputedStyle(node).display !== 'none'),
          statSameRow: sameRow(statRects),
          actionSameRow: sameRow(actionRects),
          statEqualWidth: equalWidth(statRects),
          actionEqualWidth: equalWidth(actionRects),
          actionOrder: actions.map(node => node.textContent.trim()),
          fitsViewport: [...statRects, ...actionRects].every(rect => rect.left >= -1 && rect.right <= innerWidth + 1)
        };
      })()`);
      record(
        `Combat bar keeps the four-column reference layout at ${width}px`,
        combatBar?.statCount === 4
          && combatBar?.actionCount === 4
          && combatBar?.labelsVisible === true
          && combatBar?.statSameRow === true
          && combatBar?.actionSameRow === true
          && combatBar?.statEqualWidth === true
          && combatBar?.actionEqualWidth === true
          && combatBar?.fitsViewport === true
          && JSON.stringify(combatBar?.labels) === JSON.stringify(['PWR', 'GRD', 'SPD', 'LCK'])
          && JSON.stringify(combatBar?.actionOrder) === JSON.stringify(['Attack', 'Ashburst', 'Guard', 'Extract']),
        JSON.stringify(combatBar)
      );
    }

    const feedProbe = await evaluate(client, `(() => {
      S.run.combatLog = [
        'Mireborn Herald hits for 18. The submerged blade drives through the Warden guard and shakes the old stone corridor.',
        'You strike for 8. The return blow scatters brine across the floor before the creature steadies itself again.',
        'Mireborn Herald hits for 23. Cold water floods the cracked flagstones as the enemy presses its attack.'
      ];
      render();
      const panel = document.getElementById('combatLog');
      const list = panel?.querySelector('.run-log-list');
      if (!panel || !list) return null;
      const panelRect = panel.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const before = list.scrollTop;
      list.scrollTop = list.scrollHeight;
      return {
        panelOverflow: getComputedStyle(panel).overflowY,
        listOverflow: getComputedStyle(list).overflowY,
        listScrolls: list.scrollHeight > list.clientHeight && list.scrollTop > before,
        listContained: listRect.top >= panelRect.top - 1 && listRect.bottom <= panelRect.bottom + 1,
        lineCount: list.querySelectorAll('.combat-feed-line').length
      };
    })()`);
    record(
      'Combat Feed has one contained scroll area without panel clipping',
      feedProbe?.panelOverflow === 'visible'
        && feedProbe?.listOverflow === 'auto'
        && feedProbe?.listScrolls === true
        && feedProbe?.listContained === true
        && feedProbe?.lineCount === 3,
      JSON.stringify(feedProbe)
    );

    const sellAllProbe = await evaluate(client, `(() => {
      const originalConfirm = window.confirm;
      const confirmations = [];
      try {
        S.player.inventory = [
          { id:'smoke-sellable', name:'Smoke Helm', slot:'helm', rarity:'common', level:1, rating:1, value:10, stats:{ guard:1 }, tags:[] },
          { id:'smoke-protected', name:'Protected Helm', slot:'helm', rarity:'common', level:1, rating:1, value:10, protected:true, stats:{ guard:1 }, tags:['protected'] }
        ];
        window.confirm = message => { confirmations.push(String(message)); return true; };
        document.getElementById('tab-gear')?.click();
        const button = document.getElementById('sellAllGearBtn');
        if (!button) return { buttonFound:false, confirmations };
        button.click();
        return {
          buttonFound: true,
          confirmations,
          sold: !S.player.inventory.some(item => item.id === 'smoke-sellable'),
          protectedKept: S.player.inventory.some(item => item.id === 'smoke-protected')
        };
      } finally {
        window.confirm = originalConfirm;
      }
    })()`);
    record(
      'Sell All asks once and preserves protected gear',
      sellAllProbe?.buttonFound === true
        && sellAllProbe?.confirmations?.length === 1
        && /cannot be undone/i.test(sellAllProbe.confirmations[0] || '')
        && sellAllProbe?.sold === true
        && sellAllProbe?.protectedKept === true,
      JSON.stringify(sellAllProbe)
    );

    record('No uncaught click-time console/runtime errors', runtimeExceptions.length === 0 && consoleIssues.length === 0 && networkFailures.length === 0, JSON.stringify({ runtimeExceptions, consoleIssues, networkFailures }));

    const diagnostics = { pageUrl, before, clickResult, after, runtimeExceptions, consoleIssues, networkFailures, results };
    const failed = printSummary();
    if (failed || VERBOSE) console.log(JSON.stringify(diagnostics, null, 2));
    if (failed) process.exitCode = 1;
  } finally {
    try { if (client) client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => server.close(resolve)); } catch {}
  }
}

main().catch(err => {
  console.error('Enter Dungeon runtime smoke failed during setup or execution:');
  console.error(err?.stack || String(err));
  if (!results.length) console.log('Enter Dungeon runtime smoke: 0/0 passing, 1 failing');
  process.exitCode = 1;
});
