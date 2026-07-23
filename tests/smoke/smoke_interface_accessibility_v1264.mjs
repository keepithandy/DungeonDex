#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
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

function occurrences(source, needle) {
  return String(source || '').split(needle).length - 1;
}

function relativeLuminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => Number.parseInt(value, 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function runModalLifecycleFixture(introSource) {
  const start = introSource.indexOf('(function installModalAccessibilityHelper()');
  const end = introSource.indexOf('  function switchScreen', start);
  if (start < 0 || end < 0) return { installed: false };
  const helperSource = introSource.slice(start, end);
  const handlers = {};
  let documentRef;

  class FakeClassList {
    constructor() { this.values = new Set(); }
    add(value) { this.values.add(value); }
    remove(value) { this.values.delete(value); }
    contains(value) { return this.values.has(value); }
  }

  class FakeNode {
    constructor(name) {
      this.name = name;
      this.isConnected = true;
      this.disabled = false;
      this.style = { overflow: '', overflowY: '', touchAction: '', overscrollBehavior: '' };
      this.classList = new FakeClassList();
      this.scrollTop = 0;
      this.attributes = new Map();
      this.focusables = [];
    }
    focus() { documentRef.activeElement = this; }
    getAttribute(name) { return this.attributes.get(name) || null; }
    closest() { return null; }
    querySelectorAll() { return this.focusables; }
    querySelector(selector) { return selector === '[data-close]' ? this.focusables[0] : null; }
    contains(node) { return node === this || this.focusables.includes(node); }
  }

  const shell = new FakeNode('shell');
  shell.scrollTop = 37;
  shell.style.overflow = 'auto';
  shell.style.overflowY = 'auto';
  shell.style.touchAction = 'pan-y';
  shell.style.overscrollBehavior = 'auto';
  const body = new FakeNode('body');
  const opener = new FakeNode('opener');
  const root = new FakeNode('root');
  const dialog = new FakeNode('dialog');
  const first = new FakeNode('first');
  const last = new FakeNode('last');
  dialog.focusables = [first, last];
  root.contains = node => node === root || node === dialog || dialog.contains(node);

  documentRef = {
    activeElement: opener,
    body,
    documentElement: { contains: node => node?.isConnected !== false },
    querySelector: selector => selector === '.app-shell' ? shell : null,
    addEventListener(type, listener) { handlers[type] = listener; }
  };
  const windowRef = {};
  vm.runInNewContext(helperSource, { window: windowRef, document: documentRef, Object, Array });
  if (!windowRef.DDModalAccessibility?.activate) return { installed: false };

  let escaped = false;
  let handle;
  handle = windowRef.DDModalAccessibility.activate({
    root,
    dialog,
    opener,
    initialFocus: '[data-close]',
    onEscape() {
      escaped = true;
      handle.deactivate();
    }
  });
  const locked = shell.style.overflow === 'hidden'
    && shell.style.overflowY === 'hidden'
    && shell.classList.contains('dd-modal-scroll-locked')
    && documentRef.activeElement === first;

  documentRef.activeElement = last;
  handlers.keydown({ key: 'Tab', shiftKey: false, preventDefault() {}, stopPropagation() {} });
  const tabWrapped = documentRef.activeElement === first;
  documentRef.activeElement = first;
  handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() {}, stopPropagation() {} });
  const shiftTabWrapped = documentRef.activeElement === last;
  handlers.keydown({ key: 'Escape', shiftKey: false, preventDefault() {}, stopPropagation() {} });
  const restored = escaped
    && documentRef.activeElement === opener
    && shell.scrollTop === 37
    && shell.style.overflow === 'auto'
    && shell.style.overflowY === 'auto'
    && shell.style.touchAction === 'pan-y'
    && !shell.classList.contains('dd-modal-scroll-locked');

  return { installed: true, locked, tabWrapped, shiftTabWrapped, restored };
}

