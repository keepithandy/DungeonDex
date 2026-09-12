'use strict';

// DungeonDex v1.32.2 - Spell Mastery, inscriptions, discoveries, and Scriptorium helpers.
(function(){
  if (window.DungeonDexSpellMastery) return;

  const ADEPT_MASTERY = 8;
  const MASTER_MASTERY = 24;
  const RESPEC_COPPER_COST = 150;
  const MAX_MASTERY = 9999;
  const MAX_RESPECS = 9999;
  const AFFINITY_CAP = 2;

  const INSCRIPTIONS = Object.freeze({
    ashburst: Object.freeze({
      cinder_script: Object.freeze({ name:'Cinder Script', detail:'Ashburst strikes harder.', kind:'standard' }),
      kindle_script: Object.freeze({ name:'Kindle Script', detail:'Ashburst restores more health.', kind:'standard' }),
      wildfire_verse: Object.freeze({ name:'Wildfire Verse', detail:'A boss-found verse that burns especially bright against bosses.', kind:'boss' })
    }),
    cinder_ward: Object.freeze({
      iron_script: Object.freeze({ name:'Iron Script', detail:'Cinder Ward raises a stronger ward.', kind:'standard' }),
      reprieve_script: Object.freeze({ name:'Reprieve Script', detail:'Cinder Ward restores more health.', kind:'standard' }),
      mirror_verse: Object.freeze({ name:'Mirror Verse', detail:'An event-found verse that reflects part of one hit.', kind:'event' })
    }),
    ruin_lance: Object.freeze({
      pierce_script: Object.freeze({ name:'Pierce Script', detail:'Ruin Lance ignores more guard.', kind:'standard' }),
      eclipse_script: Object.freeze({ name:'Eclipse Script', detail:'A finishing lance returns ember.', kind:'standard' })
    }),
    grave_mend: Object.freeze({
      sentinel_script: Object.freeze({ name:'Sentinel Script', detail:'Grave Mend shelters beneath a stronger ward.', kind:'standard' }),
      mercy_script: Object.freeze({ name:'Mercy Script', detail:'Grave Mend deepens when health is low.', kind:'standard' })
    })
  });

  const RARE_DISCOVERIES = Object.freeze({
    boss: Object.freeze({ spellId:'ashburst', inscriptionId:'wildfire_verse' }),
    event: Object.freeze({ spellId:'cinder_ward', inscriptionId:'mirror_verse' })
  });

  const SLOT_AFFINITIES = Object.freeze({
    weapon:'ashburst', gloves:'ashburst', boots:'ashburst', charm:'ashburst',
    offhand:'cinder_ward', armor:'cinder_ward',
    ring:'ruin_lance', amulet:'ruin_lance',
    helm:'grave_mend', cloak:'grave_mend'
  });

  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function list(value){ return Array.isArray(value) ? value : []; }
  function whole(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER){
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(min, Math.min(max, Math.floor(numeric))) : fallback;
  }
  function spellList(){ return Array.isArray(typeof COMBAT_SPELLS !== 'undefined' ? COMBAT_SPELLS : []) ? COMBAT_SPELLS : []; }
  function spellById(id){ return spellList().find(spell => spell && spell.id === String(id || '').trim()) || null; }
  function isSpellId(id){ return !!spellById(id); }
  function discoveryKey(spellId, inscriptionId){ return `${String(spellId || '').trim()}:${String(inscriptionId || '').trim()}`; }
  function inscriptionFor(spellId, inscriptionId){ return INSCRIPTIONS[String(spellId || '').trim()]?.[String(inscriptionId || '').trim()] || null; }
  function validInscription(spellId, inscriptionId){ return !!inscriptionFor(spellId, inscriptionId); }

  function createSpellMasteryState(){
    const spells = {};
    spellList().forEach(spell => {
      spells[spell.id] = { mastery:0, inscription:'', mastered:false };
    });
    return { version:1, spells, discoveries:[], respecs:0 };
  }

  function normalizeSpellMasteryState(value){
    const source = obj(value);
    const base = createSpellMasteryState();
    const savedSpells = obj(source.spells);
    const validDiscoveries = new Set();
    list(source.discoveries).forEach(raw => {
      const parts = String(raw || '').split(':');
      if (parts.length !== 2) return;
      const [spellId, inscriptionId] = parts;
      const inscription = inscriptionFor(spellId, inscriptionId);
      if (inscription?.kind === 'boss' || inscription?.kind === 'event') validDiscoveries.add(discoveryKey(spellId, inscriptionId));
    });
    spellList().forEach(spell => {
      const saved = obj(savedSpells[spell.id]);
      const mastery = whole(saved.mastery, 0, 0, MAX_MASTERY);
      const inscription = validInscription(spell.id, saved.inscription) ? String(saved.inscription) : '';
      const definition = inscriptionFor(spell.id, inscription);
      const rareAllowed = definition?.kind === 'boss' || definition?.kind === 'event';
      const canKeep = !!inscription && mastery >= ADEPT_MASTERY && (!rareAllowed || validDiscoveries.has(discoveryKey(spell.id, inscription)));
      base.spells[spell.id] = {
        mastery,
        inscription: canKeep ? inscription : '',
        mastered: canKeep && mastery >= MASTER_MASTERY && saved.mastered === true
      };
    });
    base.discoveries = Array.from(validDiscoveries).sort();
    base.respecs = whole(source.respecs, 0, 0, MAX_RESPECS);
    return base;
  }

  function ensureSpellMastery(state){
    if (!state || !state.player) return createSpellMasteryState();
    state.player.spellMastery = normalizeSpellMasteryState(state.player.spellMastery);
    return state.player.spellMastery;
  }

  function entryFor(state, spellId){
    const mastery = ensureSpellMastery(state);
    return mastery.spells[String(spellId || '').trim()] || { mastery:0, inscription:'', mastered:false };
  }

  function isRareInscriptionDiscovered(state, spellId, inscriptionId){
    return ensureSpellMastery(state).discoveries.includes(discoveryKey(spellId, inscriptionId));
  }

  function masteryRank(entry){
    const mastery = whole(entry?.mastery, 0, 0, MAX_MASTERY);
    if (mastery >= MASTER_MASTERY && entry?.mastered) return 'Master';
    if (mastery >= MASTER_MASTERY) return 'Masterwork Ready';
    if (mastery >= ADEPT_MASTERY) return 'Adept';
    return 'Novice';
  }

  function spellAffinityForGear(item){
    const explicit = String(item?.spellAffinity || '').trim();
    if (isSpellId(explicit)) return explicit;
    return SLOT_AFFINITIES[String(item?.slot || '').trim()] || '';
  }

  function equippedAffinityCount(state, spellId){
    const equipment = obj(state?.player?.equipment);
    const seen = new Set();
    let count = 0;
    Object.values(equipment).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const key = String(item.id || `${item.slot || ''}:${item.name || ''}`).trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (spellAffinityForGear(item) === spellId) count += 1;
    });
    return count;
  }

  function affinityMasteryBonus(state, spellId){
    return Math.min(AFFINITY_CAP, equippedAffinityCount(state, spellId));
  }

  function recordSpellCast(state, spellId){
    if (!isSpellId(spellId)) return { gained:0, affinityBonus:0, reachedAdept:false, reachedMastery:false, entry:null };
    const entry = entryFor(state, spellId);
    const previous = whole(entry.mastery, 0, 0, MAX_MASTERY);
    const affinityBonus = affinityMasteryBonus(state, spellId);
    const gained = 1 + affinityBonus;
    entry.mastery = Math.min(MAX_MASTERY, previous + gained);
    return {
      gained: entry.mastery - previous,
      affinityBonus,
      reachedAdept: previous < ADEPT_MASTERY && entry.mastery >= ADEPT_MASTERY,
      reachedMastery: previous < MASTER_MASTERY && entry.mastery >= MASTER_MASTERY,
      entry
    };
  }

  function chooseInscription(state, spellId, inscriptionId){
    const spell = spellById(spellId);
    if (!state?.player || !spell) return { ok:false, reason:'unknown_spell' };
    const level = whole(state.player.level, 1, 1, 999);
    if (typeof combatSpellUnlocked === 'function' && !combatSpellUnlocked(spell, level)) return { ok:false, reason:'locked_spell' };
    const mastery = ensureSpellMastery(state);
    const entry = mastery.spells[spell.id];
    const definition = inscriptionFor(spell.id, inscriptionId);
    if (!definition) return { ok:false, reason:'unknown_inscription' };
    if (entry.mastery < ADEPT_MASTERY) return { ok:false, reason:'mastery_low' };
    if (entry.inscription) return { ok:false, reason:'already_inscribed' };
    if ((definition.kind === 'boss' || definition.kind === 'event') && !mastery.discoveries.includes(discoveryKey(spell.id, inscriptionId))) return { ok:false, reason:'undiscovered' };
    entry.inscription = inscriptionId;
    entry.mastered = false;
    return { ok:true, entry, spell, inscription:definition };
  }

  function masterInscription(state, spellId){
    const spell = spellById(spellId);
    if (!state?.player || !spell) return { ok:false, reason:'unknown_spell' };
    const entry = entryFor(state, spell.id);
    if (!entry.inscription) return { ok:false, reason:'no_inscription' };
    if (entry.mastery < MASTER_MASTERY) return { ok:false, reason:'mastery_low' };
    if (entry.mastered) return { ok:false, reason:'already_mastered' };
    entry.mastered = true;
    return { ok:true, entry, spell, inscription:inscriptionFor(spell.id, entry.inscription) };
  }

  function respecSpell(state, spellId){
    const spell = spellById(spellId);
    if (!state?.player || !spell) return { ok:false, reason:'unknown_spell' };
    const entry = entryFor(state, spell.id);
    if (!entry.inscription) return { ok:false, reason:'no_inscription' };
    const gold = whole(state.player.gold, 0, 0, Number.MAX_SAFE_INTEGER);
    if (gold < RESPEC_COPPER_COST) return { ok:false, reason:'not_enough_copper', cost:RESPEC_COPPER_COST };
    state.player.gold = gold - RESPEC_COPPER_COST;
    entry.inscription = '';
    entry.mastered = false;
    ensureSpellMastery(state).respecs += 1;
    return { ok:true, entry, spell, cost:RESPEC_COPPER_COST };
  }

  function discoverRareInscription(state, source){
    const rare = RARE_DISCOVERIES[String(source || '').trim()];
    if (!state?.player || !rare) return { unlocked:false, reason:'unknown_source' };
    const key = discoveryKey(rare.spellId, rare.inscriptionId);
    const mastery = ensureSpellMastery(state);
    if (mastery.discoveries.includes(key)) return { unlocked:false, reason:'known', key };
    mastery.discoveries.push(key);
    mastery.discoveries.sort();
    return {
      unlocked:true,
      source:String(source),
      key,
      spell:spellById(rare.spellId),
      inscription:inscriptionFor(rare.spellId, rare.inscriptionId)
    };
  }

  function combatModifiers(state, spellId, monster){
    const entry = entryFor(state, spellId);
    const inscription = inscriptionFor(spellId, entry.inscription);
    const masterPower = entry.mastered ? 1.12 : 1;
    const modifiers = {
      damageMultiplier:1,
      defenseMultiplier:1,
      shieldMultiplier:1,
      healMultiplier:1,
      lowHealthHealMultiplier:1,
      siphonMultiplier:1,
      reflectRatio:0,
      emberOnKill:0,
      inscription,
      mastered:entry.mastered
    };
    if (!inscription) return modifiers;
    if (spellId === 'ashburst' && entry.inscription === 'cinder_script') modifiers.damageMultiplier = 1.18 * masterPower;
    if (spellId === 'ashburst' && entry.inscription === 'kindle_script') modifiers.siphonMultiplier = 1.55 * masterPower;
    if (spellId === 'ashburst' && entry.inscription === 'wildfire_verse') modifiers.damageMultiplier = (monster?.tier === 'Boss' ? 1.32 : 1.14) * masterPower;
    if (spellId === 'cinder_ward' && entry.inscription === 'iron_script') modifiers.shieldMultiplier = 1.25 * masterPower;
    if (spellId === 'cinder_ward' && entry.inscription === 'reprieve_script') modifiers.healMultiplier = 1.4 * masterPower;
    if (spellId === 'cinder_ward' && entry.inscription === 'mirror_verse') {
      modifiers.shieldMultiplier = 1.1 * masterPower;
      modifiers.reflectRatio = 0.3 * masterPower;
    }
    if (spellId === 'ruin_lance' && entry.inscription === 'pierce_script') {
      modifiers.defenseMultiplier = 0.22;
      modifiers.damageMultiplier = masterPower;
    }
    if (spellId === 'ruin_lance' && entry.inscription === 'eclipse_script') {
      modifiers.damageMultiplier = 1.15 * masterPower;
      modifiers.emberOnKill = entry.mastered ? 2 : 1;
    }
    if (spellId === 'grave_mend' && entry.inscription === 'sentinel_script') modifiers.shieldMultiplier = 1.7 * masterPower;
    if (spellId === 'grave_mend' && entry.inscription === 'mercy_script') modifiers.lowHealthHealMultiplier = 1.5 * masterPower;
    return modifiers;
  }

  function panelModel(state){
    const level = whole(state?.player?.level, 1, 1, 999);
    const mastery = ensureSpellMastery(state);
    return {
      level,
      respecCost:RESPEC_COPPER_COST,
      spells:spellList().map(spell => {
        const entry = mastery.spells[spell.id];
        const unlocked = typeof combatSpellUnlocked === 'function' ? combatSpellUnlocked(spell, level) : level >= spell.unlockLevel;
        const inscriptions = Object.entries(INSCRIPTIONS[spell.id] || {}).map(([id, definition]) => ({
          id,
          ...definition,
          discovered: definition.kind === 'standard' || mastery.discoveries.includes(discoveryKey(spell.id, id))
        }));
        return {
          ...spell,
          unlocked,
          entry,
          rank:masteryRank(entry),
          affinity:equippedAffinityCount(state, spell.id),
          inscriptions
        };
      })
    };
  }

  function money(value){
    return typeof formatMoney === 'function' ? formatMoney(value) : `${whole(value)}c`;
  }

  function panelMarkup(state){
    const model = panelModel(state);
    const cards = model.spells.map(spell => {
      const entry = spell.entry;
      const active = inscriptionFor(spell.id, entry.inscription);
      const canInscribe = spell.unlocked && !entry.inscription && entry.mastery >= ADEPT_MASTERY;
      const canMaster = spell.unlocked && !!entry.inscription && !entry.mastered && entry.mastery >= MASTER_MASTERY;
      const canRespec = !!entry.inscription && whole(state?.player?.gold, 0, 0, Number.MAX_SAFE_INTEGER) >= model.respecCost;
      const options = spell.inscriptions.map(inscription => {
        const unavailable = !inscription.discovered;
        const disabled = !canInscribe || unavailable;
        const label = unavailable ? `${inscription.name} · find ${inscription.kind === 'boss' ? 'a boss folio' : 'an event folio'}` : inscription.name;
        return `<button class="ghost mini" type="button" data-spell-inscribe="${spell.id}:${inscription.id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
      }).join('');
      const pathLine = active
        ? `${active.name}${entry.mastered ? ' · Mastered' : entry.mastery >= MASTER_MASTERY ? ' · Masterwork ready' : ''}`
        : entry.mastery >= ADEPT_MASTERY ? 'Choose an inscription below.' : `Adept at ${ADEPT_MASTERY} mastery.`;
      const affinityLine = spell.affinity > 0
        ? `${spell.affinity} equipped affinity${spell.affinity === 1 ? '' : ' affinities'} · +${Math.min(AFFINITY_CAP, spell.affinity)} mastery per cast`
        : 'Equip matching gear for up to +2 mastery per cast.';
      return `<article class="quest-card spell-mastery-card">
        <div class="split"><div><strong>${spell.name}</strong><p class="small muted">${spell.detail}</p></div><span class="pill">${entry.mastery} mastery · ${spell.rank}</span></div>
        <p class="small">${pathLine}</p>
        <p class="small muted">${affinityLine}</p>
        ${spell.unlocked ? `<div class="inline-actions">${options}${entry.inscription ? `<button class="primary mini" type="button" data-spell-master="${spell.id}" ${canMaster ? '' : 'disabled'}>Master Path</button><button class="ghost mini" type="button" data-spell-respec="${spell.id}" ${canRespec ? '' : 'disabled'}>Respec ${money(model.respecCost)}</button>` : ''}</div>` : `<p class="small muted">Unlocks at Level ${spell.unlockLevel}.</p>`}
      </article>`;
    }).join('');
    return `<div class="town-section-shell town-scriptorium-shell">
      <div class="town-section-head"><div><span class="eyebrow town-section-kicker">Lowfire Scriptorium</span><h2>Spell Mastery</h2><p>Cast spells to refine them. At Adept, choose one path; at Master, deepen it.</p></div></div>
      <div class="tag-row"><span class="pill">Adept ${ADEPT_MASTERY}</span><span class="pill">Master ${MASTER_MASTERY}</span><span class="pill">Respec ${money(model.respecCost)}</span></div>
      <div class="list spell-mastery-list">${cards}</div>
    </div>`;
  }

  function journalModel(state){
    const mastery = normalizeSpellMasteryState(state?.player?.spellMastery);
    const active = spellList().map(spell => ({ spell, entry:mastery.spells[spell.id] }))
      .filter(record => record.entry.inscription);
    const mastered = active.filter(record => record.entry.mastered);
    const discovered = mastery.discoveries.length;
    return {
      activeCount:active.length,
      masteredCount:mastered.length,
      discoveryCount:discovered,
      latest:mastered[0]?.spell?.name || active[0]?.spell?.name || '',
      body:active.length
        ? `${active.length} spell path${active.length === 1 ? '' : 's'} inscribed${mastered.length ? `; ${mastered.length} mastered` : ''}.`
        : 'No spell paths are inscribed yet.',
      detail:discovered
        ? `${discovered} rare folio${discovered === 1 ? '' : 's'} preserved in the Scriptorium.`
        : 'Bosses and run incidents may yield rare folios.'
    };
  }

  window.DungeonDexSpellMastery = Object.freeze({
    ADEPT_MASTERY,
    MASTER_MASTERY,
    RESPEC_COPPER_COST,
    INSCRIPTIONS,
    createState:createSpellMasteryState,
    normalizeState:normalizeSpellMasteryState,
    ensure:ensureSpellMastery,
    entryFor,
    rank:masteryRank,
    affinityForGear:spellAffinityForGear,
    affinityBonus:affinityMasteryBonus,
    recordCast:recordSpellCast,
    chooseInscription,
    masterInscription,
    respecSpell,
    discoverRareInscription,
    combatModifiers,
    panelModel,
    panelMarkup,
    journalModel
  });
  window.createSpellMasteryState = createSpellMasteryState;
  window.normalizeSpellMasteryState = normalizeSpellMasteryState;
  window.renderSpellMasteryTownPanel = panelMarkup;
  window.spellMasteryJournalModel = journalModel;
  window.spellAffinityForGear = spellAffinityForGear;
})();
