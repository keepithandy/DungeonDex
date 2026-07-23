#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VISIBLE_BUILD = '1.26.4.04';
const RELEASE_NAME = 'Boss Curve Release';
const RELEASE_LABEL = `v${VISIBLE_BUILD} ${RELEASE_NAME}`;
const BUILD_QS = '1.26.4.04-boss-curve-release';
const DEVTOOLS_ONLY_ASSETS = [
  './js/systems/13_devtools_overlay.js?build=' + BUILD_QS,
  './js/systems/14_devtools_scenarios.js?build=' + BUILD_QS,
  './js/systems/15_devtools_balance_reports.js?build=' + BUILD_QS,
  './js/systems/43_devkit_reset_hold.js?build=' + BUILD_QS
];

function extractMatches(source, regex) {
  const out = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = re.exec(source))) out.push(match);
  return out;
}

function capture(source, regex) {
  const match = String(source || '').match(regex);
  return match ? String(match[1]).trim() : '<missing>';
}

function sectionValue(source, heading) {
  const lines = String(source || '').split(/\r?\n/);
  const headingIndex = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (headingIndex < 0) return '<missing>';
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const value = lines[index].trim();
    if (!value) continue;
    if (value.startsWith('#')) return '<missing>';
    return value.replace(/^`|`$/g, '');
  }
  return '<missing>';
}

function normalizeAssetPath(asset) {
  const value = String(asset || '');
  return value.startsWith('./') ? value : `./${value.replace(/^\/+/, '')}`;
}

function expandSwAsset(asset) {
  return normalizeAssetPath(String(asset || '').replaceAll('${BUILD_QS}', BUILD_QS));
}

function directAssetRecords(source, regex, kind) {
  return extractMatches(source, regex).map(match => ({
    kind,
    path: normalizeAssetPath(match[1]),
    query: match[2] || ''
  }));
}

function found(value) {
  return value === '' ? '<missing>' : String(value);
}

