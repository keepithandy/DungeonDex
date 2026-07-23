#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function compact(source) {
  return String(source || '').replace(/\s+/g, '');
}

async function main() {
  const [navSource, harnessSource, indexSource] = await Promise.all([
    readFile(path.join(ROOT, 'js', 'systems', '22_nav_centering.js'), 'utf8'),
    readFile(path.join(ROOT, 'tools', 'capture_town_mobile_screenshots.mjs'), 'utf8'),
    readFile(path.join(ROOT, 'index.html'), 'utf8')
  ]);

  const nav = compact(navSource);
  const harness = compact(harnessSource);
  const routeOrder = Array.from(indexSource.matchAll(/<button class="tab(?: active)?" data-screen="([^"]+)"/g), match => match[1]);

  record(
    'Guild navigation destinations and order stay unchanged',
    JSON.stringify(routeOrder) === JSON.stringify(['town', 'run', 'gear', 'dex', 'archive']),
    routeOrder.join(' -> ')
  );

  record(
    'Closed fine-pointer rail reserves a content gutter only below the overlap boundary',
    nav.includes('@media(hover:hover)and(pointer:fine)and(max-width:940px)')
      && nav.includes('.app-shell:not(.combat-active){padding-left:calc(10px+var(--ddx-nav-rail-width)+env(safe-area-inset-left,0px))!important}'),
    'narrow fine-pointer app shell clears the visible rail width'
  );

  record(
    'Combat mode keeps the side navigation hidden',
    nav.includes('.app-shell.combat-active.tabs.panel,.app-shell.combat-activenav.tabs{display:none!important}'),
    'injected important rule cannot revive navigation over combat'
  );

  record(
    'Touch rail height uses dynamic viewport and both safe-area insets',
    nav.includes('max-height:calc(100vh-var(--ddx-nav-touch-top-offset)-var(--ddx-nav-touch-bottom-gap)-var(--safe-top,0px)-var(--safe-bottom,0px))!important')
      && nav.includes('max-height:calc(100dvh-var(--ddx-nav-touch-top-offset)-var(--ddx-nav-touch-bottom-gap)-var(--safe-top,0px)-var(--safe-bottom,0px))!important'),
    'vh fallback plus dvh override'
  );

  record(
    'Open touch navigation scrolls within its safe viewport',
    nav.includes('.tabs.panel.ddx-nav-open,nav.tabs.ddx-nav-open{overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'),
    'all route targets remain reachable on short screens'
  );

  record(
    'Touch navigation route targets retain a 44px minimum height',
    nav.includes('@media(hover:none),(pointer:coarse)')
      && nav.lastIndexOf('.tabs.panel.tab,nav.tabs.tab{min-height:44px!important}')
        > nav.lastIndexOf('min-height:31px!important'),
    'final touch rule wins over older compact-height rules'
  );

  record(
    'Touch navigation toggle has a 44px hitbox and the rail overlays content',
    nav.includes(':root{--ddx-nav-rail-width:44px;')
      && nav.includes('.ddx-nav-toggle{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}')
      && nav.includes('.tabs.panel,nav.tabs{left:env(safe-area-inset-left,0px)!important;')
      && nav.includes('.app-shell:not(.combat-active).ddx-main-viewport{padding-left:0!important}'),
    'the touch rail clears the safe inset without reserving a blank viewport gutter'
  );

  record(
    'Expanded touch drawer keeps padded route spacing and edge definition',
    nav.includes('.tabs.panel.ddx-nav-open,nav.tabs.ddx-nav-open{padding:58px12px12px10px!important;gap:8px!important;')
      && nav.includes('border:1pxsolidrgba(255,213,148,.22)!important;border-left:0!important;')
      && nav.includes('.tabs.panel.ddx-nav-open.tab,nav.tabs.ddx-nav-open.tab{min-height:46px!important;padding:10px12px!important;border-radius:11px!important}')
      && nav.includes('.ddx-nav-toggle{top:8px!important;right:7px!important;padding:0!important;'),
    'drawer padding does not reintroduce the content gutter'
  );

  const profilePairs = Array.from(
    harnessSource.matchAll(/\{\s*width:\s*(390|430|768),\s*height:\s*(844|932|1024)\s*\}/g),
    match => `${match[1]}x${match[2]}`
  );
  record(
    'Screenshot harness uses realistic phone and tablet viewport profiles',
    JSON.stringify(profilePairs) === JSON.stringify(['390x844', '430x932', '768x1024'])
      && !harnessSource.includes('SCREENSHOT_HEIGHT'),
    profilePairs.join(', ')
  );

  const applyStart = harnessSource.indexOf('async function applyTouchProfile');
  const assertStart = harnessSource.indexOf('async function assertTouchProfile');
  const applySource = harnessSource.slice(applyStart, assertStart);
  record(
    'Touch emulation is enabled before device metrics are applied',
    applyStart >= 0
      && applySource.indexOf("Emulation.setTouchEmulationEnabled") >= 0
      && applySource.indexOf("Emulation.setTouchEmulationEnabled") < applySource.indexOf("Emulation.setDeviceMetricsOverride"),
    'coarse-pointer media state is established with each profile'
  );

  const mainSource = harnessSource.slice(harnessSource.indexOf('async function main()'));
  const initialProfileIndex = mainSource.indexOf('await applyTouchProfile(client, MOBILE_PROFILES[0]);');
  const navigateIndex = mainSource.indexOf("await client.send('Page.navigate'");
  record(
    'Initial mobile profile is applied before navigation',
    initialProfileIndex >= 0 && navigateIndex > initialProfileIndex,
    'first load evaluates mobile media queries under touch metrics'
  );

  record(
    'Every capture profile is applied before its reload',
    /for \(const profile of MOBILE_PROFILES\) \{[\s\S]*?await applyTouchProfile\(client, profile\);[\s\S]*?await client\.send\('Page\.reload'/.test(mainSource),
    'each width reloads under its target geometry'
  );

  record(
    'Harness verifies touch media and viewport dimensions before capture',
    harness.includes("window.matchMedia('(hover:none),(pointer:coarse)').matches")
      && harness.includes('actual?.maxTouchPoints<1')
      && harness.includes('actual?.width===profile.width')
      && harness.includes("awaitassertTouchProfile(client,profile);"),
    'false desktop-pointer captures fail fast'
  );

  record(
    'Harness provides an explicit narrow fine-pointer verification mode',
    harness.includes("constFINE_POINTER_MODE=process.argv.includes('--fine-pointer')")
      && harness.includes("window.matchMedia('(hover:hover)and(pointer:fine)').matches")
      && harness.includes('actual?.maxTouchPoints!==0')
      && harness.includes('awaitapplyFinePointerProfile(client,profile);')
      && harness.includes('awaitassertFinePointerProfile(client,profile);'),
    'desktop-pointer captures cannot be mistaken for touch captures'
  );

  record(
    'Screenshots are limited to the visible viewport',
    harness.includes('captureBeyondViewport:false') && !harness.includes('captureBeyondViewport:true'),
    'no synthetic 2400px viewport or beyond-viewport capture'
  );

  const passed = results.filter(result => result.ok).length;
  console.log(`\nMobile layout contracts v1.26.4.04: ${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
