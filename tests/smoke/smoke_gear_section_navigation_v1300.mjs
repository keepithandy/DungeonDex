import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = file => readFile(path.join(ROOT, file), 'utf8');
const [index, styles] = await Promise.all([read('index.html'), read('styles.css')]);

function record(label, pass, detail = '') {
  assert.ok(pass, `${label}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
}

const sections = [
  ['upgrades', 'Upgrades', 'gearUpgradeSummaryPanel'],
  ['equipment', 'Equipment', 'equipmentPanel'],
  ['loadouts', 'Loadouts', 'namedLoadoutsPanel'],
  ['inventory', 'Inventory', 'filtersPanel']
];

record(
  'Gear keeps the original panel IDs inside compact named sections',
  sections.every(([key, label, panel]) => new RegExp(`<details class="gear-section-fold" data-gear-section="${key}">[\\s\\S]*?<summary>${label}</summary>[\\s\\S]*?id="${panel}"`).test(index))
);

record(
  'Gear sections begin compact without changing the visible loadout status panel',
  !/<details class="gear-section-fold" data-gear-section="(?:upgrades|equipment|loadouts|inventory)" open>/.test(index)
    && /<section class="panel gear-player-panel ddx-ledger-card ddx-gear-player-ledger" id="gearPlayerPanel"/.test(index)
);

record(
  'Inventory keeps its existing filters and archive together',
  /<details class="gear-section-fold" data-gear-section="inventory">[\s\S]*?id="filtersPanel"[\s\S]*?id="inventoryPanel"/.test(index)
);

record(
  'Gear uses the shared native disclosure style with touch and keyboard support',
  styles.includes('.gear-section-fold > summary')
    && styles.includes('.gear-section-fold > summary:focus-visible')
    && styles.includes('.gear-section-fold > .panel + .panel')
    && styles.includes('min-height: 48px;')
    && styles.includes('min-height: 52px;')
);

console.log('PASS: Gear section navigation contract preserves existing panels while reducing default Gear scroll.');
