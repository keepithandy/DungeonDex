'use strict';

// v1.28.2 Loadout Polish. These are ID-based equipment snapshots; they never
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
    const normalized = [];
    list(value).forEach((entry, index) => {
      if (!plainObject(entry) || normalized.length >= MAX_LOADOUTS) return;
      const items = normalizeItems(entry.items ?? entry.slots);
      if (!items.length) return;
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
    const counts = { equipped:0, ready:0, occupied:0, elsewhere:0, wrongSlot:0, missing:0 };
    const items = loadout.items.map(entry => {
      const currentId = text(equipment[entry.slot]?.id, '', 96);
      const found = available.get(entry.itemId);
      const status = currentId === entry.itemId ? 'equipped'
        : !found ? 'missing'
        : found.source === 'equipped' ? 'elsewhere'
        : found.slot !== entry.slot ? 'wrongSlot'
        : currentId ? 'occupied'
        : 'ready';
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
  function uniqueCopyName(loadout, loadouts){
    const usedNames = new Set(loadouts.map(entry => nameKey(entry.name)));
    let copyNumber = 1;
    while (copyNumber <= MAX_LOADOUTS + 1) {
      const suffix = copyNumber === 1 ? ' Copy' : ` Copy ${copyNumber}`;
      const candidate = `${loadout.name.slice(0, Math.max(1, MAX_NAME_LENGTH - suffix.length))}${suffix}`;
      if (!usedNames.has(nameKey(candidate))) return candidate;
      copyNumber += 1;
    }
    return makeUniqueName('Loadout Copy', loadouts.length, usedNames);
  }
  function duplicate(state, id){
    const loadouts = normalizeState(state);
    const source = loadouts.find(entry => entry.id === String(id || ''));
    if (!source) return { ok:false, reason:'not-found' };
    if (loadouts.length >= MAX_LOADOUTS) return { ok:false, reason:'limit' };
    const usedIds = new Set(loadouts.map(entry => entry.id));
    const loadout = {
      id:makeUniqueId(nextId(), usedIds),
      name:uniqueCopyName(source, loadouts),
      items:source.items.map(item => ({ ...item }))
    };
    state.player.namedLoadouts = loadouts.concat(loadout);
    return { ok:true, loadout, source };
  }
  function move(state, id, direction){
    const loadouts = normalizeState(state);
    const from = loadouts.findIndex(entry => entry.id === String(id || ''));
    const delta = direction === 'up' || direction === -1 ? -1 : direction === 'down' || direction === 1 ? 1 : 0;
    if (from < 0) return { ok:false, reason:'not-found' };
    if (!delta) return { ok:false, reason:'invalid-direction' };
    const to = from + delta;
    if (to < 0) return { ok:false, reason:'at-start' };
    if (to >= loadouts.length) return { ok:false, reason:'at-end' };
    const next = loadouts.slice();
    const [loadout] = next.splice(from, 1);
    next.splice(to, 0, loadout);
    state.player.namedLoadouts = next;
    return { ok:true, loadout, direction:delta < 0 ? 'up' : 'down', from, to };
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
  function statusCountSummary(counts){
    return [
      counts.ready ? `${counts.ready} ready` : '',
      counts.equipped ? `${counts.equipped} already equipped` : '',
      counts.occupied ? `${counts.occupied} occupied` : '',
      counts.elsewhere ? `${counts.elsewhere} in use` : '',
      counts.wrongSlot ? `${counts.wrongSlot} wrong slot` : '',
      counts.missing ? `${counts.missing} missing` : ''
    ].filter(Boolean).join(' • ') || 'No matching gear found';
  }
  function applicationSummary(result){
    if (!result?.ok || !result.preview?.counts) return '';
    const counts = result.preview.counts;
    const appliedCount = result.applied.length;
    const details = [
      appliedCount ? `${appliedCount} equipped` : '0 equipped',
      counts.equipped ? `${counts.equipped} already equipped` : '',
      counts.occupied ? `${counts.occupied} occupied` : '',
      counts.elsewhere ? `${counts.elsewhere} in use` : '',
      counts.wrongSlot ? `${counts.wrongSlot} wrong slot` : '',
      counts.missing ? `${counts.missing} missing` : ''
    ].filter(Boolean).join('; ');
    return `Applied ${result.loadout.name}: ${details}. Existing gear was left untouched.`;
  }
  function noticeFor(result, action){
    if (result?.ok) {
      if (action === 'apply') return applicationSummary(result);
      if (action === 'delete') return 'Loadout deleted.';
      if (action === 'rename') return 'Loadout renamed.';
      if (action === 'duplicate') return `Duplicated as ${result.loadout.name}.`;
      if (action === 'move') return `Loadout moved ${result.direction}.`;
      return 'Loadout saved from current equipment.';
    }
    return ({
      'name-required':'Enter a name before saving this loadout.', 'duplicate-name':'That loadout name is already in use.',
      'duplicate-gear':'The same equipped configuration is already saved.', 'no-equipment':'Equip at least one piece of gear before saving a loadout.',
      'limit':`Loadout limit reached (${MAX_LOADOUTS} of ${MAX_LOADOUTS}). Delete one before saving or duplicating.`,
      'not-found':'That loadout is no longer available.', 'at-start':'That loadout is already first.',
      'at-end':'That loadout is already last.', 'invalid-direction':'That loadout could not be moved.',
      'invalid-state':'Loadouts are not available in this save yet.'
    })[result?.reason] || 'The loadout action could not be completed.';
  }
  function statusLabel(status){ return ({ equipped:'Already equipped', ready:'Ready', occupied:'Occupied', elsewhere:'In use', wrongSlot:'Wrong slot', missing:'Missing' })[status] || 'Unavailable'; }
  function loadoutCard(state, loadout, index, total, atLimit){
    const model = inspect(state, loadout.id);
    const summary = statusCountSummary(model.counts);
    const cardId = `namedLoadoutCard-${escape(loadout.id)}`;
    const titleId = `${cardId}-title`;
    const summaryId = `${cardId}-summary`;
    const items = model.items.map(item => `<li class="named-loadout-item ${escape(item.status)}"><b>${escape(slotName(item.slot))}</b><span>${escape(item.name)}</span><em>${escape(statusLabel(item.status))}</em></li>`).join('');
    const upDisabled = index === 0 ? ' disabled' : '';
    const downDisabled = index === total - 1 ? ' disabled' : '';
    const duplicateDisabled = atLimit ? ' disabled' : '';
    return `<article class="named-loadout-card" id="${cardId}" role="listitem" aria-labelledby="${titleId}" aria-describedby="${summaryId}"><div class="named-loadout-card-head"><div><h3 id="${titleId}">${escape(loadout.name)}</h3><p class="small muted" id="${summaryId}">${escape(summary)}</p></div><span class="pill" aria-label="${escape(String(loadout.items.length))} saved slots">${escape(String(loadout.items.length))} slots</span></div><ul class="named-loadout-items" aria-label="Slot-by-slot availability">${items}</ul><div class="named-loadout-order" role="group" aria-label="Reorder ${escape(loadout.name)}"><button class="ghost mini" type="button" data-named-loadout-action="move" data-named-loadout-direction="up" data-named-loadout-id="${escape(loadout.id)}" aria-label="Move ${escape(loadout.name)} up; currently ${index + 1} of ${total}"${upDisabled}>↑ Up</button><button class="ghost mini" type="button" data-named-loadout-action="move" data-named-loadout-direction="down" data-named-loadout-id="${escape(loadout.id)}" aria-label="Move ${escape(loadout.name)} down; currently ${index + 1} of ${total}"${downDisabled}>↓ Down</button></div><div class="item-actions named-loadout-actions"><button class="primary mini" type="button" data-named-loadout-action="apply" data-named-loadout-id="${escape(loadout.id)}" aria-label="Apply safe items for ${escape(loadout.name)}" aria-describedby="${summaryId}">Apply Safe Items</button><button class="ghost mini" type="button" data-named-loadout-action="duplicate" data-named-loadout-id="${escape(loadout.id)}" aria-label="Duplicate ${escape(loadout.name)}"${duplicateDisabled}>Duplicate</button><button class="ghost mini" type="button" data-named-loadout-action="rename" data-named-loadout-id="${escape(loadout.id)}" aria-label="Rename ${escape(loadout.name)}">Rename</button><button class="ghost mini named-loadout-delete" type="button" data-named-loadout-action="delete" data-named-loadout-id="${escape(loadout.id)}" aria-label="Delete ${escape(loadout.name)}">Delete</button></div></article>`;
  }
  function renderPanel(panel, state){
    if (!panel || !plainObject(state?.player)) return;
    const loadouts = normalizeState(state);
    const notice = text(global.DungeonDexNamedLoadoutNotice, '', 240);
    const atLimit = loadouts.length >= MAX_LOADOUTS;
    const remaining = MAX_LOADOUTS - loadouts.length;
    const capacity = atLimit
      ? `Loadout limit reached (${MAX_LOADOUTS} of ${MAX_LOADOUTS}). Delete one before saving or duplicating.`
      : `${remaining} ${remaining === 1 ? 'loadout slot remains' : 'loadout slots remain'}.`;
    const disabled = atLimit ? ' disabled' : '';
    const empty = '<p class="small muted named-loadout-empty">No saved loadouts yet. Equip at least one item, enter a unique name, and choose Save Equipped.</p>';
    panel.innerHTML = `<div class="named-loadout-head"><div><h2>Named Loadouts</h2><p class="small muted">Save this equipment set by name. Applying only equips matching inventory gear into empty slots; existing gear is never replaced.</p></div><span class="pill" aria-label="${loadouts.length} of ${MAX_LOADOUTS} named loadouts">${escape(String(loadouts.length))} / ${MAX_LOADOUTS}</span></div><div class="named-loadout-create"><label for="namedLoadoutName">Loadout name<input id="namedLoadoutName" maxlength="${MAX_NAME_LENGTH}" placeholder="e.g. Deep Delver" aria-label="New loadout name" aria-describedby="namedLoadoutCapacity"${disabled} /></label><button class="primary" type="button" data-named-loadout-action="create" aria-describedby="namedLoadoutCapacity"${disabled}>Save Equipped</button></div><p class="small muted named-loadout-capacity" id="namedLoadoutCapacity">${escape(capacity)}</p>${notice ? `<p class="small named-loadout-notice" role="status" aria-live="polite">${escape(notice)}</p>` : ''}<div class="named-loadout-list" role="list" aria-label="Saved named loadouts">${loadouts.map((loadout, index) => loadoutCard(state, loadout, index, loadouts.length, atLimit)).join('') || empty}</div>`;
  }
  function currentState(){ return typeof S !== 'undefined' && plainObject(S) ? S : null; }
  function restoreFocus(focus){
    if (typeof document === 'undefined' || !focus) return;
    if (focus.controlId) return document.getElementById(focus.controlId)?.focus?.();
    if (!focus.id) return;
    const card = document.getElementById(`namedLoadoutCard-${focus.id}`);
    const buttons = Array.from(card?.querySelectorAll?.('[data-named-loadout-action]') || []);
    const preferred = buttons.find(node => (
      node.dataset.namedLoadoutAction === focus.action
      && (!focus.direction || node.dataset.namedLoadoutDirection === focus.direction)
      && !node.disabled
    ));
    const reorderFallback = focus.action === 'move'
      ? buttons.find(node => node.dataset.namedLoadoutAction === 'move' && !node.disabled)
      : null;
    const applyFallback = buttons.find(node => node.dataset.namedLoadoutAction === 'apply' && !node.disabled);
    (preferred || reorderFallback || applyFallback)?.focus?.();
  }
  function rerender(result, action, focus){
    global.DungeonDexNamedLoadoutNotice = noticeFor(result, action);
    if (typeof render === 'function') render();
    restoreFocus(focus);
  }
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
      if (action === 'create') {
        const result = create(state, document.getElementById('namedLoadoutName')?.value || '');
        return rerender(result, action, result.ok ? { id:result.loadout.id, action:'apply' } : { controlId:'namedLoadoutName' });
      }
      if (action === 'rename') {
        const loadout = normalizeState(state).find(entry => entry.id === id);
        if (!loadout) return rerender({ ok:false, reason:'not-found' }, action);
        const nextName = global.prompt('Rename loadout', loadout.name);
        if (nextName != null) rerender(rename(state, id, nextName), action, { id, action:'rename' });
        return;
      }
      if (action === 'duplicate') {
        const result = duplicate(state, id);
        return rerender(result, action, result.ok ? { id:result.loadout.id, action:'rename' } : { id, action:'duplicate' });
      }
      if (action === 'move') {
        const direction = button.dataset.namedLoadoutDirection || '';
        const result = move(state, id, direction);
        return rerender(result, action, { id, action:'move', direction });
      }
      if (action === 'delete') {
        const loadouts = normalizeState(state);
        const index = loadouts.findIndex(entry => entry.id === id);
        const loadout = index >= 0 ? loadouts[index] : null;
        if (loadout && global.confirm(`Delete loadout “${loadout.name}”?`)) {
          const nextFocusId = loadouts[index + 1]?.id || loadouts[index - 1]?.id || '';
          rerender(remove(state, id), action, nextFocusId ? { id:nextFocusId, action:'apply' } : { controlId:'namedLoadoutName' });
        }
        return;
      }
      if (action === 'apply') rerender(apply(state, id), action, { id, action:'apply' });
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.target?.id !== 'namedLoadoutName') return;
      const state = currentState();
      if (!state || event.target.disabled) return;
      event.preventDefault();
      const result = create(state, event.target.value || '');
      rerender(result, 'create', result.ok ? { id:result.loadout.id, action:'apply' } : { controlId:'namedLoadoutName' });
    });
  }

  global.DungeonDexNamedLoadouts = Object.freeze({ MAX_LOADOUTS, normalize, normalizeState, create, rename, duplicate, move, remove, inspect, apply, applicationSummary });
  global.normalizeNamedLoadouts = normalizeState;
  global.renderNamedLoadoutPanel = renderPanel;
  bindActions();
})(typeof window === 'undefined' ? null : window);
