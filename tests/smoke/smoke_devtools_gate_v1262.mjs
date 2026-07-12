#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function buildGateFunction(source) {
  const match = source.match(/window\.DungeonDexComputeDevtoolsGate = window\.DungeonDexComputeDevtoolsGate \|\| function computeDevtoolsGate\(locationLike\)\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Unable to locate DungeonDexComputeDevtoolsGate in app.js');
  return new Function('locationLike', match[1]);
}

async function main() {
  const [appJs, overlay, scenarios, reports, resetHold] = await Promise.all([
    readFile(path.join(ROOT, 'app.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/13_devtools_overlay.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/14_devtools_scenarios.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/15_devtools_balance_reports.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/43_devkit_reset_hold.js'), 'utf8')
  ]);

  const computeGate = buildGateFunction(appJs);

  const publicGate = computeGate({ protocol: 'https:', hostname: 'dungeondex.example', search: '' });
  const localGate = computeGate({ protocol: 'http:', hostname: '127.0.0.1', search: '' });
  const fileGate = computeGate({ protocol: 'file:', hostname: '', search: '' });
  const queryGate = computeGate({ protocol: 'https:', hostname: 'dungeondex.example', search: '?devtools=1' });
  const explicitOffGate = computeGate({ protocol: 'http:', hostname: 'localhost', search: '?devtools=0' });
  const legacyQueryGate = computeGate({ protocol: 'https:', hostname: 'dungeondex.example', search: '?dev=1' });

  record('Public hosted runtime keeps devtools disabled by default', publicGate.enabled === false && publicGate.reason === 'public', JSON.stringify(publicGate));
  record('Localhost runtime can intentionally use devtools', localGate.enabled === true && localGate.reason === 'localhost', JSON.stringify(localGate));
  record('Direct file review can intentionally use devtools', fileGate.enabled === true && fileGate.reason === 'file-review', JSON.stringify(fileGate));
  record('Explicit ?devtools=1 enables devtools on hosted runtime', queryGate.enabled === true && queryGate.reason === 'query-enabled', JSON.stringify(queryGate));
  record('Legacy ?dev=1 continues to enable devtools intentionally', legacyQueryGate.enabled === true && legacyQueryGate.reason === 'query-enabled', JSON.stringify(legacyQueryGate));
  record('Explicit query-off overrides localhost devtools access', explicitOffGate.enabled === false && explicitOffGate.reason === 'query-disabled', JSON.stringify(explicitOffGate));

  [
    ['overlay', overlay],
    ['scenario presets', scenarios],
    ['balance reports', reports],
    ['reset hold', resetHold]
  ].forEach(([label, source]) => {
    record(`${label} module defends itself behind the shared runtime gate`, source.includes('if (!window.DUNGEONDEX_DEVTOOLS_ENABLED) return;'), label);
  });

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nDevtools gate smoke: ${passed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
