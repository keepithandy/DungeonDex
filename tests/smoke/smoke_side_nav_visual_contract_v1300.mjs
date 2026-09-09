import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const nav = await readFile(path.join(ROOT, 'js', 'systems', '22_nav_centering.js'), 'utf8');

function record(label, pass, detail = '') {
  assert.ok(pass, `${label}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
}

record(
  'Side navigation retains the existing route and drawer behavior owners',
  [
    "document.querySelector('nav.tabs, .tabs.panel')",
    "nav.classList.add('ddx-side-nav')",
    "toggle.className = 'ddx-nav-toggle'",
    "nav.classList.toggle('ddx-nav-open', !!open)",
    "#tab-town[data-screen=\"town\"]"
  ].every(token => nav.includes(token))
);

record(
  'Guild rail gives every established route a decorative glyph without changing its button text',
  [
    ['town', '⌂'],
    ['run', '⚔'],
    ['gear', '✦'],
    ['dex', '◈'],
    ['archive', '✎']
  ].every(([route, glyph]) => nav.includes(`[data-screen=\"${route}\"]::before{content:\"${glyph}\"!important}`))
);

record(
  'Guild rail supplies a visible plaque header, active ember marker, and keyboard focus treatment',
  nav.includes('content:"Guild Routes"')
    && nav.includes('inset 3px 0 0 #f4b653')
    && nav.includes('background:#ffd58c')
    && nav.includes('.tab:focus-visible')
);

record(
  'Decorative rail layers do not intercept interaction and reduced motion remains calm',
  nav.includes('pointer-events:none!important')
    && nav.includes('@media(prefers-reduced-motion:reduce)')
    && nav.includes('transition:none!important')
);

record(
  'Closed fine-pointer rail keeps its sigils in the exposed edge and preserves short-window compaction',
  nav.includes('justify-content:flex-end!important;padding-right:8px!important')
    && nav.includes('@media(hover:hover) and (pointer:fine) and (min-height:561px)')
    && nav.includes('z-index:0;top:18px;right:2px;')
);

record(
  'Touch drawer keeps its established 44px targets and safe navigation geometry',
  nav.includes('.ddx-nav-toggle{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}')
    && nav.includes('.tabs.panel .tab,nav.tabs .tab{min-height:44px!important}')
    && nav.includes('overflow-y:auto!important;overscroll-behavior:contain')
);

console.log('PASS: Side-nav visual contract adds guild identity without changing navigation behavior.');
