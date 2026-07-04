#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const BUILD_QS = '1.23.4-boss-trophy-v1-completion';
const CODEX_PATH = 'js/systems/36_ui_revisit_archive_codex.js';
const SCRIPT_SRC = `./${CODEX_PATH}?build=${BUILD_QS}`;
const ASSET_SRC = `./${CODEX_PATH}?build=${'${BUILD_QS}'}`;
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function countMatches(text, needle) {
  return String(text || '').split(needle).length - 1;
}

function indexOfRequired(text, needle) {
  const index = String(text || '').indexOf(needle);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

async function main() {
  const [indexHtml, serviceWorker, codex] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'sw.js'), 'utf8'),
    readFile(path.join(ROOT, CODEX_PATH), 'utf8')
  ]);

  const scriptCount = countMatches(indexHtml, SCRIPT_SRC);
  const assetCount = countMatches(serviceWorker, ASSET_SRC);
  const scriptAfterArchiveRenderer = indexOfRequired(indexHtml, `./js/systems/15_devtools_balance_reports.js?build=${BUILD_QS}`) < indexOfRequired(indexHtml, SCRIPT_SRC);
  const scriptBeforeCrafting = indexOfRequired(indexHtml, SCRIPT_SRC) < indexOfRequired(indexHtml, `./js/systems/16_relic_forge_crafting.js?build=${BUILD_QS}`);

  record('Archive Codex system 36 is loaded once by index.html', scriptCount === 1, `scriptCount=${scriptCount}`);
  record('Archive Codex loads after archive renderer helpers and before crafting systems', scriptAfterArchiveRenderer && scriptBeforeCrafting, JSON.stringify({ scriptAfterArchiveRenderer, scriptBeforeCrafting }));
  record('Archive Codex system 36 is cached once by service worker', assetCount === 1, `assetCount=${assetCount}`);

  record('Archive Codex declares a display-only Revisit ledger', /Revisit Archive Codex/i.test(codex) && /read-only archive ledger/i.test(codex) && /Display-only/i.test(codex), 'header contract');
  record('Archive Codex exposes only render/injection flags', /window\.DDRevisitArchiveCodex\s*=\s*true/.test(codex) && /window\.DDRevisitArchiveCodexRender\s*=\s*injectArchiveCodex/.test(codex), 'DDRevisitArchiveCodex exports');
  record('Ledger copy includes the three current Revisit memory lanes', /Trophy Echo/.test(codex) && /Famous Gear Memory/.test(codex) && /Rival Trace/.test(codex), 'lane labels');
  record('Ledger copy includes empty, active, and history states', /No Revisit memories recorded yet/.test(codex) && /Active/.test(codex) && /history\.slice\(0, 4\)/.test(codex), 'ledger states');
  record('Ledger injects into Archive before Emberfall Notes', /Emberfall Notes/i.test(codex) && /insertAdjacentHTML\('beforebegin', html\)/.test(codex), 'archive placement');

  const forbiddenUi = [
    /<button\b/i,
    /data-start-revisit/i,
    /data-complete-/i,
    /onclick\s*=/i,
    /addEventListener\(\s*['"]click/i
  ].filter(pattern => pattern.test(codex));
  record('Archive Codex adds no buttons or live Revisit controls', forbiddenUi.length === 0, forbiddenUi.map(pattern => String(pattern)).join(', '));

  const forbiddenMutation = [
    /\bsave\s*\(/i,
    /localStorage\.setItem/i,
    /window\.S\s*=/i,
    /\bS\.player\s*=/i,
    /state\.player\s*=/i,
    /DungeonDexEliteContracts\.[A-Za-z0-9_$]+\s*=/i,
    /memoryMarks\s*(?:=|\+=|\+\+)/i,
    /completedKeys\s*\[/i
  ].filter(pattern => pattern.test(codex));
  record('Archive Codex has no save, route, reward, or player-state mutation hooks', forbiddenMutation.length === 0, forbiddenMutation.map(pattern => String(pattern)).join(', '));

  const failed = results.filter(result => !result.ok);
  console.log(`\nRevisit Archive Codex smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
