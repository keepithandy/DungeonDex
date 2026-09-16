// Lantern Rites: earned, run-only drafts. Explicit runtime hooks; no render wrappers.
// Content Expansion for v1.33: combat bonuses are derived, never written to base stats.
(() => {
  'use strict';
  if (window.DungeonDexLanternRites) return;

  const MILESTONES = Object.freeze([2, 5, 9, 14, 20, 27, 35, 44]);
  const BOONS = Object.freeze([
    { id:'ironwick', name:'Ironwick', kind:'Protection', cap:3, detail:rank => `+${2 * rank} Guard for this descent.`, lore:'Ash hardens along the lantern cage.' },
    { id:'red_thread', name:'Red Thread', kind:'Might', cap:3, detail:rank => `+${2 * rank} Power for this descent.`, lore:'A red filament follows the edge of your weapon.' },
    { id:'scholars_glow', name:'Scholar’s Glow', kind:'Insight', cap:3, detail:rank => `+${2 * rank} Wit for this descent.`, lore:'Forgotten letters turn in the flame.' },
    { id:'hushstep', name:'Hushstep', kind:'Footwork', cap:3, detail:rank => `+${2 * rank} Speed for this descent.`, lore:'The light arrives a heartbeat before your feet.' },
    { id:'hungry_flame', name:'Hungry Flame', kind:'Spellcraft', cap:3, detail:rank => `Spell damage +${10 * rank}% for this descent.`, lore:'The wick bends toward every spoken spell.' },
    { id:'gentle_flame', name:'Gentle Flame', kind:'Spellcraft', cap:3, detail:rank => `Spell healing and Ashburst siphon +${20 * rank}% for this descent.`, lore:'A pale ember settles beneath your ribs.' },
    { id:'emberkeeper', name:'Emberkeeper', kind:'Reserves', cap:2, detail:rank => `Every ${rank === 1 ? 3 : 2} victories after kindling, restore 1 Ember while below 4.`, lore:'Keep one coal alive and the others will answer.' },
    { id:'wayfarers_warmth', name:'Wayfarer’s Warmth', kind:'Recovery', cap:3, detail:rank => `After each victory, heal ${2 * rank}% of maximum HP (up to ${4 * rank} HP).`, lore:'Each quiet landing feels a little closer to home.' },
    { id:'firstlight', name:'Firstlight', kind:'Protection', cap:3, detail:rank => `+${10 * rank} shield against the first enemy response in each fight.`, lore:'The lantern meets the first blow before you do.' }
  ].map(boon => Object.freeze(boon)));
  const BY_ID = Object.freeze(Object.fromEntries(BOONS.map(boon => [boon.id, boon])));
  const MAX_CLEARS = 999999;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const whole = (value, fallback = 0, min = 0, max = MAX_CLEARS) => {
    if (value === null || value === '' || typeof value === 'boolean') return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(min, Math.min(max, Math.floor(numeric))) : fallback;
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const rankLabel = rank => ['','I','II','III'][rank] || '';

  function hash(value) {
    let output = 2166136261;
    for (const char of String(value)) output = Math.imul(output ^ char.charCodeAt(0), 16777619);
    return output >>> 0;
  }

  function fallbackSeed(run) {
    return hash(`lantern:${whole(run?.floor, 1) - whole(run?.roomsCleared)}:${whole(run?.charterStartFloor)}`) || 1;
  }

  function ranksFrom(decisions) {
    const ranks = Object.fromEntries(BOONS.map(boon => [boon.id, 0]));
    for (const decision of decisions) if (own(BY_ID, decision.boonId)) ranks[decision.boonId] += 1;
    return ranks;
  }

  function offersFor(seed, milestone, ranks) {
    return BOONS.filter(boon => ranks[boon.id] < boon.cap)
      .map(boon => ({ id:boon.id, weight:hash(`${seed}:${milestone}:${boon.id}`) }))
      .sort((a, b) => a.weight - b.weight || a.id.localeCompare(b.id))
      .slice(0, 3).map(boon => boon.id);
  }

  function makePending(seed, milestone, ranks) {
    return { milestone, token:`lantern:${seed.toString(36)}:${milestone}`, offers:offersFor(seed, milestone, ranks) };
  }

  // Decisions, not a saved rank map, are authoritative. At most eight earned ranks
  // can exist; malformed/duplicate decisions cannot add stats or repeat a claim.
  function normalizeState(raw, run = {}) {
    if (!run.active) return null;
    const source = plain(raw) ? raw : {};
    const clears = whole(run.roomsCleared);
    const seed = whole(source.seed, fallbackSeed(run), 1, 0xffffffff);
    const decisions = [];
    const ranks = ranksFrom([]);
    const seen = new Set();
    for (const entry of (Array.isArray(source.decisions) ? source.decisions : []).slice(0, 64)) {
      if (!plain(entry)) continue;
      const milestone = whole(entry.milestone);
      if (!MILESTONES.includes(milestone) || milestone > clears || seen.has(milestone)) continue;
      seen.add(milestone);
      const requested = String(entry.boonId || '');
      const boonId = own(BY_ID, requested) && ranks[requested] < BY_ID[requested].cap ? requested : 'skip';
      if (boonId !== 'skip') ranks[boonId] += 1;
      decisions.push({ milestone, boonId });
    }
    decisions.sort((a, b) => a.milestone - b.milestone);
    const pendingMilestone = MILESTONES.find(milestone => milestone <= clears && !seen.has(milestone));
    // Recomputing from a stored seed and the claimed ranks repairs malformed offers
    // while producing the identical draft on every render and reload.
    const pending = pendingMilestone ? makePending(seed, pendingMilestone, ranks) : null;
    return {
      version:1,
      seed,
      processedClears:whole(source.processedClears, clears, 0, clears),
      emberCharge:whole(source.emberCharge, 0, 0, 2),
      encounterKey:typeof source.encounterKey === 'string' ? source.encounterKey.slice(0, 160) : '',
      openingShieldReady:source.openingShieldReady === true,
      decisions,
      ranks,
      pending
    };
  }

  function ensure(state) {
    if (!plain(state?.run)) return null;
    state.run.lanternRites = normalizeState(state.run.lanternRites, state.run);
    return state.run.lanternRites;
  }

  function active(state) {
    return !!(state?.run?.active && state?.player && whole(state.player.hp) > 0);
  }

  function view(state) {
    return active(state) ? normalizeState(state.run.lanternRites, state.run) : null;
  }

  function startRun(state, seed) {
    if (!state?.run?.active) return null;
    let generatedSeed = whole(seed, 0, 1, 0xffffffff);
    if (!generatedSeed) {
      // Use browser entropy when available; the fallback is deterministic and
      // deliberately avoids consuming the combat RNG stream.
      try {
        const bytes = new Uint32Array(1);
        if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
        generatedSeed = whole(bytes[0], 0, 1, 0xffffffff);
      } catch (_) {}
      if (!generatedSeed) generatedSeed = fallbackSeed(state.run) || 1;
    }
    state.run.lanternRites = normalizeState({
      seed:generatedSeed,
      processedClears:whole(state.run.roomsCleared)
    }, state.run);
    return state.run.lanternRites;
  }

  function clear(state) {
    if (plain(state?.run)) state.run.lanternRites = null;
  }

  function isDraftReady(state) {
    return !!(active(state) && !state.run.event && view(state)?.pending);
  }

  function choose(state, boonId, token) {
    if (!isDraftReady(state)) return { ok:false, reason:state?.run?.event ? 'event_pending' : 'no_draft' };
    const rites = ensure(state);
    if (String(token || '') !== rites.pending.token) return { ok:false, reason:'stale_draft' };
    const chosenId = String(boonId || '');
    if (chosenId !== 'skip' && !rites.pending.offers.includes(chosenId)) return { ok:false, reason:'not_offered' };
    const milestone = rites.pending.milestone;
    if (chosenId === 'emberkeeper' && !rites.ranks.emberkeeper) rites.emberCharge = 0;
    rites.decisions.push({ milestone, boonId:chosenId });
    const updated = ensure(state);
    const boon = BY_ID[chosenId];
    return { ok:true, skipped:chosenId === 'skip', boonId:chosenId, milestone,
      name:boon?.name || '', rank:boon ? updated.ranks[chosenId] : 0,
      message:boon ? `${boon.name} ${rankLabel(updated.ranks[chosenId])} kindled. ${boon.detail(updated.ranks[chosenId])}` : 'You leave the flame unchanged.' };
  }

  function skip(state, token) { return choose(state, 'skip', token); }

  function statBonuses(state) {
    const ranks = view(state)?.ranks || {};
    return { power:2 * (ranks.red_thread || 0), guard:2 * (ranks.ironwick || 0), wit:2 * (ranks.scholars_glow || 0), speed:2 * (ranks.hushstep || 0) };
  }

  function combatModifiers(state) {
    const ranks = view(state)?.ranks || {};
    return { damageMultiplier:1 + 0.1 * (ranks.hungry_flame || 0), healMultiplier:1 + 0.2 * (ranks.gentle_flame || 0), siphonMultiplier:1 + 0.2 * (ranks.gentle_flame || 0) };
  }

  function onEncounterStart(state) {
    if (!active(state) || !state.run.monster) return false;
    const rites = ensure(state);
    const key = String(state.run.monster.id || `${whole(state.run.floor)}:${whole(state.run.encounters)}`).slice(0, 160);
    if (rites.encounterKey === key) return false;
    rites.encounterKey = key;
    rites.openingShieldReady = true;
    return true;
  }

  function consumeOpeningShield(state) {
    if (!active(state) || state.run.event || isDraftReady(state)) return 0;
    const rites = ensure(state);
    if (!rites.openingShieldReady) return 0;
    rites.openingShieldReady = false;
    return 10 * rites.ranks.firstlight;
  }

  // Called once after roomsCleared increments, before events/nextEncounter.
  // The saved processed counter makes this idempotent even after save recovery.
  function onRoomClear(state) {
    const result = { healed:0, emberRestored:0, draftQueued:false };
    if (!active(state)) return result;
    const previousPending = state.run.lanternRites?.pending?.milestone || 0;
    const rites = ensure(state);
    const clears = whole(state.run.roomsCleared);
    if (clears <= rites.processedClears) return result;
    rites.processedClears = clears;
    const warmth = rites.ranks.wayfarers_warmth;
    if (warmth) {
      const maxHp = whole(state.player.maxHp, 1, 1);
      const hp = whole(state.player.hp, 0, 0, maxHp);
      const healing = Math.max(1, Math.min(4 * warmth, Math.round(maxHp * 0.02 * warmth)));
      state.player.hp = Math.min(maxHp, hp + healing);
      result.healed = state.player.hp - hp;
    }
    const emberRank = rites.ranks.emberkeeper;
    if (emberRank) {
      rites.emberCharge += 1;
      if (rites.emberCharge >= (emberRank === 1 ? 3 : 2)) {
        rites.emberCharge = 0;
        const ember = whole(state.player.ember, 0, 0, Number.MAX_SAFE_INTEGER);
        if (ember < 4) { state.player.ember = ember + 1; result.emberRestored = 1; }
      }
    }
    result.draftQueued = !!(rites.pending && rites.pending.milestone !== previousPending);
    return result;
  }

  function summary(state) {
    const rites = view(state);
    if (!rites) return { active:false, boons:[], pending:null, nextMilestone:null, victoriesUntilNext:0, choicesMade:0 };
    const victories = whole(state.run.roomsCleared);
    const nextMilestone = MILESTONES.find(milestone => milestone > whole(state.run.roomsCleared)) || null;
    return { active:true,
      boons:BOONS.filter(boon => rites.ranks[boon.id]).map(boon => ({ id:boon.id, name:boon.name, rank:rites.ranks[boon.id], cap:boon.cap, detail:boon.detail(rites.ranks[boon.id]) })),
      pending:rites.pending,
      nextMilestone,
      victories,
      victoriesUntilNext:nextMilestone ? nextMilestone - victories : 0,
      choicesMade:rites.decisions.filter(entry => entry.boonId !== 'skip').length
    };
  }

  function draftMarkup(state) {
    if (!isDraftReady(state)) return '';
    const rites = view(state);
    const pending = rites.pending;
    const options = pending.offers.map(id => {
      const boon = BY_ID[id];
      const currentRank = rites.ranks[id];
      const rank = currentRank + 1;
      const currentDetail = currentRank ? boon.detail(currentRank) : 'Not yet kindled.';
      return `<button type="button" class="guildbound-card lantern-rite-option" data-lantern-rite="${id}" data-lantern-token="${escape(pending.token)}">
        <span class="guildbound-kicker">${escape(boon.kind)} · ${rank > 1 ? 'Strengthen' : 'Kindle'} ${rankLabel(rank)} / ${rankLabel(boon.cap)}</span>
        <strong>${escape(boon.name)}</strong><span class="lantern-rite-change"><span><b>Now</b>${escape(currentDetail)}</span><span><b>After</b>${escape(boon.detail(rank))}</span></span><span class="guildbound-muted">${escape(boon.lore)}</span>
      </button>`;
    }).join('');
    return `<section class="guildbound-panel lantern-rite-draft" aria-label="Lantern Rite">
      <div class="guildbound-heading"><div><p class="guildbound-kicker">Lantern Rite · ${pending.milestone} victories</p><h2>Tend the Lantern</h2></div><span class="guildbound-chip">Choose one</span></div>
      <p>The stair falls quiet. Kindle a boon for this descent; its light fades when you return to Lowfire.</p>
      <div class="guildbound-grid lantern-rite-options">${options}</div>
      <div class="guildbound-actions"><button type="button" class="ghost" data-lantern-skip="${escape(pending.token)}">Leave the flame unchanged</button></div>
      <p class="guildbound-muted">Choosing costs nothing. Matching boons gain a rank, up to their shown limit.</p>
    </section>`;
  }

  function summaryMarkup(state) {
    const model = summary(state);
    if (!model.active) return '';
    const progress = model.pending ? (state.run.event ? 'Rite waiting after this event' : 'A rite is ready')
      : model.nextMilestone ? `${model.victories} / ${model.nextMilestone} victories · next rite in ${model.victoriesUntilNext}` : 'The lantern is fully tended';
    const chips = model.boons.map(boon => `<span class="guildbound-chip" aria-label="${escape(boon.name)} rank ${boon.rank} of ${boon.cap}">${escape(boon.name)} ${rankLabel(boon.rank)}</span>`).join('');
    return `<section class="guildbound-panel lantern-rites-summary" aria-label="Active Lantern Rites">
      <div class="guildbound-heading"><strong>Lantern Rites</strong><span class="guildbound-muted">${escape(progress)}</span></div>
      ${chips ? `<div class="lantern-rite-chips">${chips}</div><details><summary>Active effects · this descent only</summary><ul class="lantern-rite-detail-list">${model.boons.map(boon => `<li><strong>${escape(boon.name)} ${rankLabel(boon.rank)}:</strong> ${escape(boon.detail)}</li>`).join('')}</ul></details>` : '<p class="guildbound-muted">Win two fights to kindle your first boon. Boons last until this descent ends.</p>'}
    </section>`;
  }

  window.DungeonDexLanternRites = Object.freeze({ MILESTONES, BOONS, normalizeState, ensure, startRun, clear, isDraftReady, choose, skip, statBonuses, combatModifiers, onEncounterStart, consumeOpeningShield, onRoomClear, summary, draftMarkup, summaryMarkup });
})();
