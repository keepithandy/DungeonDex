#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const BUILD_QS = '1.23.8-merchant-gear-upgrades-replace-talent-system';

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
  const [indexHtml, appJs, swJs] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'app.js'), 'utf8'),
    readFile(path.join(ROOT, 'sw.js'), 'utf8')
  ]);

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

  console.log(`PASS index.html scripts and dynamic runtime assets are present in sw.js cache manifest (${uniqueDirectScripts.length + uniqueLoads.length} checked)`);
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
