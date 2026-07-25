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
  if (ext === '.js') return 'application/javascript; charset=utf-8';
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
        close() { socket.close(); }
      });
    };
    socket.onerror = error => { if (!opened) reject(error); };
    socket.onmessage = event => {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (!message.id) return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message || 'CDP error'));
      else entry.resolve(message.result || {});
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

async function waitForRuntime(client) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(client, `typeof render === 'function' && typeof S !== 'undefined' && !!window.DungeonDexDebtCollector`)) return;
    } catch {}
    await sleep(150);
  }
  throw new Error('DungeonDex runtime did not initialize its Debt Collector API.');
}

async function main() {
  const chromePath = browserPath();
  assert.ok(chromePath, 'Chrome or Chromium is required for the Debt/Talent compatibility smoke.');

  let server;
  let chrome;
  let client;
  let profileDir = '';
  try {
    const serverResult = await startServer();
    server = serverResult.server;
    const debugPort = await pickPort();
    profileDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-debt-talent-'));
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
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: serverResult.url });
    await waitForRuntime(client);

    const audit = await evaluate(client, `(() => {
      const runtimeBefore = JSON.stringify({ player: S.player, run: S.run });
      const debt = window.DungeonDexDebtCollector?.smoke?.();
      const runtimeAfterDebt = JSON.stringify({ player: S.player, run: S.run });

      const talentFixture = JSON.parse(JSON.stringify(S));
      talentFixture.player.talents = { pointsEarned: 99, pointsSpent: 77, unlocked: { legacy: true }, spent: { legacy: true }, unlockedIds: ['legacy'] };
      talentFixture.player.talentLedger = { version: 9, unlocked: true, previewOnly: false, lifetimePoints: 99, availablePoints: 77, spentPoints: 22, earnedSources: ['legacy'], awardClaims: { legacy: true }, notes: ['Keep this note'] };
      talentFixture.player.talentEarning = { enabled: true, sourceId: 'legacy_live_talent', milestonesReached: { 10: true }, pointsAwarded: 99 };
      talentFixture.player.talentUnlockIds = ['legacy', 'legacy'];
      talentFixture.player.talentLearnedIds = { legacy: true };
      const gameplayBefore = JSON.stringify({ gold: talentFixture.player.gold, stats: talentFixture.player.stats, run: talentFixture.run });
      const summary = talentSummary(talentFixture);
      const ledger = talentPointLedger(talentFixture);
      const earned = grantTalentPoints(talentFixture, 9);
      const unlocked = unlockTalent(talentFixture, 'legacy');
      const available = getAvailableTalentPoints(talentFixture);
      const hasLegacy = hasTalent(talentFixture, 'legacy');
      const bonuses = getTalentBonuses(talentFixture);
      const gameplayAfter = JSON.stringify({ gold: talentFixture.player.gold, stats: talentFixture.player.stats, run: talentFixture.run });
      const runtimeAfterTalent = JSON.stringify({ player: S.player, run: S.run });
      return {
        debt,
        debtDidNotMutateLiveState: runtimeBefore === runtimeAfterDebt,
        talent: {
          summary,
          ledger,
          earning: talentFixture.player.talentEarning,
          earned,
          unlocked,
          available,
          hasLegacy,
          bonuses,
          gameplayUnchanged: gameplayBefore === gameplayAfter,
          liveStateUnchanged: runtimeBefore === runtimeAfterTalent
        }
      };
    })()`);

    record('Debt Collector contract keeps borrowing, repayment, pressure, persistence, and combat state protected', audit.debt?.ok === true, JSON.stringify(audit.debt?.checks || audit.debt || {}));
    record('Debt Collector contract smoke does not mutate the live runtime state', audit.debtDidNotMutateLiveState === true, String(audit.debtDidNotMutateLiveState));
    const talent = audit.talent || {};
    const zeroBonuses = Object.values(talent.bonuses || {}).every(value => Number(value) === 0);
    const talentCompatibilityOnly = talent.summary?.pointsEarned === 0
      && talent.summary?.pointsSpent === 0
      && talent.summary?.pointsAvailable === 0
      && Array.isArray(talent.summary?.unlockedIds) && talent.summary.unlockedIds.length === 0
      && talent.ledger?.previewOnly === true
      && talent.ledger?.unlocked === false
      && talent.ledger?.lifetimePoints === 0
      && talent.ledger?.availablePoints === 0
      && talent.ledger?.spentPoints === 0
      && talent.earning?.enabled === false
      && talent.earning?.sourceId === 'deprecated_talent_system'
      && talent.earning?.pointsAwarded === 0
      && talent.earned === 0
      && talent.unlocked === false
      && talent.available === 0
      && talent.hasLegacy === false
      && zeroBonuses;
    record('Talent compatibility state remains preview-only with no earn, spend, unlock, or gameplay bonus', talentCompatibilityOnly, JSON.stringify(talent));
    record('Talent compatibility repair does not mutate gameplay fields or the live runtime state', talent.gameplayUnchanged === true && talent.liveStateUnchanged === true, JSON.stringify({ gameplayUnchanged: talent.gameplayUnchanged, liveStateUnchanged: talent.liveStateUnchanged }));
  } finally {
    try { client?.close(); } catch {}
    try { chrome?.kill(); } catch {}
    try { await new Promise(resolve => server ? server.close(resolve) : resolve()); } catch {}
    try { if (profileDir) await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } catch {}
  }

  const failed = results.filter(result => !result.ok);
  console.log(`Debt/Talent compatibility smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
