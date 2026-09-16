'use strict';

// Crimson Oath: optional extraction objectives and a permanent, cosmetic Guild record.
(function () {
  if (window.DungeonDexGuildOaths) return;

  const MAX_COUNT = 999999;
  const MAX_SERIAL = 1000000000;
  const SPELL_IDS = ['ashburst', 'cinder_ward', 'ruin_lance', 'grave_mend'];
  const RANKS = Object.freeze([
    { id:'recruit', name:'Guild Recruit', renown:0 },
    { id:'pathfinder', name:'Pathfinder', renown:6 },
    { id:'vanguard', name:'Vanguard', renown:18 },
    { id:'oathkeeper', name:'Oathkeeper', renown:40 },
    { id:'beacon', name:'Beacon of Lowfire', renown:75 }
  ].map(Object.freeze));
  const OATHS = Object.freeze([
    { id:'first_light', name:'First Light', rank:0, rooms:3, gold:35, renown:1, kind:'rooms', goal:'Clear 3 chapters, then extract alive.', flavor:'Bring a true account of the stair back to Lowfire.' },
    { id:'iron_vigil', name:'Iron Vigil', rank:0, rooms:4, gold:60, renown:2, kind:'guard', goal:'Clear 4 chapters. Use Guard in at least 3 of those victories, then extract.', flavor:'A steady shield makes a better witness than a brave epitaph.' },
    { id:'ember_scribe', name:'Ember Scribe', rank:0, rooms:4, gold:65, renown:2, kind:'spell', goal:'Clear 4 chapters. Cast a spell successfully in at least 3 victories, then extract.', flavor:'The Scriptorium asks for fieldwork written in living flame.' },
    { id:'steadfast', name:'Steadfast', rank:0, rooms:6, gold:75, renown:2, kind:'steadfast', goal:'Clear 6 chapters before your first combat extraction attempt, then extract.', flavor:'Promise the Guild six chapters before you reach for the return rope.' },
    { id:'quiet_steel', name:'Quiet Steel', rank:1, rooms:5, gold:85, renown:3, kind:'steel', goal:'Clear 5 chapters without successfully casting a spell, then extract.', flavor:'Let cold iron and patient guard carry the whole account.' },
    { id:'elite_witness', name:'Elite Witness', rank:1, rooms:1, gold:100, renown:3, kind:'elite', goal:'Defeat an Elite during this descent, then extract alive.', flavor:'Return with the name of something that made other wardens turn back.' },
    { id:'long_watch', name:'The Long Watch', rank:1, rooms:10, gold:115, renown:3, kind:'rooms', goal:'Clear 10 chapters in one descent, then extract alive.', flavor:'Mark a long trail so the next lantern need not travel blind.' },
    { id:'bellkeeper', name:'Bellkeeper', rank:2, rooms:1, gold:160, renown:5, kind:'boss', goal:'Defeat a Boss during this descent, then extract alive.', flavor:'Silence a bell below and live to hear the bells above.' },
    { id:'many_arts', name:'Many Arts', rank:2, level:4, rooms:5, gold:120, renown:4, kind:'arts', goal:'Clear 5 chapters, win 2 encounters using Guard, and cast 2 different spells successfully. Then extract.', flavor:'The Guild honors a warden who knows when to change their answer.' }
  ].map(Object.freeze));
  const KEEPSAKES = Object.freeze([
    { id:'first_knot', name:'The First Knot', renown:1, title:'Guildsworn', detail:'A cord tied for your first fulfilled oath.' },
    { id:'brass_compass', name:'Brass Compass', renown:6, title:'Pathfinder of Lowfire', detail:'A compass that points toward the wardens still missing.' },
    { id:'vanguard_seal', name:'Vanguard Seal', renown:18, title:'Lantern Vanguard', detail:'A wax seal carried by those who stand before the line.' },
    { id:'oathkeepers_chain', name:'Oathkeeper\'s Chain', renown:40, title:'Keeper of the Oaths', detail:'Each link remembers a promise brought safely home.' },
    { id:'lowfire_beacon', name:'Lowfire Beacon', renown:75, title:'Beacon of Lowfire', detail:'A tiny lantern that the Guild will never allow to dim.' }
  ].map(Object.freeze));

  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  function whole(value, fallback = 0, min = 0, max = MAX_COUNT) {
    const n = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
  }
  const text = (value, limit = 100) => typeof value === 'string' ? value.slice(0, limit) : '';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const oathById = id => OATHS.find(oath => oath.id === id) || null;
  const keepsakeById = id => KEEPSAKES.find(keepsake => keepsake.id === id) || null;
  function rankFor(renown) {
    const amount = whole(renown);
    const eligible = RANKS.filter(rank => amount >= rank.renown);
    return eligible[eligible.length - 1] || RANKS[0];
  }
  const rankIndex = renown => RANKS.indexOf(rankFor(renown));
  const copperText = copper => copper >= 100 ? `${Math.floor(copper / 100)}s${copper % 100 ? `${copper % 100}c` : ''}` : `${copper}c`;

  function breakTrigger(oath) {
    if (oath?.kind === 'steel') return 'A successful spell breaks this oath.';
    if (oath?.kind === 'steadfast') return `An extraction attempt before ${oath.rooms} cleared chapters breaks this oath.`;
    return '';
  }

  function riskText(oath) {
    const trigger = breakTrigger(oath);
    const returnRisk = 'Falling or returning before every goal is met earns no oath bonus.';
    return trigger ? `${trigger} ${returnRisk}` : returnRisk;
  }

  function createState() {
    return { version:1, selectedOath:'', renown:0, completions:{}, keepsakes:[], selectedTitle:'', previousTitle:'', runSequence:0, settledThrough:0, history:[], notice:'' };
  }
  function normalizeState(value) {
    const source = object(value);
    const result = createState();
    result.renown = whole(source.renown);
    result.runSequence = whole(source.runSequence, 0, 0, MAX_SERIAL);
    result.settledThrough = whole(source.settledThrough, 0, 0, result.runSequence);
    const selected = oathById(source.selectedOath);
    result.selectedOath = selected && selected.rank <= rankIndex(result.renown) ? selected.id : '';
    OATHS.forEach(oath => {
      const count = whole(object(source.completions)[oath.id]);
      if (count) result.completions[oath.id] = count;
    });
    // Milestones are permanent awards derived from earned renown, never a claim loop.
    result.keepsakes = KEEPSAKES.filter(keepsake => result.renown >= keepsake.renown).map(keepsake => keepsake.id);
    result.selectedTitle = result.keepsakes.includes(source.selectedTitle) ? source.selectedTitle : '';
    result.previousTitle = text(source.previousTitle, 100);
    result.notice = text(source.notice, 320);
    const seen = new Set();
    result.history = array(source.history).flatMap(raw => {
      const entry = object(raw);
      const oath = oathById(entry.oathId);
      const serial = whole(entry.serial, 0, 0, MAX_SERIAL);
      if (!oath || !serial || serial > result.settledThrough || seen.has(serial)) return [];
      seen.add(serial);
      const reason = ['extract', 'defeat', 'ended'].includes(entry.reason) ? entry.reason : 'ended';
      const completed = entry.completed === true && reason === 'extract';
      return [{ serial, oathId:oath.id, completed, reason, floor:whole(entry.floor, 1, 1), rooms:whole(entry.rooms), gold:completed ? oath.gold : 0, renown:completed ? oath.renown : 0, finishedAt:whole(entry.finishedAt, 0, 0, Number.MAX_SAFE_INTEGER) }];
    }).slice(0, 12);
    return result;
  }
  function normalizeRun(value) {
    const source = object(value);
    const oath = oathById(source.oathId);
    const serial = whole(source.serial, 0, 0, MAX_SERIAL);
    if (!oath || !serial) return null;
    const rooms = whole(source.rooms);
    return {
      version:1, serial, oathId:oath.id, startDepth:whole(source.startDepth, 1, 1), rooms,
      guardedVictories:whole(source.guardedVictories, 0, 0, rooms), spellVictories:whole(source.spellVictories, 0, 0, rooms),
      eliteVictories:whole(source.eliteVictories, 0, 0, rooms), bossVictories:whole(source.bossVictories, 0, 0, rooms),
      spellIds:Array.from(new Set(array(source.spellIds).filter(id => SPELL_IDS.includes(id)))),
      brokeOath:source.brokeOath === true, settled:source.settled === true,
      lastVictoryDepth:whole(source.lastVictoryDepth), currentEncounter:text(source.currentEncounter, 160),
      currentGuard:source.currentGuard === true, currentSpell:source.currentSpell === true
    };
  }
  function normalizeForState(state) {
    if (!state?.player) return createState();
    state.player.guildOaths = normalizeState(state.player.guildOaths);
    if (!state.run || typeof state.run !== 'object' || Array.isArray(state.run)) state.run = {};
    const run = normalizeRun(state.run.guildOath);
    const guild = state.player.guildOaths;
    state.run.guildOath = state.run.active && run && run.serial <= guild.runSequence && run.serial > guild.settledThrough && !run.settled ? run : null;
    return guild;
  }
  function ensure(state) {
    if (!state?.player) return createState();
    state.player.guildOaths = normalizeState(state.player.guildOaths);
    return state.player.guildOaths;
  }
  function activeRun(state) {
    if (!state?.run?.active) return null;
    const run = normalizeRun(state.run.guildOath);
    const guild = ensure(state);
    if (!run || run.settled || run.serial <= guild.settledThrough || run.serial > guild.runSequence) return null;
    state.run.guildOath = run;
    return run;
  }
  function availability(state, oath, guild = normalizeState(state?.player?.guildOaths)) {
    if (!oath) return { ok:false, message:'Choose an oath from the Guild board.' };
    if (oath.rank > rankIndex(guild.renown)) return { ok:false, message:`Requires ${RANKS[oath.rank].name} (${RANKS[oath.rank].renown} renown).` };
    if (whole(state?.player?.level, 1, 1) < (oath.level || 1)) return { ok:false, message:`Requires level ${oath.level} and a second unlocked spell.` };
    return { ok:true, message:'' };
  }
  function selectOath(state, id) {
    if (!state?.player) return { ok:false, message:'No warden is available.' };
    const guild = ensure(state);
    if (state.run?.active || state.screen !== 'town') return { ok:false, message:'Choose your next oath in Lowfire between descents.' };
    if (id === '') {
      guild.selectedOath = '';
      guild.notice = 'No oath prepared. Your next descent is a free expedition.';
      return { ok:true, message:guild.notice };
    }
    const oath = oathById(id);
    const allowed = availability(state, oath, guild);
    if (!allowed.ok) return allowed;
    guild.selectedOath = oath.id;
    guild.notice = `${oath.name} prepared. Enter Dungeon when ready. Rewards require a living return after meeting the goal.`;
    return { ok:true, message:guild.notice };
  }
  function beginRun(state) {
    if (!state?.player || !state?.run?.active) return null;
    const existing = activeRun(state);
    if (existing) return existing;
    const guild = ensure(state);
    const oath = oathById(guild.selectedOath);
    state.run.guildOath = null;
    if (!availability(state, oath, guild).ok || guild.runSequence >= MAX_SERIAL) return null;
    guild.runSequence += 1;
    state.run.guildOath = normalizeRun({ oathId:oath.id, serial:guild.runSequence, startDepth:state.run.floor });
    return state.run.guildOath;
  }
  function encounterKey(state, monster = state?.run?.monster) {
    return `${whole(state?.run?.floor, 1, 1)}:${text(monster?.id, 120) || 'encounter'}`;
  }
  function recordAction(state, action, context = {}) {
    const run = activeRun(state);
    if (!run || !state.run.monster || state.run.event || Number(state.run.monster.hp) <= 0) return false;
    const key = encounterKey(state);
    if (run.currentEncounter !== key) {
      run.currentEncounter = key;
      run.currentGuard = false;
      run.currentSpell = false;
    }
    if (action === 'guard') run.currentGuard = true;
    if (action === 'skill' && context.successful === true && SPELL_IDS.includes(context.spellId)) {
      run.currentSpell = true;
      if (!run.spellIds.includes(context.spellId)) run.spellIds.push(context.spellId);
      if (run.oathId === 'quiet_steel') run.brokeOath = true;
    }
    if (action === 'extract' && run.oathId === 'steadfast' && run.rooms < oathById(run.oathId).rooms) run.brokeOath = true;
    return true;
  }
  function recordVictory(state, monster) {
    const run = activeRun(state);
    const floor = whole(state?.run?.floor, 1, 1);
    if (!run || !monster || floor <= run.lastVictoryDepth || floor < run.startDepth) return false;
    run.rooms = Math.min(MAX_COUNT, run.rooms + 1);
    if (run.currentEncounter === encounterKey(state, monster)) {
      if (run.currentGuard) run.guardedVictories = Math.min(MAX_COUNT, run.guardedVictories + 1);
      if (run.currentSpell) run.spellVictories = Math.min(MAX_COUNT, run.spellVictories + 1);
    }
    if (monster.tier === 'Elite') run.eliteVictories = Math.min(MAX_COUNT, run.eliteVictories + 1);
    if (monster.tier === 'Boss') run.bossVictories = Math.min(MAX_COUNT, run.bossVictories + 1);
    run.lastVictoryDepth = floor;
    run.currentEncounter = '';
    run.currentGuard = false;
    run.currentSpell = false;
    return true;
  }
  function progressFor(value) {
    const run = normalizeRun(value);
    const oath = oathById(run?.oathId);
    if (!run || !oath) return null;
    const objectives = [{ label:'Chapters cleared', current:Math.min(run.rooms, oath.rooms), goal:oath.rooms }];
    if (oath.kind === 'guard') objectives.push({ label:'Victories using Guard', current:Math.min(run.guardedVictories, 3), goal:3 });
    if (oath.kind === 'spell') objectives.push({ label:'Victories using a spell', current:Math.min(run.spellVictories, 3), goal:3 });
    if (oath.kind === 'elite') objectives.push({ label:'Elites defeated', current:Math.min(run.eliteVictories, 1), goal:1 });
    if (oath.kind === 'boss') objectives.push({ label:'Bosses defeated', current:Math.min(run.bossVictories, 1), goal:1 });
    if (oath.kind === 'arts') {
      objectives.push({ label:'Victories using Guard', current:Math.min(run.guardedVictories, 2), goal:2 });
      objectives.push({ label:'Different spells cast', current:Math.min(run.spellIds.length, 2), goal:2 });
    }
    const complete = !run.brokeOath && objectives.every(objective => objective.current >= objective.goal);
    const ratio = run.brokeOath ? 0 : objectives.reduce((sum, objective) => sum + objective.current / objective.goal, 0) / objectives.length;
    const condition = riskText(oath);
    return { oath, run, objectives, complete, broken:run.brokeOath, percent:Math.floor(ratio * 100), condition };
  }
  function settleRun(state, reason) {
    const run = activeRun(state);
    if (!run) return { settled:false, completed:false, gold:0, renown:0, message:'', newKeepsakes:[] };
    const guild = ensure(state);
    const progress = progressFor(run);
    const oath = progress.oath;
    const completed = reason === 'extract' && progress.complete;
    const oldRank = rankFor(guild.renown);
    const oldKeepsakes = new Set(guild.keepsakes);
    run.settled = true;
    guild.settledThrough = run.serial;
    if (completed) {
      guild.renown = Math.min(MAX_COUNT, guild.renown + oath.renown);
      guild.completions[oath.id] = Math.min(MAX_COUNT, (guild.completions[oath.id] || 0) + 1);
    }
    guild.keepsakes = KEEPSAKES.filter(keepsake => guild.renown >= keepsake.renown).map(keepsake => keepsake.id);
    const newKeepsakes = guild.keepsakes.filter(id => !oldKeepsakes.has(id));
    const currentRank = rankFor(guild.renown);
    const outcome = completed ? `Oath fulfilled: ${oath.name}. ${copperText(oath.gold)} joins the secured haul; +${oath.renown} Guild renown.`
      : reason === 'defeat' ? `Oath lost: ${oath.name}. You fell before returning; no oath bonus was earned.`
        : progress.broken ? `Oath broken: ${oath.name}. ${breakTrigger(oath) || 'A restricted action ended the promise.'} Your ordinary haul is unaffected.`
          : `Oath unfulfilled: ${oath.name}. You returned before every goal was met; your ordinary haul is unaffected.`;
    const rankMessage = currentRank.id !== oldRank.id ? ` Guild rank earned: ${currentRank.name}.` : '';
    const keepsakeMessage = newKeepsakes.length ? ` Keepsake earned: ${newKeepsakes.map(id => keepsakeById(id).name).join(', ')}.` : '';
    const nextRank = RANKS[RANKS.indexOf(currentRank) + 1] || null;
    const nextRankMessage = completed && nextRank ? ` ${nextRank.renown - guild.renown} renown to ${nextRank.name}.` : completed ? ' Highest Guild rank held.' : '';
    guild.notice = `${outcome}${rankMessage}${keepsakeMessage}${nextRankMessage}`.slice(0, 320);
    guild.history.unshift({ serial:run.serial, oathId:oath.id, completed, reason:['extract','defeat'].includes(reason) ? reason : 'ended', floor:whole(state.run.floor, 1, 1), rooms:run.rooms, gold:completed ? oath.gold : 0, renown:completed ? oath.renown : 0, finishedAt:Date.now() });
    guild.history = guild.history.slice(0, 12);
    return { settled:true, completed, oathId:oath.id, gold:completed ? oath.gold : 0, renown:completed ? oath.renown : 0, message:guild.notice, newKeepsakes, rank:currentRank.id };
  }
  function selectTitle(state, id) {
    if (!state?.player || state.run?.active || state.screen !== 'town') return { ok:false, message:'Choose a Guild title in Lowfire between descents.' };
    const guild = ensure(state);
    const keepsake = keepsakeById(id);
    if (id !== '' && (!keepsake || !guild.keepsakes.includes(id))) return { ok:false, message:'Earn that keepsake before wearing its title.' };
    if (id && !guild.selectedTitle) guild.previousTitle = text(state.player.title, 100) || 'Ashbound Delver';
    guild.selectedTitle = id;
    state.player.title = keepsake ? keepsake.title : guild.previousTitle || 'Ashbound Delver';
    guild.notice = keepsake ? `Title worn: ${keepsake.title}. Guild titles are honorary and grant no combat bonuses.` : 'Your original warden title is restored.';
    return { ok:true, message:guild.notice };
  }
  function panelModel(state) {
    const guild = normalizeState(state?.player?.guildOaths);
    const rank = rankFor(guild.renown);
    const nextRank = RANKS[RANKS.indexOf(rank) + 1] || null;
    return { guild, rank, nextRank, selected:oathById(guild.selectedOath), active:state?.run?.active ? progressFor(state.run.guildOath) : null,
      totalCompleted:Object.values(guild.completions).reduce((sum, count) => sum + count, 0),
      oaths:OATHS.map(oath => ({ ...oath, ...availability(state, oath, guild), selected:guild.selectedOath === oath.id, completions:guild.completions[oath.id] || 0 })) };
  }
  function rewardMarkup(oath) {
    return `<span class="guildbound-chip">${escape(copperText(oath.gold))} + ${oath.renown} renown</span>`;
  }
  function townPanelMarkup(state) {
    const model = panelModel(state);
    const { guild, rank, nextRank } = model;
    const active = !!state?.run?.active;
    const summaryName = active && model.active
      ? `Active: ${model.active.oath.name}`
      : model.selected
        ? `Prepared: ${model.selected.name}`
        : 'No oath prepared';
    const summaryHint = active
      ? 'Bound to this descent'
      : 'Optional challenge · earn copper and renown';
    const cards = model.oaths.map(oath => `<article class="guildbound-card${oath.selected ? ' is-active' : ''}${!oath.ok ? ' is-locked' : ''}">
      <div class="guildbound-card-head"><h4>${escape(oath.name)}</h4>${rewardMarkup(oath)}</div>
      <dl class="guild-oath-terms"><div><dt>Promise</dt><dd>${escape(oath.goal)}</dd></div><div><dt>Risk</dt><dd>${escape(riskText(oath))}</dd></div></dl>
      <p class="guildbound-muted">${escape(oath.flavor)}</p>
      ${oath.completions ? `<p class="guildbound-muted">Fulfilled ${oath.completions} time${oath.completions === 1 ? '' : 's'}</p>` : ''}
      ${!oath.ok ? `<p>${escape(oath.message)}</p>` : ''}
      <button class="ghost" data-guild-oath="${oath.id}" aria-pressed="${oath.selected}"${active || !oath.ok ? ' disabled' : ''}>${oath.selected ? 'Prepared for next descent' : !oath.ok ? 'Oath locked' : 'Prepare oath'}</button>
    </article>`).join('');
    const keepsakes = KEEPSAKES.map(keepsake => {
      const owned = guild.keepsakes.includes(keepsake.id);
      return `<article class="guildbound-card${owned ? ' is-complete' : ' is-locked'}"><div class="guildbound-card-head"><h4>${escape(keepsake.name)}</h4><span class="guildbound-chip">${keepsake.renown} renown</span></div><p>${escape(keepsake.detail)}</p><p class="guildbound-muted">Title: ${escape(keepsake.title)}</p><button class="ghost" data-guild-title="${keepsake.id}" aria-pressed="${guild.selectedTitle === keepsake.id}"${active || !owned ? ' disabled' : ''}>${owned ? guild.selectedTitle === keepsake.id ? 'Title worn' : 'Wear title' : `Earn ${keepsake.renown} renown`}</button></article>`;
    }).join('');
    return `<details class="guildbound-panel guild-oaths-panel guild-oaths-dropdown" data-guild-oaths-menu="dropdown" aria-label="Warden Oaths and Guild Renown">
      <summary class="guild-oaths-summary"><span class="guild-oaths-summary-mark" aria-hidden="true">✦</span><span class="guild-oaths-summary-copy"><strong>Warden Oaths</strong><small>${escape(summaryName)} · ${escape(summaryHint)}</small></span><span class="guild-oaths-summary-meta"><strong>${guild.renown}</strong><small>renown · ${escape(rank.name)}</small></span></summary>
      <div class="guild-oaths-dropdown-body">
      <div class="guildbound-heading"><div><span class="guildbound-kicker">Crimson Oath Board</span><h3>Choose a promise for your next descent</h3></div><span class="guildbound-chip">${escape(rank.name)}</span></div>
      <p>Make one promise before you descend. Meet its goal and extract alive to earn the stated copper bonus and permanent Guild renown.</p>
      <p><strong>${guild.renown} renown</strong> · ${model.totalCompleted} fulfilled ${model.totalCompleted === 1 ? 'oath' : 'oaths'}${nextRank ? ` · ${nextRank.renown - guild.renown} to ${escape(nextRank.name)}` : ' · Highest Guild rank'}</p>
      ${nextRank ? `<progress class="guildbound-progress" value="${guild.renown}" max="${nextRank.renown}" aria-label="Guild renown toward ${escape(nextRank.name)}">${guild.renown} / ${nextRank.renown}</progress>` : ''}
      <p class="guildbound-notice">${active ? model.active ? `Bound this descent: ${escape(model.active.oath.name)}.` : 'This descent has no oath. Prepare one after returning to Lowfire.' : model.selected ? `Prepared: ${escape(model.selected.name)}. Enter Dungeon starts your oath.` : 'No oath prepared. Free expeditions remain available.'}</p>
      ${guild.notice ? `<p class="guildbound-muted" role="status">${escape(guild.notice)}</p>` : ''}
      <details class="guild-oath-menu"${guild.selectedOath ? '' : ' open'}><summary>Choose your next oath · ${escape(model.selected?.name || 'None prepared')}</summary><div class="guildbound-grid">${cards}</div><div class="guildbound-actions"><button class="ghost" data-guild-oath=""${active || !guild.selectedOath ? ' disabled' : ''}>Clear prepared oath</button></div><p class="guildbound-muted">Your selection stays prepared for later descents. Change it freely in Lowfire. Each oath settles once per descent; falling or returning early earns no oath bonus.</p></details>
      <details><summary>Guild keepsakes &amp; titles · ${guild.keepsakes.length} / ${KEEPSAKES.length}</summary><p class="guildbound-muted">Keepsakes are awarded once as your renown grows. Their honorary titles change your nameplate, with no combat bonuses.</p><div class="guildbound-grid">${keepsakes}</div><div class="guildbound-actions"><button class="ghost" data-guild-title=""${active || !guild.selectedTitle ? ' disabled' : ''}>Restore original title</button></div></details>
      </div>
    </details>`;
  }
  function runMarkup(state) {
    if (!state?.run?.active) return '';
    const progress = progressFor(state.run.guildOath);
    if (!progress) return '';
    const status = progress.broken ? 'Broken · ordinary haul unaffected' : progress.complete ? 'Goal met · extract alive to fulfill' : 'In progress';
    const objectiveText = progress.objectives.map(objective => `${objective.label} ${objective.current} of ${objective.goal}`).join('; ');
    return `<aside class="guildbound-panel guild-oath-tracker${progress.broken ? ' is-broken' : ''}" aria-label="Active Warden Oath"><div class="guildbound-card-head"><strong>${escape(progress.oath.name)}</strong>${rewardMarkup(progress.oath)}</div><p class="guild-oath-state"><strong>Status:</strong> ${escape(status)}</p><progress class="guildbound-progress" value="${progress.percent}" max="100" aria-label="${escape(progress.oath.name)} objective progress" aria-valuetext="${escape(objectiveText)}">${progress.percent}%</progress><ul class="guild-oath-objectives">${progress.objectives.map(objective => `<li><span>${escape(objective.label)}</span><strong>${objective.current} / ${objective.goal}</strong></li>`).join('')}</ul><p class="guildbound-muted guild-oath-risk"><strong>Risk:</strong> ${escape(progress.condition)}</p></aside>`;
  }
  function journalMarkup(state) {
    const model = panelModel(state);
    const history = model.guild.history.map(entry => {
      const oath = oathById(entry.oathId);
      return `<li><strong>${escape(oath.name)}</strong> · ${entry.completed ? `Fulfilled · ${escape(copperText(entry.gold))} + ${entry.renown} renown` : entry.reason === 'defeat' ? 'Lost with the descent' : 'Unfulfilled return'} · ${entry.rooms} ${entry.rooms === 1 ? 'chapter' : 'chapters'} cleared</li>`;
    }).join('');
    return `<section class="guildbound-panel" aria-label="Guild oath chronicle"><div class="guildbound-heading"><div><span class="guildbound-kicker">Guild Chronicle</span><h3>Promises brought home</h3></div><span class="guildbound-chip">${escape(model.rank.name)}</span></div><p>${model.guild.renown} renown · ${model.totalCompleted} fulfilled ${model.totalCompleted === 1 ? 'oath' : 'oaths'} · ${model.guild.keepsakes.length} keepsakes</p><p>${model.guild.keepsakes.length ? `Keepsakes: ${model.guild.keepsakes.map(id => escape(keepsakeById(id).name)).join(' · ')}` : 'Prepare a Warden Oath in Lowfire, meet its goal, and extract alive to begin your Guild record.'}</p>${model.guild.selectedTitle ? `<p class="guild-oath-title">Title worn: ${escape(keepsakeById(model.guild.selectedTitle).title)}</p>` : ''}${history ? `<details><summary>Recent oath outcomes · ${model.guild.history.length}</summary><ul>${history}</ul></details>` : ''}</section>`;
  }

  window.DungeonDexGuildOaths = Object.freeze({ OATHS, RANKS, KEEPSAKES, createState, normalizeState, normalizeRun, normalizeForState, selectOath, beginRun, recordAction, recordVictory, settleRun, selectTitle, progressFor, panelModel, townPanelMarkup, runMarkup, journalMarkup, rankFor });
})();