async function main() {
  const [index, town, playerRuntime, visualCss, loreCss, intro, gearModal, runUi, bindings] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/10_ui_town_shop.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/07_player_combat_runtime.js'), 'utf8'),
    readFile(path.join(ROOT, 'styles_visual_weight.css'), 'utf8'),
    readFile(path.join(ROOT, 'styles_lore_layer.css'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/09_ui_common_intro.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/40_gear_detail_modal.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/11_ui_run_gear_dex_archive.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/12_render_bindings_boot.js'), 'utf8')
  ]);
  const css = compact(visualCss);
  const restMarkup = index.match(/<button class="ghost rest-action-btn"[\s\S]*?<\/button>/)?.[0] || '';
  const restRender = town.slice(town.indexOf("const restCostNode = el('restCostPill')"), town.indexOf("if (el('districtCharterSlot'))"));

  record(
    'Rest presents current HP, effect, coin cost, and action state as distinct fields',
    ['restCurrentHp', 'restEffectText', 'restCostPill', 'restActionState'].every(id => restMarkup.includes(`id="${id}"`))
      && restMarkup.includes('<span class="rest-action-label">Rest</span>')
  );
  record(
    'Rest renderer reuses one authoritative cost and updates presentation only',
    occurrences(restRender, 'restCost(S)') === 1
      && restRender.includes("restAction.dataset.restState = affordable ? 'ready' : 'need-coin'")
      && restRender.includes("restAction.setAttribute('aria-label', 'Rest')")
      && restMarkup.includes('aria-label="Rest"')
      && restRender.includes("'Restore HP • 2 Ember minimum'")
  );
  record(
    'Rest gameplay and click contracts remain unchanged',
    playerRuntime.includes('state.player.gold -= cost;')
      && playerRuntime.includes('state.player.hp = state.player.maxHp;')
      && playerRuntime.includes('state.player.ember = Math.max(state.player.ember, 2);')
      && bindings.includes("restBtn.onclick = () => runGuardedAction(() => { restPlayer(S); render(); })")
  );

  record(
    'Town spacing, radius, border, and surface values use scoped tokens',
    ['--ddx-town-shell-gap', '--ddx-town-head-gap', '--ddx-town-card-radius', '--ddx-town-inner-radius', '--ddx-town-border-neutral', '--ddx-town-surface-neutral']
      .every(token => visualCss.includes(token))
      && css.includes('#screen-town.town-section-shell{gap:var(--ddx-town-shell-gap)')
      && css.includes('#screen-town.town-board-ledger{border:1pxsolidvar(--ddx-town-border-neutral)')
  );

  const combatMarkup = runUi.match(/<section class="combat-device-actions"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  const combatOrder = Array.from(combatMarkup.matchAll(/data-action="([^"]+)"/g), match => match[1]);
  record(
    'Combat keeps the proven Attack, Ashburst, Guard, Extract order',
    JSON.stringify(combatOrder) === JSON.stringify(['attack', 'skill', 'guard', 'extract']),
    combatOrder.join(' -> ')
  );
  record(
    'Combat actions have one final visual owner, four equal columns, a 6px gap, and 46px targets',
    /\.app-shell\.combat-active\s+\.combat-device-actions\s*\{[^}]*position:\s*static\s*!important;[^}]*display:\s*grid\s*!important;[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)\s*!important/s.test(visualCss)
      && /\.app-shell\.combat-active\s+\.combat-device-actions\s+button\s*\{[^}]*min-height:\s*46px\s*!important/s.test(visualCss)
      && /\.app-shell\.combat-active\s+\.combat-device-actions\s*\{[^}]*gap:\s*6px\s*!important/s.test(visualCss)
      && visualCss.includes('v1.26.4.04 combat-bar authority')
      && !loreCss.includes('Combat bar layout invariant')
  );

  record(
    'Journal and Archive containers and text wrap without forced ellipsis',
    visualCss.includes('#guildJournalPanel')
      && visualCss.includes('.journal-row > *')
      && visualCss.includes('.archive-note-line > *')
      && visualCss.includes('.run-history-card .run-history-loot-pill')
      && /\.run-history-card\s+\.run-history-loot-pill\s*\{[^}]*overflow:\s*visible;[^}]*text-overflow:\s*clip;[^}]*white-space:\s*normal/s.test(visualCss)
  );

  record(
    'Intro dialog exposes modal semantics and a visible close action',
    /id="introModalContent"[^>]*role="dialog"[^>]*aria-modal="true"/.test(index)
      && intro.includes('id="introModalCloseBtn"')
  );
  const modalFixture = runModalLifecycleFixture(intro);
  record('Shared modal lifecycle installs and locks the app scroll container', modalFixture.installed && modalFixture.locked);
  record('Shared modal lifecycle traps forward and reverse Tab focus', modalFixture.tabWrapped && modalFixture.shiftTabWrapped);
  record('Shared modal lifecycle closes on Escape and restores focus/scroll', modalFixture.restored);
  record(
    'Gear dialog uses the shared lifecycle, labelled title, 44px controls, and dynamic viewport scrolling',
    gearModal.includes('window.DDModalAccessibility')
      && gearModal.includes("const TITLE_ID = 'gearDetailModalTitle'")
      && gearModal.includes('aria-labelledby="${TITLE_ID}"')
      && gearModal.includes('id="${TITLE_ID}"')
      && gearModal.includes('min-height:44px')
      && gearModal.includes('--ddx-gear-modal-safe-top:max(18px,env(safe-area-inset-top,0px))')
      && gearModal.includes('max-height:calc(100dvh - var(--ddx-gear-modal-safe-top) - var(--ddx-gear-modal-safe-bottom))')
      && !gearModal.includes("event.key === 'Escape'")
  );
  record(
    'Gear inspection uses stable item IDs, formatted-name fallback, and explicit keyboard triggers',
    occurrences(runUi, 'data-gear-detail-id=') === 2
      && occurrences(runUi, 'data-gear-detail-trigger="1"') === 2
      && occurrences(runUi, 'role="button" tabindex="0" aria-haspopup="dialog"') === 2
      && gearModal.includes('card?.dataset?.gearDetailId')
      && gearModal.includes('formatGearDisplayName(entry.item)')
      && gearModal.includes("event.key !== 'Enter' && event.key !== ' '")
      && gearModal.includes('openGearDetail(entry, detailTrigger);')
  );
  record(
    'Intro modal stays above navigation and run transitions move focus into the active screen',
    css.includes('.intro-modal-backdrop{z-index:9000;')
      && bindings.includes("hideIntroModal({ restoreFocus: false });")
      && bindings.includes('focusRunSurface();')
      && intro.includes('handle.deactivate({ restoreFocus: options.restoreFocus !== false });')
  );

  record(
    'Touch controls retain a 44px minimum without enlarging passive pills',
    /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?button:not\(\.dd-devtools-btn\),[\s\S]*?\[role="button"\]\s*\{\s*min-height:\s*44px\s*!important/s.test(visualCss)
      && !/\.pill\s*\{[^}]*min-height:\s*44px\s*!important/s.test(visualCss)
  );
  record(
    'Disabled controls keep full opacity, readable text, and a dashed non-color cue',
    css.includes('button:disabled,button[aria-disabled="true"]{opacity:1!important;')
      && css.includes('border-style:dashed!important')
      && css.includes('cursor:not-allowed!important')
  );

  const rarityColors = ['#d7e0ea', '#f0cf91', '#a8cbff', '#dfbdff', '#ffe29c', '#ffb2ba'];
  const rarityRatios = rarityColors.map(color => contrastRatio(color, '#0c0f16'));
  record(
    'Rarity text palette clears 4.5:1 on the dark game surface and retains border cues',
    rarityRatios.every(ratio => ratio >= 4.5)
      && /\.rarity-eyebrow,\s*\.gear-detail-rarity\s*\{[^}]*border:\s*1px\s+solid\s+currentColor;[^}]*font-weight:\s*900;[^}]*opacity:\s*1/s.test(visualCss),
    `minimum ${Math.min(...rarityRatios).toFixed(2)}:1`
  );
  record(
    'Active navigation exposes a non-color current-page state',
    index.includes('aria-current="page">Town</button>')
      && intro.includes("node.setAttribute('aria-current', 'page')")
      && intro.includes("node.removeAttribute('aria-current')")
      && bindings.includes("node.setAttribute('aria-current', 'page')")
      && bindings.includes("node.removeAttribute('aria-current')")
  );
  record(
    'Intro copy preserves Trophy Echo as the only live Revisit lane',
    intro.includes('Trophy Echo is the only live memory lane.')
      && !intro.includes('Trophy Echo, Famous Gear Memory, Rival Trace</span>')
  );

  const passed = results.filter(result => result.ok).length;
  console.log(`\nInterface accessibility v1.26.4.04: ${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
