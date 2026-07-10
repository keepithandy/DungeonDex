#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const VISIBLE_BUILD = '1.23.8.09';
const BUILD_QS = '1.23.8.09-build-label-alignment';

function extractMatches(source, regex) {
  const out = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = re.exec(source))) out.push(match);
  return out;
}

function normalizeAsset(asset) {
  return String(asset || '')
    .replace(/^\.\//, './')
    .replace(/\?build=[^'"\s)]+/g, `?build=${BUILD_QS}`);
}

async function main() {
  const [indexHtml, appJs, swJs, buildLabelGuard] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'app.js'), 'utf8'),
    readFile(path.join(ROOT, 'sw.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/21_build_label_guard.js'), 'utf8')
  ]);

  const labelContracts = [
    ['index.html title', indexHtml, `<title>DungeonDex v${VISIBLE_BUILD}</title>`],
    ['index.html visible label', indexHtml, `>DungeonDex v${VISIBLE_BUILD}</h1>`],
    ['index.html visible build', indexHtml, `window.DUNGEONDEX_BUILD = '${VISIBLE_BUILD}'`],
    ['index.html cache query', indexHtml, `window.DUNGEONDEX_BUILD_QS = '${BUILD_QS}'`],
    ['app.js visible build', appJs, `window.DUNGEONDEX_BUILD = '${VISIBLE_BUILD}'`],
    ['app.js cache query', appJs, `window.DUNGEONDEX_BUILD_QS = '${BUILD_QS}'`],
    ['build label guard visible build', buildLabelGuard, `const BUILD = '${VISIBLE_BUILD}'`],
    ['build label guard cache query', buildLabelGuard, `const BUILD_QS = '${BUILD_QS}'`],
    ['service worker cache name', swJs, `const CACHE_NAME = 'dungeondex-v${BUILD_QS}'`],
    ['service worker cache query', swJs, `const BUILD_QS = '${BUILD_QS}'`]
  ];
  const labelMismatches = labelContracts.filter(([, source, expected]) => !source.includes(expected));
  if (labelMismatches.length) {
    console.error('Mixed or stale build labels detected:');
    labelMismatches.forEach(([label, , expected]) => console.error(`- ${label}: expected ${expected}`));
    process.exit(1);
  }

  const directScripts = extractMatches(
    indexHtml,
    /<script\s+src=["']([^"']+?\.js)(?:\?build=([^"']+))?["']/g
  ).map(match => normalizeAsset(`${match[1]}?build=${match[2] || BUILD_QS}`));

  const dynamicLoads = extractMatches(
    appJs,
    /loadModule\(\s*['"]([^'"]+\/js\/systems\/[^'"]+?\.js)(?:\?build=([^'"]+))?['"]/g
  ).map(match => normalizeAsset(`${match[1]}?build=${match[2] || BUILD_QS}`));

  const cacheAssets = new Set(
    extractMatches(swJs, /`([^`]+)`/g)
      .map(match => match[1])
      .map(normalizeAsset)
  );

  const uniqueLoads = [...new Set(dynamicLoads)];
  const uniqueDirectScripts = [...new Set(directScripts)];
  const missingDirect = uniqueDirectScripts.filter(asset => !cacheAssets.has(asset));
  const missing = uniqueLoads.filter(asset => !cacheAssets.has(asset));

  if (missingDirect.length) {
    console.error('Missing service-worker cache entries for direct index.html scripts:');
    missingDirect.forEach(asset => console.error(`- ${asset}`));
    process.exit(1);
  }

  if (missing.length) {
    console.error('Missing service-worker cache entries for dynamic runtime assets:');
    missing.forEach(asset => console.error(`- ${asset}`));
    process.exit(1);
  }

  console.log(`PASS visible build/cache labels align and runtime assets are present in sw.js cache manifest (${uniqueDirectScripts.length + uniqueLoads.length} checked)`);
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
