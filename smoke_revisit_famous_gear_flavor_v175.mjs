#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const BUILD_QS = '1.23.8.03-gear-identity-compare-clarity';
const FLAVOR_PATH = 'js/systems/37_revisit_famous_gear_flavor_pack.js';
const SCRIPT_SRC = `./${FLAVOR_PATH}?build=${BUILD_QS}`;
const ASSET_SRC = `./${FLAVOR_PATH}?build=${'${BUILD_QS}'}`;
const results = [];

function record(name, ok, detail = ''){
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}
function countMatches(text, needle){ return String(text || '').split(needle).length - 1; }
function indexOfRequired(text, needle){ const index = String(text || '').indexOf(needle); return index >= 0 ? index : Number.POSITIVE_INFINITY; }

async function main(){
  const [indexHtml, serviceWorker, flavor] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'sw.js'), 'utf8'),
    readFile(path.join(ROOT, FLAVOR_PATH), 'utf8')
  ]);

  const scriptCount = countMatches(indexHtml, SCRIPT_SRC);
  const assetCount = countMatches(serviceWorker, ASSET_SRC);
  const afterArchiveCodex = indexOfRequired(indexHtml, `./js/systems/36_ui_revisit_archive_codex.js?build=${BUILD_QS}`) < indexOfRequired(indexHtml, SCRIPT_SRC);
  const beforeCrafting = indexOfRequired(indexHtml, SCRIPT_SRC) < indexOfRequired(indexHtml, `./js/systems/16_relic_forge_crafting.js?build=${BUILD_QS}`);

  record('Famous Gear flavor pack is loaded once by index.html', scriptCount === 1, `scriptCount=${scriptCount}`);
  record('Famous Gear flavor pack loads after Archive Codex and before crafting systems', afterArchiveCodex && beforeCrafting, JSON.stringify({ afterArchiveCodex, beforeCrafting }));
  record('Famous Gear flavor pack is cached once by service worker', assetCount === 1, `assetCount=${assetCount}`);

  record('Flavor pack declares text-only safety scope', /Text-only/i.test(flavor) && /combat, rewards/.test(flavor) && /gear stats/.test(flavor), 'header contract');
  record('Flavor pack wraps only Famous Gear start and complete APIs', /api\.startFamousGear\s*=\s*function startFamousGearWithFlavor/.test(flavor) && /api\.completeFamousGear\s*=\s*function completeFamousGearWithFlavor/.test(flavor), 'wrappers');
  record('Flavor pack stores only memory copy fields on active memories', /active\.memoryTitle\s*=/.test(flavor) && /active\.summaryLine\s*=/.test(flavor) && /active\.reflection\s*=/.test(flavor), 'active copy fields');
  record('Flavor pack stores only memory copy fields on completed results', /result\.memoryTitle\s*=/.test(flavor) && /result\.reflection\s*=/.test(flavor), 'result copy fields');
  record('Flavor pack includes slot and rarity-specific copy hooks', /function slotLine/.test(flavor) && /function rarityLine/.test(flavor), 'flavor hooks');
  record('Flavor pack keeps no-reward copy explicit', /No stats move/.test(flavor) && /No reward path opens/.test(flavor) && /item remains retired/.test(flavor), 'safe copy');

  const forbiddenPowerMutation = [
    /\.maxHp\s*=/i,
    /\.hp\s*=/i,
    /\.damage\s*=/i,
    /rewardGold\s*=/i,
    /rewardXp\s*=/i,
    /rewardShard\s*=/i,
    /addPlayerGold/i,
    /DungeonDexTalents/i,
    /talentLedger/i,
    /talentLearned/i,
    /debtCollector\s*=/i,
    /player\.depth\s*=/i,
    /safeExtractDepth\s*=/i,
    /item\.rating\s*=/i,
    /item\.level\s*=/i,
    /item\.value\s*=/i,
    /completedKeys\s*\[/i,
    /memoryMarks\s*(?:=|\+=|\+\+)/i
  ].filter(pattern => pattern.test(flavor));
  record('Flavor pack does not mutate combat, economy, Talent, debt, progression, gear stats, or reward counters', forbiddenPowerMutation.length === 0, forbiddenPowerMutation.map(pattern => String(pattern)).join(', '));

  const failed = results.filter(result => !result.ok);
  console.log(`\nFamous Gear flavor smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
