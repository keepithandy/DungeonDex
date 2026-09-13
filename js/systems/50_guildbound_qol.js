'use strict';

// Guildbound presentation preferences live on this device, outside the player save.
(function (root) {
  const STORAGE_KEY = 'dungeondex_guildbound_ui_v1';
  const STATUS_FILTERS = Object.freeze([
    ['all', 'All gear'], ['upgrades', 'Higher score'], ['locked', 'Locked'],
    ['junk', 'Marked junk'], ['loadout', 'In saved loadout'], ['sellable', 'Safe to sell']
  ]);
  const SECTION_KINDS = ['town', 'gear'];
  const boundSections = new WeakSet();
  let preferences = null;

  function normalizePreferences(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const sections = source.sections && typeof source.sections === 'object' ? source.sections : {};
    return {
      comfortable: source.comfortable === true,
      largeText: source.largeText === true,
      reduceEffects: source.reduceEffects === true,
      sections: Object.fromEntries(Object.entries(sections).filter(([key, value]) =>
        /^(town|gear):[a-z][a-z0-9-]{0,40}$/.test(key) && typeof value === 'boolean').slice(0, 32))
    };
  }

  function readPreferences() {
    if (preferences) return preferences;
    try { preferences = normalizePreferences(JSON.parse(root.localStorage.getItem(STORAGE_KEY))); }
    catch (_) { preferences = normalizePreferences(null); }
    return preferences;
  }

  function persistPreferences() {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(readPreferences())); return true; }
    catch (_) { return false; }
  }

  function statusValue(state) {
    const value = state?.filters?.status;
    return STATUS_FILTERS.some(([key]) => key === value) ? value : 'all';
  }

  function matchesStatusFilter(state, item, requestedStatus = statusValue(state)) {
    if (!item || typeof item !== 'object') return false;
    if (requestedStatus === 'upgrades') return typeof gearUpgradeDelta === 'function' && gearUpgradeDelta(item, state) > 0;
    if (requestedStatus === 'locked') return item.locked === true;
    if (requestedStatus === 'junk') return typeof itemMarkedJunk === 'function' && itemMarkedJunk(item);
    if (requestedStatus === 'loadout') return typeof itemInNamedLoadout === 'function' && itemInNamedLoadout(state, item);
    if (requestedStatus === 'sellable') return typeof canSellAllGearItem === 'function' && canSellAllGearItem(state, item);
    return true;
  }

  function statusFilterMarkup(state) {
    const current = statusValue(state);
    return `<select id="gearStatusFilter" aria-label="Filter inventory by status">${STATUS_FILTERS.map(([value, label]) => `<option value="${value}"${current === value ? ' selected' : ''}>${label}</option>`).join('')}</select>`;
  }

  function sectionToolsMarkup(kind) {
    if (!SECTION_KINDS.includes(kind)) return '';
    return `<span class="guildbound-kicker">${kind === 'town' ? 'Town services' : 'Gear hall'}</span><div class="guildbound-actions"><button class="ghost mini" type="button" data-guildbound-sections="${kind}" data-guildbound-open="true">Expand all</button><button class="ghost mini" type="button" data-guildbound-sections="${kind}" data-guildbound-open="false">Collapse all</button></div>`;
  }

  function preferencesMarkup(prefs = readPreferences()) {
    return `<div class="guildbound-heading"><div><span class="guildbound-kicker">Make yourself at home</span><h2>Display preferences</h2></div></div><p class="guildbound-muted">Saved on this device. Your gear and progress stay with your player save.</p><div class="guildbound-preference-options">${[
      ['comfortable', 'Comfortable spacing', 'Give panels and controls more room.'],
      ['largeText', 'Larger text', 'Increase text size throughout the game.'],
      ['reduceEffects', 'Reduce effects', 'Quiet animations, flashes and decorative effects.']
    ].map(([key, label, detail]) => `<label class="guildbound-preference"><input type="checkbox" data-guildbound-preference="${key}"${prefs[key] ? ' checked' : ''}><span><strong>${label}</strong><small>${detail}</small></span></label>`).join('')}</div><p class="guildbound-preference-status small" role="status" aria-live="polite"></p>`;
  }

  function applyPreferences(doc = root.document) {
    if (!doc?.documentElement) return;
    const prefs = readPreferences();
    [['comfortable', 'guildbound-comfortable'], ['largeText', 'guildbound-large-text'], ['reduceEffects', 'guildbound-reduced-effects']].forEach(([key, cls]) => doc.documentElement.classList.toggle(cls, prefs[key]));
  }

  function sectionKey(node, kind) {
    const name = node.dataset[kind === 'town' ? 'townSection' : 'gearSection'];
    return typeof name === 'string' && /^[a-z][a-z0-9-]{0,40}$/.test(name) ? `${kind}:${name}` : '';
  }

  function setSectionsOpen(kind, open, doc = root.document) {
    if (!SECTION_KINDS.includes(kind) || !doc) return 0;
    let count = 0;
    doc.querySelectorAll(`details[data-${kind}-section]`).forEach(node => {
      const key = sectionKey(node, kind);
      if (!key) return;
      node.open = !!open;
      readPreferences().sections[key] = !!open;
      count += 1;
    });
    persistPreferences();
    return count;
  }

  function bindSections(doc) {
    SECTION_KINDS.forEach(kind => {
      const host = doc.querySelector(`[data-guildbound-section-tools="${kind}"]`);
      if (host && !host.querySelector('[data-guildbound-sections]')) host.innerHTML = sectionToolsMarkup(kind);
      doc.querySelectorAll(`details[data-${kind}-section]`).forEach(node => {
        if (boundSections.has(node)) return;
        boundSections.add(node);
        const key = sectionKey(node, kind);
        if (!key) return;
        const saved = readPreferences().sections[key];
        if (typeof saved === 'boolean') node.open = saved;
        node.addEventListener('toggle', () => {
          readPreferences().sections[key] = node.open;
          persistPreferences();
        });
      });
    });
    doc.querySelectorAll('[data-guildbound-sections]').forEach(button => {
      button.onclick = () => setSectionsOpen(button.dataset.guildboundSections, button.dataset.guildboundOpen === 'true', doc);
    });
  }

  function bind(state, actions = {}, doc = root.document) {
    if (!doc) return;
    applyPreferences(doc);
    bindSections(doc);
    const status = doc.getElementById('gearStatusFilter');
    if (status) status.onchange = () => {
      if (!state.filters || typeof state.filters !== 'object') state.filters = {};
      state.filters.status = STATUS_FILTERS.some(([key]) => key === status.value) ? status.value : 'all';
      actions.refreshInventory?.();
    };
    const search = doc.getElementById('searchFilter');
    if (search) search.onkeydown = event => {
      if (event.key !== 'Escape' || !search.value) return;
      event.preventDefault();
      search.value = '';
      state.filters.search = '';
      actions.refreshInventory?.();
      search.focus();
    };
    const preferenceHost = doc.getElementById('guildboundPreferencesPanel');
    if (preferenceHost && !preferenceHost.querySelector('[data-guildbound-preference]')) preferenceHost.innerHTML = preferencesMarkup();
    doc.querySelectorAll('[data-guildbound-preference]').forEach(input => {
      const key = input.dataset.guildboundPreference;
      if (!['comfortable', 'largeText', 'reduceEffects'].includes(key)) return;
      input.checked = readPreferences()[key];
      input.onchange = () => {
        readPreferences()[key] = input.checked;
        const saved = persistPreferences();
        applyPreferences(doc);
        const notice = preferenceHost?.querySelector('[role="status"]');
        if (notice) notice.textContent = saved ? 'Display preferences saved.' : 'Applied for this session. Device storage is unavailable.';
      };
    });
  }

  root.DungeonDexGuildboundQol = Object.freeze({ STORAGE_KEY, STATUS_FILTERS, normalizePreferences, readPreferences,
    statusValue, matchesStatusFilter, statusFilterMarkup, sectionToolsMarkup, preferencesMarkup,
    applyPreferences, setSectionsOpen, bind });
})(typeof window !== 'undefined' ? window : globalThis);
