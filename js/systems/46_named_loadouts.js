'use strict';

// v1.28.1 Named Loadouts. These are ID-based equipment snapshots; they never
// alter combat values, item stats, upgrade levels, or the existing equip flow.
(function(global){
  if (!global || global.DungeonDexNamedLoadouts) return;

  const MAX_LOADOUTS = 12;
  const MAX_NAME_LENGTH = 32;
  const MAX_ITEM_NAME_LENGTH = 72;
  const FALLBACK_SLOTS = ['weapon','offhand','helm','armor','gloves','boots','ring','amulet','cloak','charm'];

  function plainObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
  function list(value){ return Array.isArray(value) ? value : []; }
  function text(value, fallback = '', limit = 96){
    const raw = typeof cleanDisplayText === 'function'
      ? cleanDisplayText(value, fallback)
      : String(value == null ? fallback : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return String(raw || fallback || '').slice(0, limit);
  }
  function escape(value){
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function slotName(slot){ return typeof slotDisplayName === 'function' ? slotDisplayName(slot) : text(slot, 'Gear', 24).replace(/\b\w/g, char => char.toUpperCase()); }
  function canonicalSlot(value){
    const raw = text(value, '', 24).toLowerCase();
    if (typeof baseSlotForSlot === 'function') {
      const normalized = baseSlotForSlot(raw, '');
      if (FALLBACK_SLOTS.includes(normalized)) return normalized;
    }
    const aliases = { chest:'armor', hands:'gloves', legs:'boots', shoulders:'cloak' };
    const candidate = aliases[raw] || raw;
    return FALLBACK_SLOTS.includes(candidate) ? candidate : '';
  }
  function nameKey(value){ return text(value, '', MAX_NAME_LENGTH).toLocaleLowerCase(); }
  function itemSignature(items){ return items.map(item => `${item.slot}:${item.itemId}`).sort().join('|'); }
  function nextId(){ return typeof makeId === 'function' ? String(makeId('loadout')) : `loadout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function makeUniqueId(value, usedIds){
    const base = text(value, '', 80).replace(/[^a-zA-Z0-9:_-]/g, '') || nextId();
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
    usedIds.add(candidate);
    return candidate;
  }
  function makeUniqueName(value, index, usedNames){
    const base = text(value, `Loadout ${index + 1}`, MAX_NAME_LENGTH) || `Loadout ${index + 1}`;
    let candidate = base;
    let suffix = 2;
    while (usedNames.has(nameKey(candidate))) {
      const suffixText = ` ${suffix++}`;
      candidate = `${base.slice(0, Math.max(1, MAX_NAME_LENGTH - suffixText.length))}${suffixText}`;
    }
    usedNames.add(nameKey(candidate));
    return candidate;
  }
  function normalizeItems(value){
    const usedSlots = new Set();
    const usedItems = new Set();
    return list(value).map(entry => {
      if (!plainObject(entry)) return null;
      const slot = canonicalSlot(entry.slot);
      const itemId = text(entry.itemId ?? entry.id, '', 96);
      if (!slot || !itemId || usedSlots.has(slot) || usedItems.has(itemId)) return null;
      usedSlots.add(slot);
      usedItems.add(itemId);
      return { slot, itemId, name:text(entry.name, 'Unknown gear', MAX_ITEM_NAME_LENGTH) || 'Unknown gear' };
    }).filter(Boolean).sort((left, right) => FALLBACK_SLOTS.indexOf(left.slot) - FALLBACK_SLOTS.indexOf(right.slot));
  }
  function normalize(value){
    const usedIds = new Set();
    const usedNames = new Set();
    const usedSignatures = new Set();
    const normalized = [];
    list(value).forEach((entry, index) => {
      if (!plainObject(entry) || normalized.length >= MAX_LOADOUTS) return;
      const items = normalizeItems(entry.items ?? entry.slots);
      if (!items.length) return;
      const signature = itemSignature(items);
      if (usedSignatures.has(signature)) return;
      usedSignatures.add(signature);
      normalized.push({ id:makeUniqueId(entry.id, usedIds), name:makeUniqueName(entry.name, index, usedNames), items });
    });
    return normalized;
  }
  function normalizeState(state){
    if (!plainObject(state) || !plainObject(state.player)) return [];
    state.player.namedLoadouts = normalize(state.player.namedLoadouts);
    return state.player.namedLoadouts;
  }
  function equipmentEntries(state){
    const available = new Map();
    const equipment = plainObject(state?.player?.equipment) ? state.player.equipment : {};
    Object.entries(equipment).forEach(([slot, item]) => {
      const itemId = text(item?.id, '', 96);
      if (itemId && !available.has(itemId)) available.set(itemId, { source:'equipped', slot:canonicalSlot(slot), item });
    });
    list(state?.player?.inventory).forEach(item => {
      const itemId = text(item?.id, '', 96);
      if (itemId && !available.has(itemId)) available.set(itemId, { source:'inventory', slot:canonicalSlot(item?.slot), item });
    });
    return available;
  }
  function inspect(state, id){
    const loadout = normalizeState(state).find(entry => entry.id === String(id || '')) || null;
    if (!loadout) return { ok:false, reason:'not-found', loadout:null, items:[], counts:{} };
    const equipment = plainObject(state.player.equipment) ? state.player.equipment : {};
    const available = equipmentEntries(state);
    const counts = { equipped:0, ready:0, occupied:0, elsewhere:0, missing:0 };
    const items = loadout.items.map(entry => {
      const currentId = text(equipment[entry.slot]?.id, '', 96);
      const found = available.get(entry.itemId);
      const status = currentId === entry.itemId ? 'equipped'
        : !found || (found.source === 'inventory' && found.slot !== entry.slot) ? 'missing'
        : currentId ? 'occupied'
        : found.source === 'inventory' ? 'ready'
        : 'elsewhere';
      counts[status] += 1;
      return { ...entry, status };
    });
    return { ok:true, loadout, items, counts };
  }
  function create(state, requestedName){
    const loadouts = normalizeState(state);
    if (!plainObject(state?.player)) return { ok:false, reason:'invalid-state' };
    if (loadouts.length >= MAX_LOADOUTS) return { ok:false, reason:'limit' };
    const name = text(requestedName, '', MAX_NAME_LENGTH);
    if (!name) return { ok:false, reason:'name-required' };
    if (loadouts.some(entry => nameKey(entry.name) === nameKey(name))) return { ok:false, reason:'duplicate-name' };
    const equipment = plainObject(state.player.equipment) ? state.player.equipment : {};
    const items = FALLBACK_SLOTS.map(slot => {
      const item = equipment[slot];
      const itemId = text(item?.id, '', 96);
      return itemId ? { slot, itemId, name:text(item.name, 'Unknown gear', MAX_ITEM_NAME_LENGTH) || 'Unknown gear' } : null;
    }).filter(Boolean);
    if (!items.length) return { ok:false, reason:'no-equipment' };
    const signature = itemSignature(items);
    if (loadouts.some(entry => itemSignature(entry.items) === signature)) return { ok:false, reason:'duplicate-gear' };
    const usedIds = new Set(loadouts.map(entry => entry.id));
    const loadout = { id:makeUniqueId(nextId(), usedIds), name, items };
    state.player.namedLoadouts = loadouts.concat(loadout);
    return { ok:true, loadout };
  }
  function rename(state, id, requestedName){
    const loadouts = normalizeState(state);
    const loadout = loadouts.find(entry => entry.id === String(id || ''));
    const name = text(requestedName, '', MAX_NAME_LENGTH);
    if (!loadout) return { ok:false, reason:'not-found' };
    if (!name) return { ok:false, reason:'name-required' };
    if (loadouts.some(entry => entry.id !== loadout.id && nameKey(entry.name) === nameKey(name))) return { ok:false, reason:'duplicate-name' };
    loadout.name = name;
    return { ok:true, loadout };
  }
  function remove(state, id){
    const loadouts = normalizeState(state);
    const next = loadouts.filter(entry => entry.id !== String(id || ''));
    if (next.length === loadouts.length) return { ok:false, reason:'not-found' };
    state.player.namedLoadouts = next;
    return { ok:true };
  }
  function apply(state, id){
    const preview = inspect(state, id);
    if (!preview.ok) return preview;
    const equipment = plainObject(state.player.equipment) ? state.player.equipment : (state.player.equipment = {});
    const inventory = list(state.player.inventory);
    const applied = [];
    preview.items.filter(entry => entry.status === 'ready').forEach(entry => {
      if (equipment[entry.slot]) return;
      const index = inventory.findIndex(item => text(item?.id, '', 96) === entry.itemId);
      if (index < 0) return;
      const item = inventory[index];
      if (canonicalSlot(item?.slot) !== entry.slot) return;
      equipment[entry.slot] = inventory.splice(index, 1)[0];
      applied.push(entry);
    });
    state.player.inventory = inventory;
    if (applied.length && typeof calcDerived === 'function') calcDerived(state);
    if (applied.length && typeof pushLog === 'function') pushLog(state, `Applied ${preview.loadout.name}: equipped ${applied.length} safe ${applied.length === 1 ? 'piece' : 'pieces'}.`);
    return { ok:true, loadout:preview.loadout, applied, preview };
  }
  function noticeFor(result, action){
    if (result?.ok) {
      if (action === 'apply') return result.applied.length
        ? `${result.applied.length} safe ${result.applied.length === 1 ? 'piece was' : 'pieces were'} equipped. Occupied and missing slots were left untouched.`
        : 'Nothing was changed. Review the slot status below.';
      return action === 'delete' ? 'Loadout deleted.' : action === 'rename' ? 'Loadout renamed.' : 'Loadout saved from current equipment.';
    }
    return ({
      'name-required':'Enter a name before saving this loadout.', 'duplicate-name':'That loadout name is already in use.',
      'duplicate-gear':'The same equipped configuration is already saved.', 'no-equipment':'Equip at least one piece of gear before saving a loadout.',
      'limit':`Keep up to ${MAX_LOADOUTS} named loadouts.`, 'not-found':'That loadout is no longer available.',
      'invalid-state':'Loadouts are not available in this save yet.'
    })[result?.reason] || 'The loadout action could not be completed.';
  }
  function statusLabel(status){ return ({ equipped:'Equipped', ready:'Ready', occupied:'Occupied', elsewhere:'In use', missing:'Missing' })[status] || 'Unavailable'; }
  function loadoutCard(state, loadout){
    const model = inspect(state, loadout.id);
    const counts = model.counts;
    const items = model.items.map(item => `<span class="named-loadout-item ${escape(item.status)}"><b>${escape(slotName(item.slot))}</b> ${escape(item.name)}<em>${escape(statusLabel(item.status))}</em></span>`).join('');
    const summary = [counts.ready ? `${counts.ready} ready` : '', counts.equipped ? `${counts.equipped} equipped` : '', counts.occupied ? `${counts.occupied} occupied` : '', counts.missing ? `${counts.missing} missing` : ''].filter(Boolean).join(' • ') || 'No matching gear found';
    return `<article class="named-loadout-card"><div class="named-loadout-card-head"><div><h3>${escape(loadout.name)}</h3><p class="small muted">${escape(summary)}</p></div><span class="pill">${escape(String(loadout.items.length))} slots</span></div><div class="named-loadout-items">${items}</div><div class="item-actions named-loadout-actions"><button class="primary mini" type="button" data-named-loadout-action="apply" data-named-loadout-id="${escape(loadout.id)}">Apply Safe Items</button><button class="ghost mini" type="button" data-named-loadout-action="rename" data-named-loadout-id="${escape(loadout.id)}">Rename</button><button class="ghost mini named-loadout-delete" type="button" data-named-loadout-action="delete" data-named-loadout-id="${escape(loadout.id)}">Delete</button></div></article>`;
  }
  function renderPanel(panel, state){
    if (!panel || !plainObject(state?.player)) return;
    const loadouts = normalizeState(state);
    const notice = text(global.DungeonDexNamedLoadoutNotice, '', 180);
    panel.innerHTML = `<div class="named-loadout-head"><div><h2>Named Loadouts</h2><p class="small muted">Save this equipment set by name. Applying only equips matching inventory gear into empty slots; existing gear is never replaced.</p></div><span class="pill">${escape(String(loadouts.length))} / ${MAX_LOADOUTS}</span></div><div class="named-loadout-create"><label for="namedLoadoutName">Loadout name<input id="namedLoadoutName" maxlength="${MAX_NAME_LENGTH}" placeholder="e.g. Deep Delver" aria-label="New loadout name" /></label><button class="primary" type="button" data-named-loadout-action="create">Save Equipped</button></div>${notice ? `<p class="small named-loadout-notice" aria-live="polite">${escape(notice)}</p>` : ''}<div class="named-loadout-list">${loadouts.map(loadout => loadoutCard(state, loadout)).join('') || '<p class="small muted named-loadout-empty">Equip gear, name the configuration, and save it here.</p>'}</div>`;
  }
  function currentState(){ return typeof S !== 'undefined' && plainObject(S) ? S : null; }
  function rerender(result, action){ global.DungeonDexNamedLoadoutNotice = noticeFor(result, action); if (typeof render === 'function') render(); }
  function bindActions(){
    if (typeof document === 'undefined' || document.__ddNamedLoadoutActionsBound) return;
    document.__ddNamedLoadoutActionsBound = true;
    document.addEventListener('click', event => {
      const button = event.target?.closest?.('[data-named-loadout-action]');
      if (!button) return;
      const state = currentState();
      if (!state) return;
      const action = button.dataset.namedLoadoutAction;
      const id = button.dataset.namedLoadoutId || '';
      event.preventDefault();
      if (action === 'create') return rerender(create(state, document.getElementById('namedLoadoutName')?.value || ''), action);
      if (action === 'rename') {
        const loadout = normalizeState(state).find(entry => entry.id === id);
        if (!loadout) return rerender({ ok:false, reason:'not-found' }, action);
        const nextName = global.prompt('Rename loadout', loadout.name);
        if (nextName != null) rerender(rename(state, id, nextName), action);
        return;
      }
      if (action === 'delete') {
        const loadout = normalizeState(state).find(entry => entry.id === id);
        if (loadout && global.confirm(`Delete loadout “${loadout.name}”?`)) rerender(remove(state, id), action);
        return;
      }
      if (action === 'apply') rerender(apply(state, id), action);
    });
  }

  global.DungeonDexNamedLoadouts = Object.freeze({ MAX_LOADOUTS, normalize, normalizeState, create, rename, remove, inspect, apply });
  global.normalizeNamedLoadouts = normalizeState;
  global.renderNamedLoadoutPanel = renderPanel;
  bindActions();
})(typeof window === 'undefined' ? null : window);
