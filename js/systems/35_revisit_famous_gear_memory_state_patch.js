'use strict';

// v1.23.2 Famous Gear Memory state-shape hardening.
// Keeps the live archive lane safe when older saves or test fixtures omit
// player.revisitState.famousGear. This is intentionally narrow: no rewards,
// no combat changes, no economy changes.
(function(){
  if (window.DDFamousGearMemoryStatePatch) return;
  window.DDFamousGearMemoryStatePatch = true;

  const originalEnsure = typeof window.ensureRevisitStateShape === 'function'
    ? window.ensureRevisitStateShape
    : null;

  function asSafeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function safeNumber(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER){
    const raw = Number(value);
    const floor = Number.isFinite(raw) ? Math.floor(raw) : Math.floor(Number(fallback) || 0);
    return Math.max(min, Math.min(max, floor));
  }

  function text(value, fallback = ''){
    const clean = String(value || fallback || '').trim();
    if (typeof window.cleanDisplayText === 'function') return window.cleanDisplayText(clean, fallback);
    return clean || fallback;
  }

  function repairCompletedKeys(value){
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return Object.keys(source).reduce((map, key) => {
      const clean = String(key || '').trim().slice(0, 80);
      if (/^famous_gear:[^:]+$/i.test(clean)) map[clean] = source[key] === true;
      return map;
    }, {});
  }

  function normalizeActiveMemory(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const recordId = text(value.recordId || value.sourceRecordId || value.itemId || '', '');
    const completionKey = text(value.completionKey || (recordId ? `famous_gear:${recordId}` : ''), '');
    if (!recordId || !/^famous_gear:[^:]+$/i.test(completionKey)) return null;
    return {
      routeKey: 'famous_gear_route',
      completionKey,
      recordId,
      itemId: text(value.itemId || '', ''),
      itemName: text(value.itemName || value.memoryTitle || 'Famous Gear', 'Famous Gear'),
      slot: text(value.slot || 'gear', 'gear'),
      memoryTitle: text(value.memoryTitle || value.itemName || 'Famous Gear', 'Famous Gear'),
      reflection: text(value.reflection || '', ''),
      summaryLine: text(value.summaryLine || '', ''),
      sourceLabel: text(value.sourceLabel || 'Retired Gear Archive', 'Retired Gear Archive'),
      sourceFloor: safeNumber(value.sourceFloor, 0, 0, 999999),
      startedAt: safeNumber(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }

  function normalizeHistoryEntry(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const recordId = text(value.recordId || value.sourceRecordId || value.itemId || '', '');
    const completionKey = text(value.completionKey || (recordId ? `famous_gear:${recordId}` : ''), '');
    const summary = text(value.summary || value.resultSummary || '', '');
    if (!recordId || !summary || !/^famous_gear:[^:]+$/i.test(completionKey)) return null;
    return {
      completionKey,
      recordId,
      itemId: text(value.itemId || '', ''),
      itemName: text(value.itemName || value.gearName || 'Famous Gear', 'Famous Gear'),
      slot: text(value.slot || 'gear', 'gear'),
      memoryTitle: text(value.memoryTitle || value.itemName || 'Famous Gear', 'Famous Gear'),
      reflection: text(value.reflection || '', ''),
      summary,
      sourceLabel: text(value.sourceLabel || 'Retired Gear Archive', 'Retired Gear Archive'),
      sourceFloor: safeNumber(value.sourceFloor, 0, 0, 999999),
      startedAt: safeNumber(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER),
      completedAt: safeNumber(value.completedAt, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }

  function firstRetiredRecord(state){
    if (typeof window.famousGearRetiredRecords === 'function') {
      const records = window.famousGearRetiredRecords(state);
      if (Array.isArray(records) && records[0]) return records[0];
    }
    return asSafeArray(state?.player?.retiredRelics).find(entry => entry && typeof entry === 'object') || null;
  }

  function completionKeyFromSource(source){
    if (typeof window.famousGearCompletionKey === 'function') return window.famousGearCompletionKey(source);
    const recordId = text(source?.recordId || source?.id || source?.itemId || source?.item?.id || '', '');
    return recordId ? `famous_gear:${recordId}` : '';
  }

  function reflectionFromSource(source){
    if (typeof window.createFamousGearReflection === 'function') return window.createFamousGearReflection(source);
    const item = source?.item && typeof source.item === 'object' ? source.item : {};
    const itemName = text(source?.itemName || item.name || 'Famous Gear', 'Famous Gear');
    return {
      memoryTitle: `${itemName} Memory`,
      summaryLine: `${itemName} rests in the archive.`,
      reflection: `${itemName} returns as a safe archive memory. The item stays retired and no gear reward returns.`
    };
  }

  function syntheticActiveFromRouteKey(state, revisitState, famousGear){
    if (famousGear.active || String(revisitState.activeRouteKey || '').trim() !== 'famous_gear_route') return null;
    const source = firstRetiredRecord(state);
    if (!source) return null;
    const item = source.item && typeof source.item === 'object' ? source.item : {};
    const recordId = text(source.recordId || source.id || source.itemId || item.id || '', '');
    const completionKey = completionKeyFromSource(source);
    if (!recordId || !/^famous_gear:[^:]+$/i.test(completionKey)) return null;
    const reflection = reflectionFromSource(source);
    return {
      routeKey: 'famous_gear_route',
      completionKey,
      recordId,
      itemId: text(source.itemId || item.id || recordId, recordId),
      itemName: text(source.itemName || item.name || 'Famous Gear', 'Famous Gear'),
      slot: text(source.slot || item.slot || 'gear', 'gear'),
      memoryTitle: text(reflection.memoryTitle || 'Famous Gear Memory', 'Famous Gear Memory'),
      reflection: text(reflection.reflection || '', ''),
      summaryLine: text(reflection.summaryLine || '', ''),
      sourceLabel: text(source.source || 'Retired Gear Archive', 'Retired Gear Archive'),
      sourceFloor: safeNumber(source.floor || source.itemLevel || item.level || state?.player?.depth, revisitState.sourceFloor || 0, 0, 999999),
      startedAt: safeNumber(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }

  window.ensureRevisitStateShape = function ensureRevisitStateShape(state){
    const revisitState = originalEnsure ? originalEnsure(state) : (state?.player?.revisitState || {});
    if (!state || typeof state !== 'object') return revisitState || {};
    if (!state.player || typeof state.player !== 'object') state.player = {};
    const source = revisitState.famousGear && typeof revisitState.famousGear === 'object'
      ? revisitState.famousGear
      : {};
    const famousGear = {
      active: normalizeActiveMemory(source.active),
      history: asSafeArray(source.history).map(normalizeHistoryEntry).filter(Boolean).slice(0, 20),
      completedKeys: repairCompletedKeys(source.completedKeys),
      lastResult: normalizeHistoryEntry(source.lastResult)
    };
    const synthetic = syntheticActiveFromRouteKey(state, revisitState, famousGear);
    if (synthetic) famousGear.active = synthetic;
    revisitState.famousGear = famousGear;
    state.player.revisitState = revisitState;
    return revisitState;
  };
})();
