'use strict';

// Elite modifier registry, selection, rewards, and markup
  // Elite modifier audit:
  // This registry feeds generation, display, combat hooks, and reward scaling.
  // Older saves may only have monster.modifier; helpers below normalize both shapes.
  const ELITE_MODIFIERS = [
    { id:'frenzied', key:'Frenzied', name:'Frenzied', label:'fast striker', description:'Fast damage pressure.', tier:1, rarity:'common', minThreat:1, weight:18, tags:['speed','pressure'], conflicts:['speed','burst'], displayPriority:30, power:1.14, hp:1.03, guard:1.0, speed:1.08, reward:1.13, rewardWeight:1.05, combatHook:'stat_pressure', text:'lashes with frantic speed', danger:'Hits harder and faster than a normal elite.', callout:'Guard early if the exchange starts badly.' },
    { id:'ironhide', key:'Ironhide', name:'Ironhide', label:'heavy guard', description:'Armor and HP pressure.', tier:1, rarity:'common', minThreat:1, weight:17, tags:['defensive_wall'], conflicts:['defensive_wall','healing'], displayPriority:25, power:1.03, hp:1.13, guard:1.18, speed:0.97, reward:1.14, rewardWeight:1.05, combatHook:'stat_pressure', text:'wears layered ruin-plate', danger:'High guard and extra HP make it harder to burst down.', callout:'Expect a longer fight unless your power is ready.' },
    { id:'venomous', key:'Venomous', name:'Venomous', label:'poison risk', description:'Adds poison after successful hits.', tier:2, rarity:'uncommon', minThreat:4, weight:13, tags:['attrition','punishment'], conflicts:['attrition','healing'], displayPriority:40, power:1.06, hp:1.04, guard:1.01, speed:1.0, reward:1.18, rewardWeight:1.1, combatHook:'poison_on_hit', text:'bleeds poison into every cut', danger:'Successful hits add poison damage after the strike.', callout:'Guard early if your HP is already thin.' },
    { id:'swift', key:'Swift', name:'Swift', label:'high speed', description:'Acts with higher speed.', tier:2, rarity:'uncommon', minThreat:6, weight:12, tags:['speed','pressure'], conflicts:['speed','burst'], displayPriority:35, power:1.06, hp:1.0, guard:0.98, speed:1.20, reward:1.17, rewardWeight:1.08, combatHook:'stat_pressure', text:'moves before the eye can settle', danger:'High speed makes its turns feel relentless.', callout:'Do not let the fight drag without a plan.' },
    { id:'hollow_eyed', key:'Hollow-Eyed', name:'Hollow-Eyed', label:'piercing hits', description:'Can pierce through defenses.', tier:2, rarity:'uncommon', minThreat:7, weight:11, tags:['burst','punishment'], conflicts:['burst','speed'], displayPriority:45, power:1.12, hp:1.02, guard:1.0, speed:1.04, reward:1.19, rewardWeight:1.11, combatHook:'pierce_chance', text:'hunts weak spots through dead lantern-light', danger:'May land piercing precision damage through defenses.', callout:'Even guarded wardens can take sudden chip damage.' },
    { id:'ash_fed', key:'Ash-fed', name:'Ash-fed', label:'ramp threat', description:'Surges once at low HP.', tier:2, rarity:'uncommon', minThreat:8, weight:10, tags:['pressure','attrition'], conflicts:['attrition','defensive_wall'], displayPriority:50, power:1.08, hp:1.07, guard:1.03, speed:1.01, reward:1.2, rewardWeight:1.12, combatHook:'low_hp_surge', text:'grows hotter as the fight drags on', danger:'Surges once when badly wounded.', callout:'Finish cleanly when it drops near death.' },
    { id:'gravebound', key:'Gravebound', name:'Gravebound', label:'revives once', description:'Revives once instead of dying.', tier:3, rarity:'rare', minThreat:12, weight:7, tags:['defensive_wall','attrition'], conflicts:['defensive_wall','healing','attrition'], displayPriority:60, power:1.06, hp:1.10, guard:1.04, speed:0.98, reward:1.26, rewardWeight:1.18, combatHook:'revive_once', text:'refuses the first call to die', danger:'Revives once instead of dying immediately.', callout:'Save enough HP for a second finish.' },
    { id:'wardmarked', key:'Wardmarked', name:'Wardmarked', label:'burst ward', description:'Resists reckless burst damage.', tier:3, rarity:'rare', minThreat:10, weight:8, tags:['defensive_wall','punishment'], conflicts:['defensive_wall','burst'], displayPriority:55, power:1.06, hp:1.05, guard:1.11, speed:1.0, reward:1.22, rewardWeight:1.14, combatHook:'guard_pressure', text:'turns aside reckless bursts', danger:'Extra guard resists quick burst damage.', callout:'Steady attacks beat wasted spikes.' },
    { id:'bleeding_edge', key:'Bleeding Edge', name:'Bleeding Edge', label:'contract bleed', description:'Contract-only blade pressure.', tier:2, rarity:'uncommon', minThreat:999, weight:0, tags:['pressure'], conflicts:[], displayPriority:70, power:1.05, hp:1.02, guard:1.0, speed:1.03, reward:1.0, rewardWeight:1.0, combatHook:'contract_target', text:'drags broken blades behind it', danger:'Contract target pressure. Stronger than a normal elite.', callout:'Keep HP steady before committing to the finish.' },
    { id:'cinder_oath', key:'Cinder Oath', name:'Cinder Oath', label:'contract oath', description:'Contract-only cinder pressure.', tier:2, rarity:'uncommon', minThreat:999, weight:0, tags:['pressure'], conflicts:[], displayPriority:70, power:1.04, hp:1.04, guard:1.01, speed:1.0, reward:1.0, rewardWeight:1.0, combatHook:'contract_target', text:'wears trophy armor from failed Wardens', danger:'Contract target pressure. Stronger than a normal elite.', callout:'Expect a steady exchange, not a quick errand.' },
    { id:'debt_court', key:'Debt Court', name:'Debt Court', label:'contract debt', description:'Contract-only debt-court armor.', tier:2, rarity:'uncommon', minThreat:999, weight:0, tags:['defensive_wall'], conflicts:[], displayPriority:70, power:1.02, hp:1.05, guard:1.05, speed:0.98, reward:1.0, rewardWeight:1.0, combatHook:'contract_target', text:'collects with court iron', danger:'Contract target pressure. Stronger than a normal elite.', callout:'Guard and chip through the armor.' },
    { id:'mirror_debt', key:'Mirror Debt', name:'Mirror Debt', label:'contract mirror', description:'Contract-only piercing pressure.', tier:3, rarity:'rare', minThreat:999, weight:0, tags:['punishment'], conflicts:[], displayPriority:70, power:1.06, hp:1.03, guard:1.0, speed:1.02, reward:1.0, rewardWeight:1.0, combatHook:'contract_target', text:'remembers every Warden who ran', danger:'Contract target pressure. Stronger than a normal elite.', callout:'Avoid low-HP trades against the marked target.' }
  ];

  const ELITE_STACKED_MODIFIER_MIN_DEPTH = 45;
  const ELITE_STACKED_MODIFIER_MAX_COUNT = 2;

  function eliteModifierDef(value) {
    if (!value) return null;
    const id = String(isPlainObject(value) ? (value.id || value.key || value.name) : value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!id) return null;
    return ELITE_MODIFIERS.find(entry => [entry.id, entry.key, entry.name].some(token => String(token || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') === id)) || null;
  }

  function normalizeEliteModifier(value) {
    const def = eliteModifierDef(value);
    return def ? { ...def } : null;
  }

  function eliteModifiersForMonster(monster) {
    return [];
  }

  function hasEliteModifier(monster, value) {
    return false;
  }

  function eliteModifierLabel(modifier) {
    const def = normalizeEliteModifier(modifier);
    return def?.label || 'elite threat';
  }

  function eliteModifierDanger(modifier) {
    const def = normalizeEliteModifier(modifier);
    return def?.danger || 'A marked elite with stronger pressure than normal.';
  }

  function eliteModifierCallout(modifier) {
    const def = normalizeEliteModifier(modifier);
    return def?.callout || eliteModifierDanger(def);
  }

  function eliteModifierTierLabel(modifier) {
    const tier = Math.floor(numberOr(modifier?.tier, 1, 1, 4));
    return tier === 3 ? 'Rare' : tier === 2 ? 'Uncommon' : 'Common';
  }

  function eliteModifierConflictTags(modifier) {
    return Array.from(new Set(asArray(modifier?.tags, []).concat(asArray(modifier?.conflicts, [])).map(String)));
  }

  function eliteModifiersConflict(a, b) {
    const aTags = eliteModifierConflictTags(a);
    const bTags = eliteModifierConflictTags(b);
    if (!aTags.length || !bTags.length) return false;
    const hardTags = ['defensive_wall','healing','burst','speed','attrition','punishment'];
    const sharedHard = aTags.some(tag => hardTags.includes(tag) && bTags.includes(tag));
    const aBlocksB = asArray(a?.conflicts, []).some(tag => bTags.includes(tag));
    const bBlocksA = asArray(b?.conflicts, []).some(tag => aTags.includes(tag));
    return sharedHard || aBlocksB || bBlocksA;
  }

  function weightedPick(entries) {
    const total = entries.reduce((sum, entry) => sum + Math.max(1, numberOr(entry.weight, 1, 1, 999)), 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= Math.max(1, numberOr(entry.weight, 1, 1, 999));
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1] || null;
  }

  function eliteModifierCountForDepth(rawDepth) {
    const depth = depthStageValue(rawDepth);
    if (depth >= 75 && Math.random() < 0.34) return 2;
    if (depth >= ELITE_STACKED_MODIFIER_MIN_DEPTH && Math.random() < 0.22) return 2;
    return 1;
  }

  function eligibleEliteModifiers(rawDepth) {
    const threat = threatDepthFromDepth(rawDepth);
    return ELITE_MODIFIERS.filter(modifier => {
      const minThreat = Math.floor(numberOr(modifier.minThreat, 1, 1, 999));
      if (threat < minThreat) return false;
      if (threat <= 5 && modifier.tier > 1) return false;
      if (threat <= 10 && modifier.tier > 2) return false;
      return true;
    });
  }

  function selectEliteModifiers(rawDepth, state = null) {
    return [];
  }

  function eliteModifierStatProfile(modifiers) {
    return { power:1, hp:1, guard:1, speed:1, reward:1 };
  }

  function eliteRewardProfile(modifiers, rawDepth) {
    return null;
  }

  function normalizeEliteRewardProfile(value, modifiers = [], rawDepth = 1) {
    return null;
  }

  function eliteModifierNames(modifiers) {
    return asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean).map(modifier => modifier.name || modifier.key).join(' + ');
  }

  function eliteModifierDangerSummary(modifiers) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    if (!list.length) return 'Simple elite pressure.';
    if (list.length === 1) return list[0].danger;
    return `Layered pressure: ${list.map(modifier => modifier.label).join(' + ')}.`;
  }

  function eliteModifierCalloutSummary(modifiers) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    if (!list.length) return 'Read the modifier before committing to the fight.';
    if (list.length === 1) return list[0].callout;
    return 'Watch the first exchange, then choose damage or guard before it drags out.';
  }

  function eliteModifierPlanLine(modifiers) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    if (!list.length) return 'Read the modifier before committing to the fight.';
    const ids = new Set(list.map(modifier => modifier.id));
    const notes = [];
    if (ids.has('frenzied') || ids.has('swift')) notes.push('guard early against speed pressure');
    if (ids.has('ironhide') || ids.has('wardmarked')) notes.push('expect a longer armor check');
    if (ids.has('venomous') || ids.has('hollow_eyed')) notes.push('avoid low-HP trades');
    if (ids.has('ash_fed')) notes.push('finish cleanly near low HP');
    if (ids.has('gravebound')) notes.push('save enough HP for a second finish');
    return notes.slice(0, 2).join(' • ') || eliteModifierCalloutSummary(list);
  }

  function eliteModifierMiniText(modifier) {
    const def = normalizeEliteModifier(modifier);
    if (!def) return 'elite threat';
    return String(def.label || def.description || 'elite threat').toLowerCase();
  }

  function eliteModifierThreatRating(modifiers) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    const score = list.reduce((sum, modifier) => sum + Math.floor(numberOr(modifier.tier, 1, 1, 4)), 0);
    if (score >= 5) return 'Severe elite threat';
    if (score >= 3) return 'High elite threat';
    return 'Marked elite threat';
  }

  function eliteModifierMarkup(monster) {
    return '';
  }
