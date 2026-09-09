import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = file => readFile(path.join(ROOT, file), 'utf8');
const [index, styles, nav] = await Promise.all([
  read('index.html'),
  read('styles.css'),
  read('js/systems/22_nav_centering.js')
]);

function record(label, pass, detail = '') {
  assert.ok(pass, `${label}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
}

record(
  'Town keeps the original Market, Forge, and Board panel IDs inside named native sections',
  /<details class="town-section-fold" data-town-section="market">[\s\S]*?id="merchantPanel"/.test(index)
    && /<details class="town-section-fold" data-town-section="forge">[\s\S]*?id="forgePanel"/.test(index)
    && /<details class="town-section-fold" data-town-section="board">[\s\S]*?id="questPanel"/.test(index)
);

record(
  'Town sections begin compact instead of permanently expanding the page',
  !/<details class="town-section-fold" data-town-section="(?:market|forge|board)" open>/.test(index)
);

record(
  'Section summaries use only existing place names and retain touch-sized native controls',
  ['<summary>Market</summary>', '<summary>Forge</summary>', '<summary>Board</summary>'].every(copy => index.includes(copy))
    && styles.includes('.town-section-fold > summary {')
    && styles.includes('min-height: 48px;')
    && styles.includes('.town-section-fold > summary:focus-visible')
);

record(
  'Town shortcuts reveal their existing section before focusing the original panel',
  nav.includes("function openTownSection(key){")
    && nav.includes("var sectionKey = key === 'elite' ? 'board' : key;")
    && nav.includes("candidate.open = candidate === fold;")
    && nav.includes('openTownSection(key);')
);

console.log('PASS: Town section navigation contract preserves existing actions while reducing default Town scroll.');
