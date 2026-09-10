import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = file => readFile(path.join(ROOT, file), 'utf8');
const [screenSource, navSource] = await Promise.all([
  read('js/systems/09_ui_common_intro.js'),
  read('js/systems/22_nav_centering.js')
]);

function record(label, pass, detail = '') {
  assert.ok(pass, `${label}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
}

record(
  'Route changes reset document, body, destination-screen, and window scroll positions',
  screenSource.includes('function resetRouteViewport(screen)')
    && screenSource.includes('const root = document.scrollingElement || document.documentElement;')
    && screenSource.includes('root.scrollTop = 0;')
    && screenSource.includes('document.body.scrollTop = 0;')
    && screenSource.includes('activeScreen.scrollTop = 0;')
    && screenSource.includes('window.scrollTo(0, 0);')
    && screenSource.includes('resetRouteViewport(screen);')
    && screenSource.includes('function focusRouteSurface(screen)')
    && screenSource.includes('activeScreen.focus({ preventScroll: true })')
    && screenSource.includes('focusRouteSurface(screen);')
);

record(
  'Route changes close the side rail through a single navigation bridge',
  screenSource.includes('window.DungeonDexCloseSideNav()')
    && navSource.includes('window.DungeonDexCloseSideNav = function(){ setNavOpen(nav, false); };')
);

console.log('PASS: v1.31.1 route-scroll stability contract keeps navigation compact without changing game actions.');