async function main() {
  const files = {
    'index.html': 'index.html',
    'app.js': 'app.js',
    'sw.js': 'sw.js',
    'VERSION.md': 'VERSION.md',
    'README.md': 'README.md',
    'CHANGELOG.md': 'CHANGELOG.md',
    'docs/status/CURRENT_NOTES.md': 'docs/status/CURRENT_NOTES.md',
    'docs/VERSION_CACHE_AUTHORITY.md': 'docs/VERSION_CACHE_AUTHORITY.md',
    'js/systems/00_core_constants_data.js': 'js/systems/00_core_constants_data.js',
    'js/systems/21_build_label_guard.js': 'js/systems/21_build_label_guard.js',
    'tools/build_itch_ready.ps1': 'tools/build_itch_ready.ps1',
    'tools/make_release_zip.ps1': 'tools/make_release_zip.ps1',
    'tools/make_release_zip.py': 'tools/make_release_zip.py',
    'tools/check_dungeondex_package.py': 'tools/check_dungeondex_package.py'
  };
  const entries = await Promise.all(Object.entries(files).map(async ([label, relative]) => [
    label,
    await readFile(path.join(ROOT, relative), 'utf8')
  ]));
  const source = Object.fromEntries(entries);
  const indexHtml = source['index.html'];
  const appJs = source['app.js'];
  const swJs = source['sw.js'];
  const version = source['VERSION.md'];
  const readme = source['README.md'];
  const changelog = source['CHANGELOG.md'];
  const notes = source['docs/status/CURRENT_NOTES.md'];
  const authority = source['docs/VERSION_CACHE_AUTHORITY.md'];
  const coreConstants = source['js/systems/00_core_constants_data.js'];
  const buildLabelGuard = source['js/systems/21_build_label_guard.js'];
  const itchBuilder = source['tools/build_itch_ready.ps1'];
  const releasePs1 = source['tools/make_release_zip.ps1'];
  const releasePy = source['tools/make_release_zip.py'];
  const packageChecker = source['tools/check_dungeondex_package.py'];
  const failures = [];

  function expect(file, field, actual, expected) {
    if (actual !== expected) failures.push({ file, field, actual: found(actual), expected });
  }

  expect('VERSION.md', 'Current Public/Live Version', sectionValue(version, 'Current Public/Live Version'), RELEASE_LABEL);
  expect('VERSION.md', 'Current Local Package Version', sectionValue(version, 'Current Local Package Version'), RELEASE_LABEL);
  expect('VERSION.md', 'Current Development Target', sectionValue(version, 'Current Development Target'), RELEASE_LABEL);
  expect('VERSION.md', 'Current Build/Cache Label', sectionValue(version, 'Current Build/Cache Label'), BUILD_QS);
  expect('README.md', 'Current baseline', capture(readme, /Current baseline:\s+\*\*DungeonDex (v[^*]+)\*\*/), `v${VISIBLE_BUILD}`);
  expect('CHANGELOG.md', 'Public/live itch version', capture(changelog, /Public\/live itch version:\s+`([^`]+)`/), RELEASE_LABEL);
  expect('CHANGELOG.md', 'Current local package baseline', capture(changelog, /Current local package baseline:\s+`([^`]+)`/), RELEASE_LABEL);
  expect('CHANGELOG.md', 'Current development target', capture(changelog, /Current development target:\s+`([^`]+)`/), RELEASE_LABEL);
  expect('CHANGELOG.md', 'Current build/cache label', capture(changelog, /Current build\/cache label:\s+`([^`]+)`/), BUILD_QS);
  expect('docs/status/CURRENT_NOTES.md', 'Current Baseline', capture(notes, /## Current Baseline\s*\r?\n- DungeonDex ([^\r\n]+)/), `v${VISIBLE_BUILD} - ${RELEASE_NAME}`);
  expect('docs/status/CURRENT_NOTES.md', 'Build/cache label', capture(notes, /Build\/cache labels use `([^`]+)`/), BUILD_QS);
  expect('index.html', 'title version', capture(indexHtml, /<title>DungeonDex v([^<]+)<\/title>/), VISIBLE_BUILD);
  expect('index.html', 'visible h1 version', capture(indexHtml, /<h1[^>]*id="buildTag"[^>]*>DungeonDex v([^<]+)<\/h1>/), VISIBLE_BUILD);
  expect('index.html', 'DUNGEONDEX_BUILD', capture(indexHtml, /window\.DUNGEONDEX_BUILD\s*=\s*'([^']+)'/), VISIBLE_BUILD);
  expect('index.html', 'DUNGEONDEX_BUILD_QS', capture(indexHtml, /window\.DUNGEONDEX_BUILD_QS\s*=\s*'([^']+)'/), BUILD_QS);
  expect('app.js', 'DUNGEONDEX_BUILD', capture(appJs, /window\.DUNGEONDEX_BUILD\s*=\s*'([^']+)'/), VISIBLE_BUILD);
  expect('app.js', 'DUNGEONDEX_BUILD_QS', capture(appJs, /window\.DUNGEONDEX_BUILD_QS\s*=\s*'([^']+)'/), BUILD_QS);
  expect('app.js', 'loadExtensions BUILD_QS fallback', capture(appJs, /var qs\s*=\s*window\.DUNGEONDEX_BUILD_QS\s*\|\|\s*'([^']+)'/), BUILD_QS);
  expect('js/systems/00_core_constants_data.js', 'BUILD', capture(coreConstants, /const BUILD\s*=\s*'([^']+)'/), VISIBLE_BUILD);
  expect('js/systems/00_core_constants_data.js', 'VISIBLE_VERSION_LABEL', capture(coreConstants, /const VISIBLE_VERSION_LABEL\s*=\s*'([^']+)'/), `DungeonDex v${VISIBLE_BUILD}`);
  expect('js/systems/21_build_label_guard.js', 'BUILD', capture(buildLabelGuard, /const BUILD\s*=\s*'([^']+)'/), VISIBLE_BUILD);
  expect('js/systems/21_build_label_guard.js', 'BUILD_QS', capture(buildLabelGuard, /const BUILD_QS\s*=\s*'([^']+)'/), BUILD_QS);
  expect('sw.js', 'CACHE_NAME', capture(swJs, /const CACHE_NAME\s*=\s*'([^']+)'/), `dungeondex-v${BUILD_QS}`);
  expect('sw.js', 'BUILD_QS', capture(swJs, /const BUILD_QS\s*=\s*'([^']+)'/), BUILD_QS);

  const authorityContracts = [
    ['docs/VERSION_CACHE_AUTHORITY.md', 'target build/cache label', authority.includes(BUILD_QS)],
    ['tools/build_itch_ready.ps1', 'reads VERSION.md', itchBuilder.includes('VERSION.md') && itchBuilder.includes('Read-DungeonDexVersion')],
    ['tools/build_itch_ready.ps1', 'derives versioned output name', itchBuilder.includes('DungeonDex_${version}_ItchReady.zip')],
    ['tools/check_dungeondex_package.py', 'reads VERSION build/cache authority', packageChecker.includes('Current Build/Cache Label')],
    ['tools/make_release_zip.ps1', 'keeps generic package name', releasePs1.includes('DungeonDex.zip')],
    ['tools/make_release_zip.py', 'keeps generic package name', releasePy.includes('OUTPUT_NAME = "DungeonDex.zip"')]
  ];
  authorityContracts.forEach(([file, field, ok]) => expect(file, field, ok ? 'present' : '<missing>', 'present'));

  const directScripts = directAssetRecords(
    indexHtml,
    /<script\s+src=["']([^"']+?\.js)(?:\?build=([^"']+))?["']/g,
    'script'
  );
  const directStyles = directAssetRecords(
    indexHtml,
    /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+?\.css)(?:\?build=([^"']+))?["']/g,
    'stylesheet'
  );
  [...directScripts, ...directStyles].forEach(asset => {
    expect('index.html', `${asset.kind} ${asset.path} build query`, asset.query, BUILD_QS);
  });

  const swAssetTemplates = extractMatches(swJs, /`([^`]+)`/g).map(match => match[1]);
  swAssetTemplates.filter(asset => asset.includes('?build=')).forEach(asset => {
    const query = capture(asset, /\?build=([^\s]+)/);
    if (query !== '${BUILD_QS}' && query !== BUILD_QS) {
      failures.push({ file: 'sw.js', field: `ASSETS ${asset} build query`, actual: query, expected: '${BUILD_QS}' });
    }
  });
  const cacheAssets = new Set(swAssetTemplates.map(expandSwAsset));
  const directAssets = [...directScripts, ...directStyles].map(asset => `${asset.path}?build=${asset.query}`);
  directAssets.filter(asset => !cacheAssets.has(asset)).forEach(asset => {
    failures.push({ file: 'sw.js', field: `ASSETS entry for ${asset}`, actual: '<missing>', expected: asset });
  });

  const dynamicLoads = [...new Set(extractMatches(
    appJs,
    /loadModule\(\s*['"]([^'"]+\/js\/systems\/[^'"]+?\.js)\?build=/g
  ).map(match => `${normalizeAssetPath(match[1])}?build=${BUILD_QS}`))];
  dynamicLoads.filter(asset => !cacheAssets.has(asset) && !DEVTOOLS_ONLY_ASSETS.includes(asset)).forEach(asset => {
    failures.push({ file: 'sw.js', field: `dynamic runtime cache entry for ${asset}`, actual: '<missing>', expected: asset });
  });

  const directDevtools = directAssets.filter(asset => DEVTOOLS_ONLY_ASSETS.includes(asset));
  directDevtools.forEach(asset => failures.push({
    file: 'index.html',
    field: `public devtools exclusion for ${asset}`,
    actual: 'directly loaded',
    expected: 'not directly loaded'
  }));
  DEVTOOLS_ONLY_ASSETS.filter(asset => cacheAssets.has(asset)).forEach(asset => failures.push({
    file: 'sw.js',
    field: `public devtools cache exclusion for ${asset}`,
    actual: 'cached',
    expected: 'not cached'
  }));

  const gateContracts = [
    'window.DUNGEONDEX_DEVTOOLS_ENABLED = !!gate.enabled;',
    'window.DUNGEONDEX_DEVTOOLS_GATE = gate;',
    'if (window.DUNGEONDEX_DEVTOOLS_ENABLED) {',
    'window.DungeonDexComputeDevtoolsGate = window.DungeonDexComputeDevtoolsGate || function computeDevtoolsGate(locationLike){'
  ];
  gateContracts.filter(needle => !appJs.includes(needle)).forEach(needle => failures.push({
    file: 'app.js',
    field: 'devtools gate contract',
    actual: '<missing>',
    expected: needle
  }));

  const activeRuntimeSources = [indexHtml, appJs, swJs, coreConstants, buildLabelGuard];
  [
    '1.26.4-mobile-interface-release-hygiene',
    '1.26.3.01-boss-scaling-matrix-hardening'
  ].filter(staleLabel => activeRuntimeSources.some(text => text.includes(staleLabel))).forEach(staleLabel => {
    failures.push({
      file: 'active runtime',
      field: 'stale cache label',
      actual: staleLabel,
      expected: BUILD_QS
    });
  });

  const retiredRuntimePaths = [
    'js/systems/20_town_currency_clean_strip.js',
    'js/systems/26_spark_writ_pill_cleanup.js',
    'js/systems/27_interface_density_cleanup.js'
  ];
  retiredRuntimePaths.forEach(retiredPath => {
    expect(retiredPath, 'retired file', existsSync(path.join(ROOT, retiredPath)) ? 'present' : 'absent', 'absent');
    for (const [file, runtimeSource] of [['index.html', indexHtml], ['app.js', appJs], ['sw.js', swJs]]) {
      expect(file, `retired runtime reference ${retiredPath}`, runtimeSource.includes(retiredPath) ? 'present' : 'absent', 'absent');
    }
  });

  if (failures.length) {
    console.error(`FAIL: ${failures.length} v1.26.4.04 build/cache authority mismatch(es):`);
    failures.forEach(({ file, field, expected, actual }) => {
      console.error(`- ${file}: ${field} — expected ${JSON.stringify(expected)}; found ${JSON.stringify(actual)}`);
    });
    process.exit(1);
  }

  console.log(`PASS v${VISIBLE_BUILD}: VERSION authority, runtime/cache labels, ${directAssets.length} direct assets, ${dynamicLoads.length} dynamic loads, package derivation, and public DevTools exclusions align.`);
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
