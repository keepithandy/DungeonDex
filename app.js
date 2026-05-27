(() => {
  'use strict';

  /**
   * Editor-only state shape notes for future structure passes.
   * These broad typedefs document the plain-JS save/runtime objects without
   * changing runtime behavior, storage keys, or requiring TypeScript.
   *
   * @typedef {number} Currency
   *
   * @typedef {Object} StatBlock
   * @property {number} power
   * @property {number} guard
   * @property {number} wit
   * @property {number} luck
   * @property {number} speed
   * @property {number} [hp]
   *
   * @typedef {Object} Item
   * @property {string} id
   * @property {string} name
   * @property {string} slot
   * @property {string} rarity
   * @property {number} level
   * @property {number} rating
   * @property {Currency} value
   * @property {StatBlock} stats
   * @property {string[]} tags
   * @property {string} summary
   *
   * @typedef {Object} Enemy
   * @property {string} id
   * @property {string} name
   * @property {string} tier
   * @property {number} level
   * @property {number} power
   * @property {number} hp
   * @property {number} maxHp
   * @property {number} guard
   * @property {number} speed
   * @property {Currency} rewardGold
   * @property {number} rewardXp
   * @property {number} rewardShard
   *
   * @typedef {Object} RunState
   * @property {boolean} active
   * @property {number} floor
   * @property {number} chain
   * @property {number} danger
   * @property {string} zone
   * @property {Enemy|null} monster
   * @property {string[]} combatLog
   * @property {number} roomsCleared
   * @property {number} encounters
   * @property {string[]} choices
   * @property {number} goldBonusPct
   * @property {Object} pendingRewards
   *
   * @typedef {Object} Player
   * @property {string} name
   * @property {string} title
   * @property {number} level
   * @property {number} xp
   * @property {number} xpNext
   * @property {number} hp
   * @property {number} maxHp
   * @property {Currency} gold
   * @property {number} currencyVersion
   * @property {number} shards
   * @property {number} ember
   * @property {number} depth
   * @property {number} safeExtractDepth
   * @property {number} returnDepth
   * @property {number} kills
   * @property {number} crit
   * @property {number} dodge
   * @property {StatBlock} stats
   * @property {Object.<string, Item>} equipment
   * @property {Item[]} inventory
   * @property {string[]} discoveredMonsters
   * @property {string[]} discoveredGear
   * @property {string[]} log
   * @property {Object[]} runHistory
   *
   * @typedef {Object} GameState
   * @property {string} build
   * @property {string} screen
   * @property {Object} filters
   * @property {Player} player
   * @property {Object} town
   * @property {RunState} run
   * @property {Item[]} merchantStock
   * @property {Object[]} archive
   * @property {Object} ui
   */

  const STORAGE_KEY = 'dungeondex_emberfall_v109';
  const BUILD = 'DungeonDex v1.3.44';
  const VISIBLE_VERSION_LABEL = 'DungeonDex v1.3.44';
  const BOSS_INTERVAL = 5;
  const DEPTH_CHAPTERS_PER_ROOM = 10;
  const DEPTH_ROOMS_PER_FLOOR = 15;
  const DEPTH_CHAPTERS_PER_FLOOR = DEPTH_CHAPTERS_PER_ROOM * DEPTH_ROOMS_PER_FLOOR;
  const DEPTH_CHAPTERS_PER_THREAT_STEP = 3;
  // Depth is the raw chapter counter: 10 chapters make a room, 15 rooms make a Hollow Stair floor.
  // Threat steps advance every 3 depth chapters; bosses appear every 5 threat steps,
  // so the current boss cadence lands on raw Depth 15, 30, 45, and so on.
  const ACTION_GUARD_MS = 160;
  const COMBAT_ACTION_GUARD_MS = 12;
  const COMBAT_LOG_STORE_LIMIT = 28;
  const COMBAT_LOG_RENDER_LIMIT = 3;
  const COMBAT_AUTOSAVE_MS = 1500;
  const INTRO_MODAL_SESSION_KEY = 'dungeondex_intro_v130_seen';
  const VALID_SCREENS = ['town','run','gear','dex','archive'];
  const CORE_COMBAT_ACTIONS = ['attack','guard','skill','extract'];
  const DEFAULT_PLAYER_STATS = Object.freeze({ power: 8, guard: 6, wit: 5, luck: 4, speed: 5 });
  const SLOT_ORDER = ['weapon','offhand','helm','armor','gloves','boots','ring','amulet','cloak','charm'];
  const INVENTORY_SORTS = ['power','level','rarity','value','slot','newest'];
  const RARITIES = [
    { key:'common', mult:1, color:'rarity-common', chance:40 },
    { key:'uncommon', mult:1.18, color:'rarity-uncommon', chance:26 },
    { key:'rare', mult:1.42, color:'rarity-rare', chance:17 },
    { key:'epic', mult:1.75, color:'rarity-epic', chance:10 },
    { key:'legendary', mult:2.15, color:'rarity-legendary', chance:5 },
    { key:'mythic', mult:2.65, color:'rarity-mythic', chance:2 }
  ];

  const BASES = {
    weapon: ['Sword','Axe','Mace','Dagger','Spear','Bow','Crossbow','Staff','Wand','Scythe','Hammer','Glaive','Whip','Pistol','Bladefan','Moonblade'],
    offhand: ['Buckler','Ward','Lantern','Sigil','Tome','Focus','Mirror','Spineplate','Aegis','Coil'],
    helm: ['Hood','Mask','Crown','Helm','Circlet','Veil','Greathelm','Sallet','Horncap','Halo'],
    armor: ['Jack','Plate','Mail','Leathers','Coat','Brigandine','Carapace','Vestments','Hauberk','Shell'],
    gloves: ['Gloves','Mitts','Grips','Gauntlets','Talons','Bracers','Cuffs','Claws','Wraps','Hands'],
    boots: ['Boots','Greaves','Treads','Walkers','Steps','Sabatons','Tracks','Heels','Stompers','Paths'],
    ring: ['Band','Seal','Loop','Knot','Signet','Circle','Link','Shardring','Pulseband','Orbit','Gloamring'],
    amulet: ['Amulet','Charm','Torque','Pendant','Reliquary','Locket','Idol','Talisman','Heart','Shard'],
    cloak: ['Cloak','Mantle','Cape','Shroud','Drape','Hide','Wing','Coilwrap','Veilmantle','Shade'],
    charm: ['Charm','Glyph','Bone','Coin','Effigy','Prism','Totem','Relic','Rune','Echo','Hollow Bell','Ashen Dice']
  };
  const PREFIXES = ['Ash','Moon','Viper','Saint','Cinder','Glass','Storm','Grave','Ember','Thorn','Iron','Gold','Night','Hollow','Radiant','Sable','Frost','Blood','Star','Dread'];
  const SUFFIXES = ['of Lowflame','of Ruin','of Lanterns','of Ashes','of Sparks','of Teeth','of Silence','of Mercy','of Echoes','of the Hollow','of Black Rain','of Dawning','of Fevers','of Bells','of Graves','of Drift','of the Ninth Flame','of Fangs','of Kings','of the Last Gate'];
  const TRINKET_SUFFIXES = ['of the Hollow Bell','of Ember Debt','of Room-Tithes','of Last Light'];
  const MAKERS = ['Emberfall','Rookery','Sunken Court','Lowfire','Mireglass','Red Chapel','Salt Forge','Ivory Span','Silt Borough','Noctis Atelier'];
  const THEMES = ['breaker','guardian','duelist','skirmisher','seer','warden','reaver','sage','ranger','occult'];


  // Mythic sets must not add extra equipment slots.
  // Legacy logical set slots from v1.2.24-v1.2.27 are safely folded back into
  // the original loadout: chest->armor, hands->gloves, legs->boots, shoulders->cloak.
  const MYTHIC_SET_SLOTS = ['helm','armor','boots','gloves','cloak'];
  const LEGACY_MYTHIC_SET_SLOTS = ['chest','legs','hands','shoulders'];
  const FUTURE_EQUIPMENT_SLOTS = SLOT_ORDER.slice();
  const EQUIPMENT_DISPLAY_SLOTS = SLOT_ORDER.slice();
  const MYTHIC_SET_SLOT_ALIASES = {
    helm: 'helm',
    armor: 'armor',
    gloves: 'gloves',
    boots: 'boots',
    cloak: 'cloak',
    chest: 'armor',
    hands: 'gloves',
    legs: 'boots',
    shoulders: 'cloak'
  };
  const BASE_SLOT_ALIASES = {
    chest: 'armor',
    hands: 'gloves',
    legs: 'boots',
    shoulders: 'cloak'
  };
  const MYTHIC_SET_DEFINITIONS = {
    ashbound_warden: {
      id: 'ashbound_warden',
      name: 'Ashbound Warden',
      theme: 'survival / extraction / defense',
      role: 'safer deep pushing',
      slots: MYTHIC_SET_SLOTS,
      pieceNames: {
        helm: 'Ashbound Helm',
        armor: 'Ashbound Chestguard',
        boots: 'Ashbound Legplates',
        gloves: 'Ashbound Gauntlets',
        cloak: 'Ashbound Shoulders'
      },
      bonuses: {
        2: '+Max HP',
        3: 'Boss-floor defense bonus',
        5: 'Survive lethal damage once per descent'
      }
    },
    veyruhn_bellforge: {
      id: 'veyruhn_bellforge',
      name: 'Emberfall Bellforge',
      theme: 'forge / heavy hits / boss damage',
      role: 'damage scaling',
      slots: MYTHIC_SET_SLOTS,
      pieceNames: {
        helm: 'Bellforge Crown',
        armor: 'Bellforge Plate',
        boots: 'Bellforge Greaves',
        gloves: 'Bellforge Fists',
        cloak: 'Bellforge Pauldrons'
      },
      bonuses: {
        2: '+Attack',
        3: 'Bonus damage on boss floors',
        5: 'Every fifth attack hits harder'
      }
    },
    lowfire_debtbrand: {
      id: 'lowfire_debtbrand',
      name: 'Lowfire Debtbrand',
      theme: 'gold / debt / merchant power',
      role: 'economy and merchant synergy',
      slots: MYTHIC_SET_SLOTS,
      pieceNames: {
        helm: 'Debtbrand Hood',
        armor: 'Debtbrand Vest',
        boots: 'Debtbrand Trousers',
        gloves: 'Debtbrand Grips',
        cloak: 'Debtbrand Mantle'
      },
      bonuses: {
        2: 'Slightly better gold drops',
        3: 'Small merchant discount',
        5: 'Buying from a merchant grants a temporary combat bonus next floor'
      }
    }
  };

  const MONSTER_FAMILIES = ['Ghoul','Wyrm','Construct','Cultist','Husk','Beast','Harpy','Watcher','Knight','Mireborn','Shade','Revenant'];
  const MONSTER_TYPES = ['Maw','Stalker','Herald','Spitter','Warden','Lurker','Devourer','Drummer','Seer','Ravager','Hound','Colossus'];
  const MONSTER_AFFIXES = ['Ashwake','Frostbit','Sunken','Gilded','Ruinfed','Lantern-Eyed','Blacksalt','Gravesworn','Starved','Dreadmarked','Silkbound','Bloodlit'];
  const MONSTER_SKILLS = ['Bleed','Burn','Guard Break','Venom','Hex','Drain','Rage','Ward','Pierce','Chill'];

  const LORE_SNIPPETS = [
    'The Hollow Stair was not built downward. It grew there after the first eclipse.',
    'Every relic carries a stolen memory. Stronger relics remember more than their bearer.',
    'The Lowfire merchants do not ask where your gear came from. Only whether it still whispers.',
    'In Emberfall, even sunlight is traded by weight.',
    'The ninth bell beneath Emberfall rings only when a warden dies with unpaid debts.'
  ];

  const DISTRICT_DATA = [
    { id:'lowfire', min:1, max:10, name:'Lowfire District', line:'Where every debt starts warm.', tone:'lowfire', mood:'Warm embers, close markets, shallow debts.' },
    { id:'ashgate', min:11, max:20, name:'Ashgate Warrens', line:'The walls remember every retreat.', tone:'ashgate', mood:'Coal smoke, narrow paths, bargain lanterns.' },
    { id:'ember-debtworks', min:21, max:30, name:'Ember Debtworks', line:'Nothing burns here unless it owes.', tone:'debtworks', mood:'Chains, ledgers, red worklight.' },
    { id:'sootveil', min:31, max:40, name:'Sootveil Descent', line:'Light thins. Breath gets expensive.', tone:'sootveil', mood:'Thin air, black dust, guarded silence.' },
    { id:'cinderbone', min:41, max:50, name:'Cinderbone Halls', line:'Old champions become architecture.', tone:'cinderbone', mood:'Bone pillars and furnace glow.' },
    { id:'blacktithe', min:51, max:60, name:'Blacktithe Deep', line:'Every step is counted twice.', tone:'blacktithe', mood:'Gold shadow, sealed doors, heavy tolls.' },
    { id:'lanternless', min:61, max:70, name:'Lanternless Vault', line:'Hope is stored here, unpaid.', tone:'lanternless', mood:'Dim vaults and dead lampglass.' },
    { id:'hunger-kilns', min:71, max:80, name:'The Hunger Kilns', line:'The Stair learns what you need.', tone:'hunger', mood:'Open heat, empty racks, watching mouths.' },
    { id:'redwake', min:81, max:90, name:'Redwake Catacombs', line:'The dead do not rest. They accrue.', tone:'redwake', mood:'Red water and bone invoices.' },
    { id:'final-lowflame', min:91, max:100, name:'The Final Lowflame', line:'The first ember waits at the bottom.', tone:'final-lowflame', mood:'A small flame under impossible weight.' }
  ];

  const BOSS_FLOOR_NAMES = {
    5:'The First Collection',
    10:'Lowfire Execution Gate',
    15:'Ashgate Butcher Step',
    20:"The Warrens' Debtkeeper",
    25:'Ember Chain Tribunal',
    30:'Furnace Oathbreaker',
    35:'Sootveil Grave Toll',
    40:'The Descent Tax',
    45:'Cinderbone Maw',
    50:'Blacktithe Reckoning',
    55:'The Black Ledger Opens',
    60:'Deep Tithe Enforcer',
    65:'Lanternless Sentence',
    70:'Vault of Unpaid Names',
    75:'Hunger Kiln Offering',
    80:'The Maw Takes Inventory',
    85:'Redwake Ossuary Gate',
    90:'Catacomb Blood Audit',
    95:'Final Lowflame Witness',
    100:'The Debt Below All Fire'
  };

  const el = (id) => document.getElementById(id);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const SESSION_LORE_LINE = pick(LORE_SNIPPETS);
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const format = (n) => Math.round(n).toLocaleString();
  const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const asArray = (value, fallback = []) => Array.isArray(value) ? value : fallback;
  const numberOr = (value, fallback, min = -Infinity, max = Infinity) => {
    const n = Number(value);
    return clamp(Number.isFinite(n) ? n : fallback, min, max);
  };
  function normalizeScreenName(screen, fallback = 'town') {
    return VALID_SCREENS.includes(screen) ? screen : fallback;
  }
  function ensureRunShell(state) {
    if (!state) return {};
    if (!isPlainObject(state.run)) state.run = {};
    state.run.combatLog = asArray(state.run.combatLog, []);
    state.run.choices = asArray(state.run.choices, []);
    state.run.pendingRewards = createPendingRunRewards(state.run.pendingRewards);
    return state.run;
  }
  function hasActiveCombat(state) {
    return !!(state?.run?.active && state.run.monster && state?.player && numberOr(state.player.hp, 0, 0, Number.MAX_SAFE_INTEGER) > 0);
  }
  function recoverRunToTown(state, message = '') {
    if (!state) return false;
    ensureRunShell(state);
    state.run.active = false;
    state.run.monster = null;
    state.run.choices = [];
    state.run.chain = 0;
    state.run.goldBonusPct = 0;
    state.run.startedFromCharter = false;
    state.run.charterStartFloor = 0;
    clearPendingRunRewards(state);
    state.screen = 'town';
    if (message && state.player) pushLog(state, message);
    return true;
  }
  function continueRun(state) {
    if (hasActiveCombat(state)) {
      state.screen = 'run';
      return true;
    }
    if (state?.run?.active) {
      recoverRunToTown(state, 'Recovered from an incomplete active descent and returned to Lowfire.');
    } else if (state) {
      state.screen = 'town';
    }
    return false;
  }
  function makeId(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint32Array(2);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    return `${prefix}_${Date.now().toString(36)}_${(bytes[0] || Math.random() * 1e9).toString(36)}_${(bytes[1] || Math.random() * 1e9).toString(36)}`;
  }
  const COPPER_PER_SILVER = 100;
  const SILVER_PER_GOLD = 100;
  const COPPER_PER_GOLD = COPPER_PER_SILVER * SILVER_PER_GOLD;
  const toCopper = (goldUnits) => Math.max(0, Math.round((Number(goldUnits) || 0) * COPPER_PER_GOLD));
  const coins = (gold = 0, silver = 0, copper = 0) => Math.max(0, Math.round((Number(gold) || 0) * COPPER_PER_GOLD + (Number(silver) || 0) * COPPER_PER_SILVER + (Number(copper) || 0)));

  function sanitizeCurrencyValue(value, fallback = 0) {
    return Math.floor(numberOr(value, fallback, 0, Number.MAX_SAFE_INTEGER));
  }

  function addPlayerGold(state, amount) {
    if (!state?.player) return false;
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const current = sanitizeCurrencyValue(state.player.gold, 0);
    state.player.gold = Math.min(Number.MAX_SAFE_INTEGER, current + reward);
    return true;
  }

  function createPendingRunRewards(seed = {}) {
    const source = isPlainObject(seed) ? seed : {};
    const questProgress = {};
    const savedQuestProgress = isPlainObject(source.questProgress) ? source.questProgress : {};
    Object.entries(savedQuestProgress).forEach(([key, value]) => {
      const amount = Math.floor(numberOr(value, 0, 0, 999999));
      if (amount > 0) questProgress[String(key)] = amount;
    });
    return {
      gold: sanitizeCurrencyValue(source.gold, 0),
      shards: sanitizeCurrencyValue(source.shards, 0),
      ember: sanitizeCurrencyValue(source.ember, 0),
      xp: sanitizeCurrencyValue(source.xp, 0),
      kills: sanitizeCurrencyValue(source.kills, 0),
      eliteContractKills: sanitizeCurrencyValue(source.eliteContractKills, 0),
      loot: asArray(source.loot, []).map(item => normalizeItem(item)).filter(Boolean).slice(0, 80),
      discoveredGear: asArray(source.discoveredGear, []).map(String).filter(Boolean).slice(0, 160),
      questProgress
    };
  }

  function ensurePendingRunRewards(state) {
    if (!state.run) state.run = {};
    state.run.pendingRewards = createPendingRunRewards(state.run.pendingRewards);
    return state.run.pendingRewards;
  }

  function clearPendingRunRewards(state) {
    if (!state.run) state.run = {};
    state.run.pendingRewards = createPendingRunRewards();
  }

  function hasPendingRunRewards(pending) {
    const p = createPendingRunRewards(pending);
    return !!(p.gold || p.shards || p.ember || p.xp || p.kills || p.eliteContractKills || p.loot.length || Object.keys(p.questProgress).length);
  }

  function pendingRunRewardSummary(pending) {
    const p = createPendingRunRewards(pending);
    const parts = [];
    if (p.gold) parts.push(formatMoney(p.gold));
    if (p.shards) parts.push(`${format(p.shards)} shards`);
    if (p.ember) parts.push(`${format(p.ember)} ember`);
    if (p.xp) parts.push(`${format(p.xp)} XP`);
    if (p.loot.length) parts.push(`${format(p.loot.length)} loot`);
    return parts.length ? parts.join(', ') : 'no unsecured rewards';
  }

  function addPendingRunGold(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.gold = Math.min(Number.MAX_SAFE_INTEGER, pending.gold + reward);
    return true;
  }

  function addPendingRunShards(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.shards = Math.min(Number.MAX_SAFE_INTEGER, pending.shards + reward);
    return true;
  }

  function addPendingRunEmber(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.ember = Math.min(Number.MAX_SAFE_INTEGER, pending.ember + reward);
    return true;
  }

  function addPendingRunXp(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.xp = Math.min(Number.MAX_SAFE_INTEGER, pending.xp + reward);
    return true;
  }

  function addPendingRunKill(state, amount = 1) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.kills = Math.min(Number.MAX_SAFE_INTEGER, pending.kills + reward);
    return true;
  }

  function addPendingRunLoot(state, item) {
    const normalized = normalizeItem(item);
    if (!normalized) return false;
    const pending = ensurePendingRunRewards(state);
    pending.loot.unshift(normalized);
    pending.loot = pending.loot.slice(0, 80);
    addPendingGearDiscovery(state, normalized.name);
    return true;
  }

  function addPendingGearDiscovery(state, name) {
    const clean = String(name || '').trim();
    if (!clean) return false;
    const pending = ensurePendingRunRewards(state);
    if (!pending.discoveredGear.includes(clean)) pending.discoveredGear.unshift(clean);
    pending.discoveredGear = pending.discoveredGear.slice(0, 160);
    return true;
  }

  function addPendingQuestProgress(state, type, amount = 1) {
    const key = String(type || '').trim();
    const progress = sanitizeCurrencyValue(amount, 0);
    if (!key || progress <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.questProgress[key] = Math.min(999999, Math.floor(numberOr(pending.questProgress[key], 0, 0, 999999)) + progress);
    return true;
  }

  function addPendingEliteContractKill(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete) return false;
    const contract = eliteContractDef(active.id);
    if (!contract) return false;
    const pending = ensurePendingRunRewards(state);
    pending.eliteContractKills = Math.min(999999, pending.eliteContractKills + 1);
    const projected = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)) + pending.eliteContractKills);
    pushCombat(state, projected >= contract.goal
      ? 'Elite contract mark ready. Extract to bank the progress.'
      : `Elite contract mark: ${projected} / ${contract.goal}. Extract to bank progress.`);
    return true;
  }

  function bankGearDiscovery(state, name) {
    const clean = String(name || '').trim();
    if (!clean || !state?.player) return false;
    if (!state.player.discoveredGear.includes(clean)) state.player.discoveredGear.push(clean);
    return true;
  }

  function bankPendingRunRewards(state) {
    const pending = ensurePendingRunRewards(state);
    const summary = pendingRunRewardSummary(pending);
    if (pending.gold) addPlayerGold(state, pending.gold);
    if (pending.shards) state.player.shards = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.shards, 0) + pending.shards);
    if (pending.ember) state.player.ember = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.ember, 0) + pending.ember);
    if (pending.xp) xpGain(state, pending.xp);
    if (pending.kills) state.player.kills = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.kills, 0) + pending.kills);

    pending.loot.slice().reverse().forEach(item => {
      const normalized = normalizeItem(item);
      if (!normalized) return;
      if (asArray(normalized.tags, []).includes('early-aid-cache')) state.player.earlyAidGiven = true;
      state.player.inventory.unshift(normalized);
      bankGearDiscovery(state, normalized.name);
    });
    pending.discoveredGear.forEach(name => bankGearDiscovery(state, name));
    Object.entries(pending.questProgress).forEach(([type, amount]) => applyQuestProgressNow(state, type, amount));
    for (let i = 0; i < pending.eliteContractKills; i++) recordEliteContractKill(state, { bank:true });
    clearPendingRunRewards(state);
    return summary;
  }

  function discardPendingRunRewards(state) {
    const pending = ensurePendingRunRewards(state);
    const summary = pendingRunRewardSummary(pending);
    clearPendingRunRewards(state);
    return summary;
  }

  function formatMoney(copper) {
    copper = Math.max(0, Math.floor(Number(copper) || 0));
    const gold = Math.floor(copper / COPPER_PER_GOLD);
    copper %= COPPER_PER_GOLD;
    const silver = Math.floor(copper / COPPER_PER_SILVER);
    const coin = copper % COPPER_PER_SILVER;
    const parts = [];
    if (gold) parts.push(`<span class="money-part coin-gold">${gold}g</span>`);
    if (silver) parts.push(`<span class="money-part coin-silver">${silver}s</span>`);
    if (coin || !parts.length) parts.push(`<span class="money-part coin-copper">${coin}c</span>`);
    return `<span class="money money-wow">${parts.join(' ')}</span>`;
  }

  const GOLD_SINK_DEFAULTS = {
    junkSaleBonusCharges: 0,
    nextRunGoldBonusPct: 0,
    nextBossBounty: false,
    goldenCoffin: false,
    boughtStart40Charter: false
  };

  const ELITE_CONTRACT_RISK_DEFAULTS = {
    level: 'Standard',
    label: 'Standard risk',
    spawnBonus: 0,
    hpBonus: 0,
    damageBonus: 0,
    coinBonus: 0
  };

  const ELITE_CONTRACTS = [
    {
      id:'lowfire_bounty',
      name:'Lowfire Bounty',
      tier:'Tier I',
      goal:3,
      reward:coins(25,0,0),
      maxReward:coins(75,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:1,
      risk:{ level:'Low', label:'Low risk', spawnBonus:0.03, hpBonus:0.04, damageBonus:0.03, coinBonus:0.03 },
      summary:'Defeat 3 elite enemies for a cautious Lowfire payout.'
    },
    {
      id:'hazard_contract',
      name:'Hazard Contract',
      tier:'Tier II',
      goal:6,
      reward:coins(60,0,0),
      maxReward:coins(160,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:1,
      risk:{ level:'Medium', label:'Medium risk', spawnBonus:0.05, hpBonus:0.08, damageBonus:0.05, coinBonus:0.05 },
      summary:'Defeat 6 elite enemies under a modest hazard clause.'
    },
    {
      id:'blood_stamped_order',
      name:'Blood-Stamped Order',
      tier:'Tier III',
      goal:10,
      reward:coins(125,0,0),
      maxReward:coins(325,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:11,
      risk:{ level:'High', label:'High risk', spawnBonus:0.08, hpBonus:0.12, damageBonus:0.08, coinBonus:0.08 },
      summary:'Defeat 10 elite enemies on a deeper, blood-stamped writ.'
    }
  ];

  const ELITE_CONTRACT_ID_ALIASES = {
    elite_hunter_i: 'lowfire_bounty',
    elite_hunter_ii: 'hazard_contract',
    dangerous_work: 'blood_stamped_order'
  };

  const DISTRICT_MARKET_WARES = [
    { id:'junkers_token', districtId:'lowfire', unlockFloor:1, name:"Junker's Token", rarity:'common', cost:coins(0,18,0), effect:'Next junk/common sell action pays +15%.', summary:'A cheap Lowfire marker for squeezing a little more coin out of junk piles.' },
    { id:'small_debt_charm', districtId:'lowfire', unlockFloor:1, name:'Small Debt Charm', rarity:'uncommon', cost:coins(0,25,0), effect:'+10% gold during your next descent.', summary:'A minor charm that makes the next descent pay slightly better.' },
    { id:'black_market_key', districtId:'ashgate', unlockFloor:11, name:'Black Market Key', rarity:'rare', cost:coins(0,55,0), effect:'Adds one shady rare shelf item to the merchant.', summary:'Opens a side drawer in Ashgate stock. The item still has to be bought.' },
    { id:'cursed_reroll_token', districtId:'ember-debtworks', unlockFloor:21, name:'Cursed Reroll Token', rarity:'epic', cost:coins(0,85,0), effect:'Rerolls one weak unequipped item.', summary:'The Debtworks will remake a bad relic. It chooses the weakest safe target.' },
    { id:'legendary_bounty_writ', districtId:'sootveil', unlockFloor:31, name:'Legendary Bounty Writ', rarity:'legendary', cost:coins(1,25,0), effect:'Next boss drops one extra better relic.', summary:'Raises the reward on the next boss without changing normal shop gear.' },
    { id:'golden_coffin', districtId:'blacktithe', unlockFloor:51, name:'Golden Coffin', rarity:'mythic', cost:coins(2,75,0), effect:'Arms a Blacktithe defeat-insurance marker.', summary:'A luxury box kept ready for the next failed descent.' }
  ];

  function createGoldSinkState(seed = {}) {
    return {
      junkSaleBonusCharges: Math.floor(numberOr(seed.junkSaleBonusCharges, GOLD_SINK_DEFAULTS.junkSaleBonusCharges, 0, 3)),
      nextRunGoldBonusPct: Math.floor(numberOr(seed.nextRunGoldBonusPct, GOLD_SINK_DEFAULTS.nextRunGoldBonusPct, 0, 50)),
      nextBossBounty: !!seed.nextBossBounty,
      goldenCoffin: !!seed.goldenCoffin,
      boughtStart40Charter: !!seed.boughtStart40Charter
    };
  }

  function ensureGoldSinkState(state) {
    if (!state.player) state.player = {};
    state.player.goldSink = createGoldSinkState(isPlainObject(state.player.goldSink) ? state.player.goldSink : {});
    return state.player.goldSink;
  }

  function eliteContractDef(id) {
    return ELITE_CONTRACTS.find(contract => contract.id === id) || null;
  }

  function normalizeEliteContractId(id) {
    const raw = String(id || '');
    const normalized = ELITE_CONTRACT_ID_ALIASES[raw] || raw;
    return eliteContractDef(normalized) ? normalized : '';
  }

  function eliteContractRisk(contract) {
    return { ...ELITE_CONTRACT_RISK_DEFAULTS, ...(isPlainObject(contract?.risk) ? contract.risk : {}) };
  }

  function eliteContractRiskLevel(contract) {
    const risk = eliteContractRisk(contract);
    return String(risk.level || risk.label || 'Standard').replace(/\s*risk$/i, '') || 'Standard';
  }

  function eliteContractObjective(contract) {
    const goal = Math.max(1, Math.floor(numberOr(contract?.goal, 1, 1, 999)));
    return `Defeat ${goal} elite enemies`;
  }

  function contractBaseReward(contract) {
    if (!contract) return 0;
    const base = contract.baseReward ?? contract.reward;
    return Math.max(0, Math.floor(numberOr(base, 0, 0, Number.MAX_SAFE_INTEGER)));
  }

  function contractRewardCap(contract) {
    const base = contractBaseReward(contract);
    return Math.max(base, Math.floor(numberOr(contract?.maxReward, base, base, Number.MAX_SAFE_INTEGER)));
  }

  function isValidRewardNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function sanitizeContractReward(contract, value) {
    const base = contractBaseReward(contract);
    const cap = contractRewardCap(contract);
    if (!isValidRewardNumber(value)) return base;
    return clamp(Math.floor(value), 0, cap);
  }

  function contractRewardDepth(state) {
    return Math.max(1,
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
  }

  function calculateContractReward(contract, state = null) {
    if (!contract) return 0;
    const base = contractBaseReward(contract);
    const floorBonus = Math.floor(numberOr(contract.floorBonusPerDepth, 0, 0, Number.MAX_SAFE_INTEGER)) * contractRewardDepth(state);
    return sanitizeContractReward(contract, base + floorBonus);
  }

  function activeContractRewardAmount(active, contract, state = null) {
    if (!active || !contract) return 0;
    if (!Object.prototype.hasOwnProperty.call(active, 'rewardAmount') || active.rewardAmount == null) {
      active.rewardAmount = calculateContractReward(contract, state);
    } else {
      active.rewardAmount = sanitizeContractReward(contract, active.rewardAmount);
    }
    return active.rewardAmount;
  }

  function activeEliteContractDef(state) {
    const active = state?.player?.eliteContracts?.active;
    if (!active) return null;
    return eliteContractDef(active.id);
  }

  function activeEliteContractRisk(state) {
    const contract = activeEliteContractDef(state);
    return contract ? eliteContractRisk(contract) : { ...ELITE_CONTRACT_RISK_DEFAULTS };
  }

  function activeEliteContractRiskText(contract) {
    const risk = eliteContractRisk(contract);
    const parts = [
      `+${Math.round(risk.spawnBonus * 100)}% elite spawn`,
      `+${Math.round(risk.hpBonus * 100)}% elite HP`,
      `+${Math.round(risk.damageBonus * 100)}% elite damage`,
      `+${Math.round(risk.coinBonus * 100)}% elite coins`
    ];
    return `${risk.label}: ${parts.join(', ')} while active.`;
  }

  function normalizeEliteContractIds(value) {
    const ids = new Set();
    asArray(value, []).forEach(id => {
      const normalized = normalizeEliteContractId(id);
      if (normalized) ids.add(normalized);
    });
    return Array.from(ids);
  }

  function createEliteContractState(seed = {}, state = null) {
    const source = isPlainObject(seed) ? seed : {};
    const claimed = normalizeEliteContractIds(source.claimed);
    const completedSet = new Set([...normalizeEliteContractIds(source.completed), ...claimed]);
    const savedActive = isPlainObject(source.active) ? source.active : null;
    let active = null;

    if (savedActive) {
      const def = eliteContractDef(normalizeEliteContractId(savedActive.id));
      if (def && !claimed.includes(def.id)) {
        const progress = Math.floor(numberOr(savedActive.progress, 0, 0, def.goal));
        const complete = !!savedActive.complete || progress >= def.goal || completedSet.has(def.id);
        const alreadyClaimed = !!savedActive.claimed;
        const rewardAmount = Object.prototype.hasOwnProperty.call(savedActive, 'rewardAmount') && savedActive.rewardAmount != null
          ? sanitizeContractReward(def, savedActive.rewardAmount)
          : calculateContractReward(def, state);
        if (alreadyClaimed) {
          completedSet.add(def.id);
          if (!claimed.includes(def.id)) claimed.push(def.id);
        } else {
          active = {
            id: def.id,
            name: def.name,
            tier: def.tier || '',
            progress: complete ? def.goal : progress,
            goal: def.goal,
            rewardAmount,
            complete,
            claimable: complete,
            claimed: false
          };
          if (complete) completedSet.add(def.id);
        }
      }
    }

    return {
      active,
      completed: Array.from(completedSet),
      claimed
    };
  }

  function ensureEliteContractState(state) {
    if (!state.player) state.player = {};
    state.player.eliteContracts = createEliteContractState(state.player.eliteContracts, state);
    return state.player.eliteContracts;
  }

  function isEliteContractAvailable(contract, contracts, state = null) {
    if (!contract || contracts.claimed.includes(contract.id)) return false;
    if (contract.unlockFloor && state && reachedDistrictFloor(state) < contract.unlockFloor) return false;
    return !contract.requiresClaimed || contracts.claimed.includes(contract.requiresClaimed);
  }

  function availableEliteContracts(state) {
    const contracts = ensureEliteContractState(state);
    if (contracts.active) return [];
    return ELITE_CONTRACTS.filter(contract => isEliteContractAvailable(contract, contracts, state));
  }

  function startEliteContract(state, id) {
    const contracts = ensureEliteContractState(state);
    const contract = eliteContractDef(id);
    if (contracts.active || !isEliteContractAvailable(contract, contracts, state)) return false;
    contracts.active = {
      id: contract.id,
      name: contract.name,
      tier: contract.tier || '',
      progress: 0,
      goal: contract.goal,
      rewardAmount: calculateContractReward(contract, state),
      complete: false,
      claimable: false,
      claimed: false
    };
    pushLog(state, `Elite contract accepted: ${contract.name}. Risk active until claimed.`);
    return true;
  }

  function recordEliteContractKill(state, options = {}) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete) return false;

    const contract = eliteContractDef(active.id);
    if (!contract) {
      contracts.active = null;
      return false;
    }

    if (state?.run?.active && !options.bank) return addPendingEliteContractKill(state);

    active.goal = contract.goal;
    active.name = contract.name;
    active.tier = contract.tier || '';
    active.rewardAmount = activeContractRewardAmount(active, contract, state);
    active.progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)) + 1);
    if (active.progress >= contract.goal) {
      active.complete = true;
      active.claimable = true;
      if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
      pushCombat(state, `Elite contract complete. Return to Lowfire to claim ${formatMoney(active.rewardAmount)}.`);
    } else {
      pushCombat(state, `Elite contract: ${active.progress} / ${contract.goal} elites defeated.`);
    }
    return true;
  }

  function claimEliteContract(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.claimed || (!active.complete && !active.claimable)) return false;

    const contract = eliteContractDef(active.id);
    if (!contract) {
      contracts.active = null;
      return false;
    }

    const rewardAmount = activeContractRewardAmount(active, contract, state);
    if (!isValidRewardNumber(rewardAmount) || rewardAmount <= 0) return false;
    active.claimed = true;
    if (!addPlayerGold(state, rewardAmount)) return false;
    if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
    if (!contracts.claimed.includes(contract.id)) contracts.claimed.push(contract.id);
    contracts.active = null;
    pushLog(state, `Payment claimed: ${contract.name} paid ${stripHtml(formatMoney(rewardAmount))}.`);
    return true;
  }

  function reachedDistrictFloor(state) {
    return Math.max(1,
      Math.floor(numberOr(state?.player?.depth, 0, 0, 999)),
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999))
    );
  }

  function districtForWare(ware) {
    return DISTRICT_DATA.find(d => d.id === ware.districtId) || districtByDepth(ware.unlockFloor);
  }

  function unlockedDistrictWares(state) {
    const reached = reachedDistrictFloor(state);
    return DISTRICT_MARKET_WARES.filter(ware => reached >= ware.unlockFloor);
  }

  function goldSinkStatus(state, ware) {
    const sink = ensureGoldSinkState(state);
    if (ware.id === 'junkers_token' && sink.junkSaleBonusCharges > 0) return `${sink.junkSaleBonusCharges}/3 ready`;
    if (ware.id === 'small_debt_charm' && sink.nextRunGoldBonusPct > 0) return 'next descent ready';
    if (ware.id === 'legendary_bounty_writ' && sink.nextBossBounty) return 'bounty active';
    if (ware.id === 'golden_coffin' && sink.goldenCoffin) return 'armed';
    return '';
  }

  function goldSinkCannotBuyReason(state, ware) {
    const sink = ensureGoldSinkState(state);
    if (state.player.gold < merchantCostWithSetBonus(state, ware.cost)) return 'not enough gold';
    if (ware.id === 'junkers_token' && sink.junkSaleBonusCharges >= 3) return 'token limit reached';
    if (ware.id === 'small_debt_charm' && sink.nextRunGoldBonusPct > 0) return 'already prepared';
    if (ware.id === 'legendary_bounty_writ' && sink.nextBossBounty) return 'bounty already active';
    if (ware.id === 'golden_coffin' && sink.goldenCoffin) return 'already armed';
    if (ware.id === 'cursed_reroll_token' && !findCursedRerollTarget(state)) return 'needs unequipped gear';
    return '';
  }

  function activeGoldSinkPills(state) {
    const sink = ensureGoldSinkState(state);
    const pills = [];
    if (sink.junkSaleBonusCharges > 0) pills.push(`Junk bonus x${sink.junkSaleBonusCharges}`);
    if (sink.nextRunGoldBonusPct > 0) pills.push(`Next descent +${sink.nextRunGoldBonusPct}% gold`);
    if (state.run?.active && state.run.goldBonusPct > 0) pills.push(`Descent gold +${state.run.goldBonusPct}%`);
    if (sink.nextBossBounty) pills.push('Boss bounty armed');
    if (sink.goldenCoffin) pills.push('Golden Coffin armed');
    return pills;
  }

  function sellValue(item) {
    const base = Math.max(1, Math.floor(Number(item && item.value) || 0));
    return Math.max(1, Math.floor(base * 0.22));
  }

  function itemIsEquipped(state, item) {
    if (!item || !state.player || !state.player.equipment) return false;
    return Object.values(state.player.equipment).some(equipped => equipped && (equipped === item || equipped.id === item.id));
  }

  function canQuickSellItem(state, item) {
    if (!item || item.kind === 'special') return false;
    if (item.locked || item.favorite || item.protected) return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    const markedJunk = tags.includes('junk') || item.junk === true || item.isJunk === true || item.markedJunk === true;
    if (!markedJunk) return false;
    if (tags.includes('protected') || tags.includes('special')) return false;
    if (itemIsEquipped(state, item)) return false;
    return sellValue(item) > 0;
  }

  function canSellAllGearItem(state, item) {
    if (!item || item.kind === 'special') return false;
    if (!item.slot) return false;
    if (item.locked || item.favorite || item.protected) return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    if (tags.includes('protected') || tags.includes('special')) return false;
    if (itemIsEquipped(state, item)) return false;
    return sellValue(item) > 0;
  }

  function isJunkSaleBonusItem(item) {
    if (!item || item.kind === 'special') return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    return item.rarity === 'common' || tags.includes('junk') || item.junk === true || item.isJunk === true || item.markedJunk === true;
  }

  function sellValueWithGoldSink(state, item, bonusAvailable = true) {
    const base = sellValue(item);
    const sink = ensureGoldSinkState(state);
    if (bonusAvailable && sink.junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item)) {
      return Math.max(1, Math.round(base * 1.15));
    }
    return base;
  }

  function consumeJunkSaleBonus(state, used) {
    if (!used) return;
    const sink = ensureGoldSinkState(state);
    sink.junkSaleBonusCharges = Math.max(0, Math.floor(numberOr(sink.junkSaleBonusCharges, 0, 0, 3)) - 1);
  }

  // v1.3.26 Checkpoint & Charter QA:
  // Raw depth checkpoints can now exceed 999 because late charters unlock every
  // 5,000 depths after D800. Keep district display bounded separately, but never
  // clamp safe/extract/return progress to the district table ceiling.
  function progressDepthValue(value, fallback = 1) {
    return Math.max(1, Math.floor(numberOr(value, fallback, 1, 999999)));
  }

  function districtByDepth(depth) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth, 1, 1, 999)));
    return DISTRICT_DATA.find(district => safeDepth >= district.min && safeDepth <= district.max) || DISTRICT_DATA[DISTRICT_DATA.length - 1] || DISTRICT_DATA[0];
  }

  function defaultRunStartDepth(state) {
    const fallback = progressDepthValue(state?.player?.safeExtractDepth, 1);
    return progressDepthValue(state?.player?.returnDepth, fallback);
  }

  function canUseSafeReturnStart(state, depth) {
    const safeDepth = progressDepthValue(state?.player?.safeExtractDepth, 1);
    const returnDepth = progressDepthValue(state?.player?.returnDepth, safeDepth);
    const requested = progressDepthValue(depth, 1);
    return requested > 1 && requested <= Math.max(safeDepth, returnDepth);
  }

  // v1.3.26 Checkpoint & Charter QA: one safe source for death restart math.
  function hardcoreDeathCheckpointDepth(state, depth = null) {
    const endedDepth = progressDepthValue(depth ?? state?.run?.floor ?? state?.player?.returnDepth ?? 1, 1);
    const unlockedDepth = getUnlockedCharterDepth(state);
    const deathCheckpoint = Math.min(normalizeCharterMilestoneDepth(endedDepth), unlockedDepth);
    return deathCheckpoint >= 40 ? deathCheckpoint : 1;
  }

  function hardcoreDepthReturnLabel(depth) {
    const safeDepth = progressDepthValue(depth, 1);
    const district = districtByDepth(safeDepth);
    if (safeDepth <= 1) return `${district.name} / ${floorNumberLabel(1)}`;
    return `${district.name} / ${charterDepthCompactLabel(safeDepth)}`;
  }

  function hardcoreDeathCheckpointLabel(state, depth = null) {
    return hardcoreDepthReturnLabel(hardcoreDeathCheckpointDepth(state, depth));
  }

  function currentStagingDistrict(state) {
    const activeFloor = progressDepthValue(state?.run?.floor, 1);
    if (state?.run?.active) return districtByDepth(activeFloor);
    return districtByDepth(defaultRunStartDepth(state));
  }

  function districtToneClass(district) {
    const tone = String(district?.tone || district?.id || 'lowfire').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    return `district-tone-${tone}`;
  }

  function bossAtmosphereLine(depth) {
    const name = bossFloorNameByDepth(depth);
    if (!name) return 'The Stair tightens. Something below is listening.';
    return `Boss sign: ${name} waits below. Bosses return every 5 floors.`;
  }

  function districtArrivalLine(district) {
    if (!district) return 'A new stretch of stair opens beneath your boots.';
    const arrivals = {
      lowfire: 'The Lowfire lamps gutter behind you.',
      ashgate: 'Ashgate narrows around the stair; every wall feels scraped by retreat.',
      'ember-debtworks': 'The Debtworks glow red below; chains tick like ledgers closing.',
      sootveil: 'Sootveil swallows the light and leaves only your breathing.',
      cinderbone: 'Cinderbone Halls open in furnace heat and old champion dust.',
      blacktithe: 'Blacktithe weighs each step like coin dropped into a grave.',
      lanternless: 'The Lanternless Vault answers with cold glass and no flame.',
      'hunger-kilns': 'The Hunger Kilns breathe open, hot and empty.',
      redwake: 'Redwake water moves under the stones before you see it.',
      'final-lowflame': 'The Final Lowflame burns small, stubborn, and impossibly deep.'
    };
    return arrivals[district.id] || district.line || 'A new district answers the descent.';
  }

  function isDistrictEntryDepth(depth, district) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth, 1, 1, 999999)));
    return !!district && safeDepth === district.min;
  }

  function districtArrivalMarkup(depth, district) {
    if (!isDistrictEntryDepth(depth, district)) return '';
    return `<div class="district-arrival-card"><span>Entering</span><strong>${escapeHtml(district.name)}</strong><p>${escapeHtml(districtArrivalLine(district))}</p></div>`;
  }

  function extractionSummaryLine(state, reason) {
    const district = currentStagingDistrict(state);
    const depth = state?.run?.floor || state?.player?.depth || 1;
    const bestStr = depthWithRawLabel(state.player.depth || depth);
    if (reason === 'extract') return `Extraction Haul secured in ${district.name} at ${runDepthLabel(state)}. Lowfire banks the haul; the next descent can start there. Best: ${bestStr}.`;
    if (reason === 'defeat') return `The run ends in ${district.name} at ${runDepthLabel(state)}. Unsecured rewards were lost; banked gear and wallet stayed safe. Restart: ${hardcoreDeathCheckpointLabel(state, depth)}. Best: ${bestStr}.`;
    return `Descent ended in ${district.name} at ${runDepthLabel(state)}.`;
  }


  // v1.3.22 archive clarity: snapshot pending rewards before they are banked/lost so History can show useful after-action details.
  function runHistoryRewardSnapshot(pending) {
    const p = createPendingRunRewards(pending);
    const questProgressTotal = Object.values(p.questProgress).reduce((sum, value) => sum + Math.max(0, Math.floor(numberOr(value, 0, 0, 999999))), 0);
    return {
      rewards: runRewardSummaryText(p),
      gold: p.gold,
      shards: p.shards,
      ember: p.ember,
      xp: p.xp,
      kills: p.kills,
      eliteMarks: p.eliteContractKills,
      lootCount: p.loot.length,
      questProgress: questProgressTotal,
      lootPreview: p.loot.slice(0, 3).map(item => item?.name || '').filter(Boolean)
    };
  }

  function runHistoryOutcomeLabel(reason) {
    if (reason === 'extract') return 'Extraction Secured';
    if (reason === 'defeat') return 'Run Lost';
    return 'Ended';
  }

  function runHistoryOutcomeClass(reason) {
    if (reason === 'extract') return 'feed-escape';
    if (reason === 'defeat') return 'feed-death';
    return 'feed-depth';
  }

  function extractionPopupSummary(snapshot, securedText) {
    // v1.3.22c: keep popup summary plain text; formatMoney() returns styled HTML for the UI.
    // showExtractionPopup() escapes summary text, so strip HTML before composing the line.
    const parts = [];
    if (snapshot.gold) parts.push(moneyText(snapshot.gold));
    if (snapshot.shards) parts.push(`${format(snapshot.shards)} shards`);
    if (snapshot.ember) parts.push(`${format(snapshot.ember)} ember`);
    if (snapshot.xp) parts.push(`${format(snapshot.xp)} XP`);
    if (snapshot.lootCount) parts.push(`${format(snapshot.lootCount)} loot`);
    return parts.length ? `Extraction Haul secured: ${parts.join(' • ')}` : (securedText || 'Extraction Haul secured. Lowfire marks the run complete.');
  }

  function milestoneAtmosphereMarkup(depth, district) {
    const nextBoss = nextBossFloorFromDepth(depth);
    const nextDistrict = districtByDepth(Math.min(100, Math.max(depth + 1, district.max + 1)));
    const meta = depthProgressMeta(depth);
    const bossChaptersAway = Math.max(0, nextBoss.floor - depthStageValue(depth));
    const nextDistrictText = nextDistrict && nextDistrict.id !== district.id
      ? `→ ${nextDistrict.name}`
      : `D${format(district.min)}–${format(district.max)}`;
    const roomPct = Math.round(meta.roomPct);
    const chapterPct = Math.round(meta.chapterPct);
    return `<div class="milestone-strip">
      <div class="milestone-strip-labels">
        <span>Room ${format(meta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)}</span>
        <strong>${chapterPct}% through room</strong>
        <span>Next floor: ${format(meta.roomsUntilFloor)} rooms</span>
      </div>
      <div class="milestone-bar"><div style="width:${roomPct}%"></div></div>
    </div>
    <div class="atmosphere-strip">
      <span class="pill district-pill">${escapeHtml(district.name)}</span>
      <span class="pill boss-pill">${escapeHtml(bossFloorLabel(nextBoss.floor))} in ${format(bossChaptersAway)} chapters</span>
      <span class="pill">${escapeHtml(nextDistrictText)}</span>
    </div>`;
  }

  function bossFloorNameByDepth(depth) {
    const threatDepth = bossThreatDepthFromDepth(depth);
    return BOSS_FLOOR_NAMES[threatDepth] || (threatDepth > 0 && threatDepth % BOSS_INTERVAL === 0 ? `Boss Floor ${threatDepth}` : '');
  }

  function depthStageValue(depth, fallback = 1) {
    return Math.max(1, Math.floor(numberOr(depth, fallback, 1, 999999)));
  }

  function threatDepthFromDepth(depth) {
    return Math.max(1, Math.ceil(depthStageValue(depth) / DEPTH_CHAPTERS_PER_THREAT_STEP));
  }

  function bossThreatDepthFromDepth(depth) {
    return threatDepthFromDepth(depth);
  }

  function floorNumberLabel(depth) {
    return `Floor ${format(threatDepthFromDepth(depth))}`;
  }

  function bossFloorLabel(depth) {
    return `Boss Floor ${format(bossThreatDepthFromDepth(depth))}`;
  }

  function nextBossDepthFromDepth(depth) {
    const rawDepth = depthStageValue(depth);
    const interval = BOSS_INTERVAL * DEPTH_CHAPTERS_PER_THREAT_STEP;
    return Math.max(interval, Math.ceil((rawDepth + 1) / interval) * interval);
  }

  function depthStructureFromRawDepth(depth) {
    const rawDepth = depthStageValue(depth);
    const zeroBased = rawDepth - 1;
    const floor = Math.floor(zeroBased / DEPTH_CHAPTERS_PER_FLOOR) + 1;
    const floorOffset = zeroBased % DEPTH_CHAPTERS_PER_FLOOR;
    const room = Math.floor(floorOffset / DEPTH_CHAPTERS_PER_ROOM) + 1;
    const chapter = (floorOffset % DEPTH_CHAPTERS_PER_ROOM) + 1;
    const nextRoomAtDepth = rawDepth + (DEPTH_CHAPTERS_PER_ROOM - chapter + 1);
    const nextFloorAtDepth = rawDepth + (DEPTH_CHAPTERS_PER_FLOOR - floorOffset);
    return { rawDepth, floor, room, chapter, nextRoomAtDepth, nextFloorAtDepth };
  }

  function depthShortLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `F${format(threatDepthFromDepth(depth))} • R${format(d.room)} • C${format(d.chapter)}`;
  }

  function depthLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `${floorNumberLabel(depth)} • Room ${format(d.room)} • Chapter ${format(d.chapter)}`;
  }

  function depthWithRawLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `${floorNumberLabel(depth)} • R${format(d.room)} C${format(d.chapter)} • D${format(d.rawDepth)}`;
  }

  function runDepthLabel(state) {
    return depthWithRawLabel(state?.run?.floor || 1);
  }

  function depthProgressMeta(depth) {
    const d = depthStructureFromRawDepth(depth);
    const chapterPct = clamp((d.chapter / DEPTH_CHAPTERS_PER_ROOM) * 100, 0, 100);
    const roomPct = clamp((d.room / DEPTH_ROOMS_PER_FLOOR) * 100, 0, 100);
    const chaptersUntilRoom = Math.max(0, DEPTH_CHAPTERS_PER_ROOM - d.chapter);
    const roomsUntilFloor = Math.max(0, DEPTH_ROOMS_PER_FLOOR - d.room);
    return { ...d, chapterPct, roomPct, chaptersUntilRoom, roomsUntilFloor };
  }

  function depthMilestoneNotice(depth) {
    const d = depthStructureFromRawDepth(depth);
    if (d.rawDepth <= 1 || d.chapter !== 1) return '';
    if (d.room === 1) return `Hollow Stair floor ${d.floor} reached. Prepare before pushing farther.`;
    return `Room ${d.room} cleared on ${floorNumberLabel(depth)}.`;
  }

  function isRoomMilestoneDepth(depth) {
    const d = depthStructureFromRawDepth(depth);
    return d.rawDepth > 1 && d.chapter === 1;
  }

  function isFloorMilestoneDepth(depth) {
    const d = depthStructureFromRawDepth(depth);
    return d.rawDepth > 1 && d.chapter === 1 && d.room === 1;
  }

  function applyRoomMilestoneReward(state, previousDepth, currentDepth) {
    if (!state?.run?.active || !isRoomMilestoneDepth(currentDepth)) return;
    const meta = depthStructureFromRawDepth(currentDepth);
    const rewardGold = Math.max(coins(0, 0, 14), Math.round(coins(0, 0, 14) + threatDepthFromDepth(currentDepth) * rand(3, 6)));
    const missingHp = Math.max(0, state.player.maxHp - state.player.hp);
    const recovered = Math.min(missingHp, Math.max(1, Math.round(state.player.maxHp * 0.05)));
    addPendingRunGold(state, rewardGold);
    if (recovered > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);
    pushCombat(state, `Room cleared: floor ${meta.floor}, room ${meta.room}. Room Reward unsecured +${formatMoney(rewardGold)}${recovered > 0 ? `, recovered ${recovered} HP` : ''}.`);
    pushLog(state, `Room milestone reached: ${depthLabel(currentDepth)}.`);
  }

  function applyFloorMilestoneReward(state, previousDepth, currentDepth) {
    if (!state?.run?.active || !isFloorMilestoneDepth(currentDepth)) return;
    const meta = depthStructureFromRawDepth(currentDepth);
    const threatDepth = threatDepthFromDepth(currentDepth);
    const rewardGold = Math.max(coins(0, 1, 80), Math.round(coins(0, 1, 80) + threatDepth * rand(9, 18)));
    const shardReward = Math.max(3, Math.round(3 + threatDepth * 0.58));
    const emberReward = meta.floor % 2 === 0 ? 1 : 0;
    const missingHp = Math.max(0, state.player.maxHp - state.player.hp);
    const recovered = Math.min(missingHp, Math.max(2, Math.round(state.player.maxHp * 0.13)));

    addPendingRunGold(state, rewardGold);
    addPendingRunShards(state, shardReward);
    if (emberReward > 0) addPendingRunEmber(state, emberReward);
    if (recovered > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);

    const parts = [`+${formatMoney(rewardGold)}`, `+${format(shardReward)} shards`];
    if (emberReward > 0) parts.push(`+${format(emberReward)} ember`);
    if (recovered > 0) parts.push(`recovered ${recovered} HP`);
    pushCombat(state, `Floor cleared: Hollow Stair floor ${meta.floor}. Milestone Reward unsecured ${parts.join(', ')}.`);
    pushLog(state, `Hollow Stair floor ${meta.floor} opened after ${format(DEPTH_CHAPTERS_PER_FLOOR)} chapters of descent.`);
  }

  function depthDifficultyLadder(depth) {
    const d = depthStructureFromRawDepth(depth);
    const chapterPressure = (d.chapter - 1) * 0.0025;
    const roomPressure = (d.room - 1) * 0.005;
    const floorPressure = Math.min(0.15, (d.floor - 1) * 0.038);
    const totalPressure = clamp(chapterPressure + roomPressure + floorPressure, 0, 0.24);
    return {
      ...d,
      chapterPressure,
      roomPressure,
      floorPressure,
      totalPressure,
      powerMult: 1 + totalPressure,
      hpMult: 1 + Math.min(0.14, roomPressure * 0.68 + floorPressure * 0.58),
      guardMult: 1 + Math.min(0.12, roomPressure * 0.48 + floorPressure * 0.48),
      speedMult: 1 + Math.min(0.065, chapterPressure * 0.55 + roomPressure * 0.22),
      rewardMult: 1 + Math.min(0.10, totalPressure * 0.38),
      eliteBonus: Math.min(0.055, roomPressure * 0.28 + floorPressure * 0.14)
    };
  }

  function dangerRatingForDepth(depth) {
    const ladder = depthDifficultyLadder(depth);
    const base = Math.max(1, Math.floor(threatDepthFromDepth(depth) / 3));
    const roomPressure = Math.floor((ladder.room - 1) / 6);
    const floorPressure = Math.max(0, (ladder.floor - 1) * 2);
    return Math.max(1, base + roomPressure + floorPressure);
  }

  function isHighRarityKey(key) {
    return rarityIndex(key) >= rarityIndex('rare');
  }

  function depthLootScarcityMeta(depth, source = 'normal', state = null) {
    const rawDepth = depthStageValue(depth);
    const deepBand = rawDepth >= 40 ? Math.floor((rawDepth - 40) / 40) + 1 : 0;
    const charterStart = Math.floor(numberOr(state?.run?.charterStartFloor, 0, 0, 999999));
    const charterWarmup = !!(state?.run?.active && state.run.startedFromCharter && charterStart >= 40 && rawDepth >= charterStart && rawDepth < charterStart + 5);
    const sourceRelief = source === 'boss' ? 0.08 : source === 'elite' ? 0.04 : 0;
    const highRarityMult = deepBand
      ? clamp(0.88 - deepBand * 0.07 + sourceRelief, 0.46, 1)
      : 1;
    const mythicMult = deepBand
      ? clamp(0.8 - deepBand * 0.06 + sourceRelief, 0.38, 1)
      : 1;
    const dropChanceMult = deepBand
      ? clamp(0.97 - deepBand * 0.025 + (source === 'boss' ? 0.02 : 0), 0.78, 1)
      : 1;
    return {
      rawDepth,
      deepBand,
      charterWarmup,
      highRarityMult: charterWarmup ? highRarityMult * 0.78 : highRarityMult,
      mythicMult: charterWarmup ? mythicMult * 0.72 : mythicMult,
      dropChanceMult: charterWarmup ? dropChanceMult * 0.9 : dropChanceMult
    };
  }

  function applyDepthLootScarcity(table, depth, source = 'normal', state = null) {
    if (!['normal','elite','boss'].includes(source)) return table;
    const meta = depthLootScarcityMeta(depth, source, state);
    if (!meta.deepBand && !meta.charterWarmup) return table;
    return table.map(([key, chance]) => {
      let adjusted = chance;
      if (isHighRarityKey(key)) adjusted *= meta.highRarityMult;
      if (key === 'legendary') adjusted *= 0.92;
      if (key === 'mythic') adjusted *= meta.mythicMult;
      return [key, Math.max(0.25, adjusted)];
    });
  }

  function depthProgressMarkup(depth) {
    const d = depthProgressMeta(depth);
    const roomLine = d.chaptersUntilRoom === 0
      ? 'Room clears after this chapter.'
      : `${format(d.chaptersUntilRoom)} chapter${d.chaptersUntilRoom === 1 ? '' : 's'} until the next room.`;
    const floorLine = d.roomsUntilFloor === 0 && d.chaptersUntilRoom === 0
      ? 'Next Hollow Stair floor begins after this room.'
      : `Next Hollow Stair floor begins at D${format(d.nextFloorAtDepth)}.`;
    return `<div class="depth-progress-card" aria-label="Hollow Stair progress">
      <div class="split depth-progress-head">
        <div>
          <div class="depth-kicker">Hollow Stair Progress</div>
          <strong>${escapeHtml(depthLabel(depth))}</strong>
        </div>
        <span class="pill">D${format(d.rawDepth)}</span>
      </div>
      <div class="depth-progress-grid">
        <div class="depth-progress-stat"><span>Chapter</span><strong>${format(d.chapter)} / ${format(DEPTH_CHAPTERS_PER_ROOM)}</strong></div>
        <div class="depth-progress-stat"><span>Room</span><strong>${format(d.room)} / ${format(DEPTH_ROOMS_PER_FLOOR)}</strong></div>
      </div>
      <div class="depth-meter"><div style="width:${d.chapterPct.toFixed(1)}%"></div></div>
      <p class="small muted">${escapeHtml(roomLine)} ${escapeHtml(floorLine)}</p>
    </div>`;
  }

  function safeExtractDepthValue(state) {
    return progressDepthValue(state?.player?.safeExtractDepth, 1);
  }

  function safelyReachedFloor40(state) {
    return safeExtractDepthValue(state) >= 40;
  }

  function mythicSetDropsAllowed(state) {
    return safelyReachedFloor40(state);
  }

  function isDeepRun(state) {
    const activeFloor = Math.floor(numberOr(state?.run?.floor, 0, 0, 999));
    return activeFloor >= 40 || safeExtractDepthValue(state) >= 40;
  }

  function wasStartedFromDeepStairCharter(state) {
    return !!(state?.run?.active && state.run.startedFromCharter && Math.floor(numberOr(state.run.charterStartFloor, 0, 0, 999)) >= 40);
  }

  function mythicSetSlotFromSlot(slot) {
    const key = String(slot || '').toLowerCase();
    return MYTHIC_SET_SLOT_ALIASES[key] || (MYTHIC_SET_SLOTS.includes(key) ? key : '');
  }

  function isMythicSetSlot(slot) {
    return MYTHIC_SET_SLOTS.includes(mythicSetSlotFromSlot(slot));
  }

  function baseSlotForSlot(slot, fallback = 'weapon') {
    const key = String(slot || '').toLowerCase();
    if (BASES[key]) return key;
    const alias = BASE_SLOT_ALIASES[key];
    return BASES[alias] ? alias : fallback;
  }

  function getMythicSetDefinition(setId) {
    const key = String(setId || '').toLowerCase();
    return MYTHIC_SET_DEFINITIONS[key] || null;
  }

  function getItemSetId(item) {
    if (!isPlainObject(item)) return '';
    const setId = String(item.setId || item.mythicSetId || '').toLowerCase();
    return getMythicSetDefinition(setId) ? setId : '';
  }

  function isMythicSetItem(item) {
    return !!(isPlainObject(item) && itemRarityKey(item) === 'mythic' && getItemSetId(item) && isMythicSetSlot(item.setSlot || item.slot));
  }

  function getEquippedSetPieces(state, setId) {
    const targetSetId = String(setId || '').toLowerCase();
    if (!getMythicSetDefinition(targetSetId)) return [];
    const equipment = isPlainObject(state?.player?.equipment) ? state.player.equipment : {};
    const seenSlots = new Set();
    return Object.values(equipment).filter(item => {
      if (!isMythicSetItem(item) || getItemSetId(item) !== targetSetId) return false;
      const setSlot = mythicSetSlotFromSlot(item.setSlot || item.slot);
      if (!setSlot || seenSlots.has(setSlot)) return false;
      seenSlots.add(setSlot);
      return true;
    });
  }

  function getEquippedSetCount(state, setId) {
    return getEquippedSetPieces(state, setId).length;
  }

  function hasEquippedSetBonus(state, setId, pieces) {
    return getEquippedSetCount(state, setId) >= Math.floor(numberOr(pieces, 0, 0, 99));
  }

  function ensureRunSetBonusState(state) {
    if (!state.run) state.run = {};
    if (!isPlainObject(state.run.setBonuses)) state.run.setBonuses = {};
    state.run.setBonuses.ashboundLethalUsed = !!state.run.setBonuses.ashboundLethalUsed;
    state.run.setBonuses.bellforgeHits = Math.floor(numberOr(state.run.setBonuses.bellforgeHits, 0, 0, 999999));
    return state.run.setBonuses;
  }

  function activeMerchantDiscountPct(state) {
    return hasEquippedSetBonus(state, 'lowfire_debtbrand', 3) ? 6 : 0;
  }

  function merchantCostWithSetBonus(state, baseCost) {
    const cost = Math.max(0, Math.floor(numberOr(baseCost, 0, 0, Number.MAX_SAFE_INTEGER)));
    const pct = activeMerchantDiscountPct(state);
    return pct > 0 ? Math.max(1, Math.round(cost * (1 - pct / 100))) : cost;
  }

  function merchantCostMarkup(state, baseCost) {
    const cost = Math.max(0, Math.floor(numberOr(baseCost, 0, 0, Number.MAX_SAFE_INTEGER)));
    const discounted = merchantCostWithSetBonus(state, cost);
    if (discounted >= cost) return formatMoney(cost);
    return `${formatMoney(discounted)} <span class="pill rarity-mythic">Debtbrand -${format(activeMerchantDiscountPct(state))}%</span>`;
  }

  function grantDebtbrandMerchantBoost(state) {
    if (!hasEquippedSetBonus(state, 'lowfire_debtbrand', 5)) return false;
    if (!state.player) state.player = {};
    if (state.player.debtbrandBoostReady) return false;
    state.player.debtbrandBoostReady = true;
    pushLog(state, 'Lowfire Debtbrand readies a paid-edge boost for the next fight.');
    return true;
  }

  function consumeDebtbrandCombatBoost(state) {
    if (!state?.player?.debtbrandBoostReady) return false;
    state.player.debtbrandBoostReady = false;
    pushCombat(state, 'Debtbrand toll paid: your next blow bites harder.');
    return true;
  }

  function tryAshboundLethalWard(state) {
    if (!hasEquippedSetBonus(state, 'ashbound_warden', 5)) return false;
    const setRun = ensureRunSetBonusState(state);
    if (setRun.ashboundLethalUsed) return false;
    setRun.ashboundLethalUsed = true;
    state.player.hp = 1;
    pushCombat(state, 'Ashbound Warden refuses the death-bell. You stand at 1 HP.');
    return true;
  }

  function getSetBonusEntries(setDef) {
    if (!isPlainObject(setDef?.bonuses)) return [];
    return Object.entries(setDef.bonuses)
      .map(([pieces, label]) => ({ pieces: Math.floor(numberOr(pieces, 0, 0, 99)), label: String(label || '') }))
      .filter(entry => entry.pieces > 0 && entry.label)
      .sort((a, b) => a.pieces - b.pieces);
  }

  function setBonusPreviewMarkup(item, state = S, compact = false) {
    const setId = getItemSetId(item);
    const setDef = getMythicSetDefinition(setId);
    if (!setDef) return '';
    const equippedCount = getEquippedSetCount(state, setId);
    const entries = getSetBonusEntries(setDef);
    const setSlot = mythicSetSlotFromSlot(item?.setSlot || item?.slot);
    const slotLine = setSlot ? `<span class="pill">${escapeHtml(setSlot)}</span>` : '';
    const bonusRows = entries.map(entry => {
      const met = equippedCount >= entry.pieces;
      return `<div class="set-bonus-row ${met ? 'met' : ''}"><span>${format(entry.pieces)}pc</span><strong>${escapeHtml(entry.label)}</strong></div>`;
    }).join('');
    const modeClass = compact ? ' compact' : '';
    return `<div class="set-bonus-preview${modeClass}" aria-label="${escapeHtml(setDef.name)} set bonus preview">
      <div class="split set-bonus-head"><strong>${escapeHtml(setDef.name)} Set</strong><span class="pill">Equipped ${format(equippedCount)} / ${format(setDef.slots?.length || MYTHIC_SET_SLOTS.length)}</span></div>
      <div class="tag-row set-bonus-tags"><span class="pill rarity-mythic">Mythic Set</span>${slotLine}</div>
      <div class="set-bonus-lines">${bonusRows}</div>
      <p class="small muted">Bonuses activate automatically when enough pieces are equipped.</p>
    </div>`;
  }

  function setBonusMiniMarkup(item, state = S) {
    const setId = getItemSetId(item);
    const setDef = getMythicSetDefinition(setId);
    if (!setDef) return '';
    const equippedCount = getEquippedSetCount(state, setId);
    return `<div class="set-mini-line"><span class="pill rarity-mythic">${escapeHtml(setDef.name)}</span><span class="pill">${format(equippedCount)} / ${format(setDef.slots?.length || MYTHIC_SET_SLOTS.length)}</span></div>`;
  }

  function deepLootFoundationSnapshot(state) {
    return {
      safeExtractDepth: safeExtractDepthValue(state),
      depthStructure: depthStructureFromRawDepth(safeExtractDepthValue(state)),
      reachedFloor40: safelyReachedFloor40(state),
      mythicSetDropsAllowed: mythicSetDropsAllowed(state),
      deepRun: isDeepRun(state),
      charterStarted: wasStartedFromDeepStairCharter(state),
      setCount: Object.keys(MYTHIC_SET_DEFINITIONS).length
    };
  }

  function mythicSetDropChance(rawDepth, source = 'normal', state = null) {
    const depth = depthStageValue(rawDepth);
    if (depth < 40 || !mythicSetDropsAllowed(state)) return 0;
    const base = source === 'boss' ? 0.07 : source === 'elite' ? 0.028 : 0.012;
    const cap = source === 'boss' ? 0.10 : source === 'elite' ? 0.045 : 0.025;
    const deepBand = Math.max(0, Math.floor((depth - 40) / 40));
    let chance = Math.min(cap, base + deepBand * 0.004);
    const scarcity = depthLootScarcityMeta(depth, source, state);
    if (scarcity.charterWarmup) chance *= 0.75;
    return clamp(chance, 0, cap);
  }

  function shouldDropMythicSetPiece(state, source = 'normal', rawDepth = 1) {
    const chance = mythicSetDropChance(rawDepth, source, state);
    return chance > 0 && Math.random() < chance;
  }

  function randomMythicSetDefinition() {
    return pick(Object.values(MYTHIC_SET_DEFINITIONS));
  }

  function generateMythicSetPiece(rawDepth, source = 'normal', state = null) {
    const setDef = randomMythicSetDefinition();
    const setSlot = pick(MYTHIC_SET_SLOTS);
    const baseSlot = baseSlotForSlot(setSlot, 'armor');
    const level = Math.max(15, threatDepthFromDepth(rawDepth) + rand(0, 2));
    const item = generateGear(baseSlot, level, { source, forcedRarity:'mythic', depthRaw: rawDepth, state, skipMythicSet:true });
    item.slot = baseSlot;
    item.setSlot = setSlot;
    item.setId = setDef.id;
    item.mythicSetId = setDef.id;
    item.maker = setDef.name;
    item.theme = 'mythic-set';
    item.name = setDef.pieceNames?.[setSlot] || `${setDef.name} ${setSlot}`;
    item.summary = `${setDef.name} mythic set piece. Equip matching pieces to activate the listed bonuses.`;
    item.tags = Array.from(new Set(asArray(item.tags, []).concat(['mythic-set', setDef.id, setSlot, source])));
    item.value = Math.max(item.value, gearPriceFromRating(item.rating, level, 'mythic', source));
    return item;
  }

  function slotSortIndex(slot) {
    const idx = EQUIPMENT_DISPLAY_SLOTS.indexOf(String(slot || '').toLowerCase());
    return idx >= 0 ? idx : EQUIPMENT_DISPLAY_SLOTS.length + 1;
  }

  function equipmentConflictSlots(slot) {
    const key = String(slot || '').toLowerCase();
    if (key === 'armor' || key === 'chest') return ['armor','chest'];
    if (key === 'gloves' || key === 'hands') return ['gloves','hands'];
    if (key === 'boots' || key === 'legs') return ['boots','legs'];
    if (key === 'cloak' || key === 'shoulders') return ['cloak','shoulders'];
    return [baseSlotForSlot(key, key)];
  }

  // District progression prep:
  // Safe depth only advances when a run successfully extracts.
  // Death-only progress does not unlock charters, deep loot, or district wares.
  // Visible depth now advances one chapter per cleared encounter.
  function recordSafeExtractionProgress(state) {
    const extractedFloor = progressDepthValue(state?.run?.floor, state?.player?.depth || 1);
    state.player.safeExtractDepth = Math.max(
      1,
      progressDepthValue(state.player.safeExtractDepth, 1),
      extractedFloor
    );
  }

  // Charter compatibility note:
  // Older save fields still say floor/permanentStartFloor/charterStartFloor.
  // In v1.2.27a those values are treated as raw depth checkpoints so the
  // chapter/room/floor structure can progress without breaking old saves.
  const CHARTER_EARLY_STEP = 40;
  const CHARTER_EARLY_LIMIT = 800;
  const CHARTER_LATE_STEP = 5000;
  const CHARTER_BASE_GOLD = 75;
  const CHARTER_EARLY_SCALE = 1.075;
  const CHARTER_LATE_SCALE = 1.025;
  const CHARTER_MAX_GOLD = 500;

  function normalizeCharterMilestoneDepth(depth) {
    const safeDepth = Math.max(0, Math.floor(numberOr(depth, 0, 0, 999999)));
    if (safeDepth < CHARTER_EARLY_STEP) return 0;
    if (safeDepth <= CHARTER_EARLY_LIMIT) return Math.floor(safeDepth / CHARTER_EARLY_STEP) * CHARTER_EARLY_STEP;
    return CHARTER_EARLY_LIMIT + Math.floor((safeDepth - CHARTER_EARLY_LIMIT) / CHARTER_LATE_STEP) * CHARTER_LATE_STEP;
  }

  function getNextCharterUnlockDepth(currentUnlockedDepth) {
    const unlocked = normalizeCharterMilestoneDepth(currentUnlockedDepth);
    if (unlocked < CHARTER_EARLY_LIMIT) return unlocked + CHARTER_EARLY_STEP;
    return unlocked + CHARTER_LATE_STEP;
  }

  function getUnlockedCharterDepth(state) {
    const ownedDepth = Math.max(1, ...normalizeCharterDepthList(state?.player?.deepStairCharters || []));
    const safeDepth = Math.max(
      1,
      progressDepthValue(state?.player?.safeExtractDepth, 1),
      progressDepthValue(state?.player?.permanentStartFloor >= 40 ? state.player.permanentStartFloor : 1, 1),
      ownedDepth
    );
    return normalizeCharterMilestoneDepth(safeDepth);
  }

  function getUnlockedCharterFloor(state) {
    return getUnlockedCharterDepth(state);
  }

  function normalizeCharterDepthList(value) {
    return Array.from(new Set(asArray(value, [])
      .map(depth => normalizeCharterMilestoneDepth(depth))
      .filter(depth => depth >= CHARTER_EARLY_STEP)))
      .sort((a, b) => a - b);
  }

  function ensurePermanentCharters(state) {
    if (!state.player) state.player = {};
    const owned = normalizeCharterDepthList(state.player.deepStairCharters);
    const legacyBought = !!state?.player?.goldSink?.boughtStart40Charter || Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999)) >= 40;
    if (legacyBought && !owned.includes(40)) owned.push(40);
    state.player.deepStairCharters = Array.from(new Set(owned)).sort((a, b) => a - b);
    return state.player.deepStairCharters;
  }

  function isCharterDepthUnlocked(state, depth) {
    return charterStartDepths(state).includes(normalizeCharterMilestoneDepth(depth));
  }

  function ownsPermanentCharter(state, depth) {
    return ensurePermanentCharters(state).includes(normalizeCharterMilestoneDepth(depth));
  }

  function grantPermanentCharter(state, depth) {
    const startDepth = normalizeCharterMilestoneDepth(depth);
    if (startDepth < 40) return false;
    const owned = ensurePermanentCharters(state);
    if (!owned.includes(startDepth)) owned.push(startDepth);
    state.player.deepStairCharters = Array.from(new Set(owned)).sort((a, b) => a - b);
    if (startDepth === 40) ensureGoldSinkState(state).boughtStart40Charter = true;
    return true;
  }

  function charterStartDepths(state) {
    const maxDepth = getUnlockedCharterDepth(state);
    const depths = [];
    for (let depth = CHARTER_EARLY_STEP; depth <= Math.min(maxDepth, CHARTER_EARLY_LIMIT); depth += CHARTER_EARLY_STEP) depths.push(depth);
    for (let depth = CHARTER_EARLY_LIMIT + CHARTER_LATE_STEP; depth <= maxDepth; depth += CHARTER_LATE_STEP) depths.push(depth);
    return depths;
  }

  function charterStartFloors(state) {
    return charterStartDepths(state);
  }

  function charterStartCost(depth) {
    const startDepth = Math.max(CHARTER_EARLY_STEP, normalizeCharterMilestoneDepth(depth) || CHARTER_EARLY_STEP);
    const earlyTier = Math.floor(Math.min(startDepth, CHARTER_EARLY_LIMIT) / CHARTER_EARLY_STEP);
    const costAtEarlyLimit = CHARTER_BASE_GOLD * Math.pow(CHARTER_EARLY_SCALE, (CHARTER_EARLY_LIMIT / CHARTER_EARLY_STEP) - 1);
    const scaledGold = startDepth <= CHARTER_EARLY_LIMIT
      ? CHARTER_BASE_GOLD * Math.pow(CHARTER_EARLY_SCALE, earlyTier - 1)
      : costAtEarlyLimit * Math.pow(CHARTER_LATE_SCALE, Math.floor((startDepth - CHARTER_EARLY_LIMIT) / CHARTER_LATE_STEP));
    return coins(Math.min(CHARTER_MAX_GOLD, Math.max(CHARTER_BASE_GOLD, Math.round(scaledGold))), 0, 0);
  }

  function charterDepthLabel(depth) {
    return depthWithRawLabel(depthStageValue(depth));
  }

  function charterDepthCompactLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `F${format(threatDepthFromDepth(depth))} • D${format(d.rawDepth)} • R${format(d.room)} C${format(d.chapter)}`;
  }

  function canUseCharterStart(state, depth) {
    return ownsPermanentCharter(state, depth);
  }

  function gearPriceFromRating(rating, level, rarityKey, source = 'normal') {
    const rarityMarkup = { common:1, uncommon:1.45, rare:2.35, epic:4.2, legendary:7.5, mythic:11 };
    const sourceMarkup = source === 'merchant' ? 1.34 : source === 'forge' ? 1.1 : 1;
    const levelPressure = level <= 4 ? 13 : level <= 9 ? 18 : level <= 15 ? 25 : 34;
    const copper = Math.round((rating * levelPressure + level * 18 + rand(12, 54)) * (rarityMarkup[rarityKey] || 1) * sourceMarkup);
    return Math.max(coins(0, 0, 25), copper);
  }

  function encounterCoinReward(floor, power, tier, rewardMult) {
    let copper = rand(8, 18) + floor * rand(8, 14);
    if (tier === 'Elite') copper = Math.round(copper * 2.15 + rand(20, 55));
    if (tier === 'Boss') copper = Math.round(coins(0, 1, 20) + floor * rand(24, 42));
    const maxRewardMult = tier === 'Elite' ? 1.62 : 1.35;
    copper = Math.round(copper * Math.max(0.65, Math.min(maxRewardMult, rewardMult || 1)));
    return Math.max(6, copper);
  }

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
    { id:'wardmarked', key:'Wardmarked', name:'Wardmarked', label:'burst ward', description:'Resists reckless burst damage.', tier:3, rarity:'rare', minThreat:10, weight:8, tags:['defensive_wall','punishment'], conflicts:['defensive_wall','burst'], displayPriority:55, power:1.06, hp:1.05, guard:1.11, speed:1.0, reward:1.22, rewardWeight:1.14, combatHook:'guard_pressure', text:'turns aside reckless bursts', danger:'Extra guard resists quick burst damage.', callout:'Steady attacks beat wasted spikes.' }
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
    if (!monster || monster.tier !== 'Elite') return [];
    const found = [];
    const seen = new Set();
    asArray(monster.modifiers, []).concat(monster.modifier ? [monster.modifier] : []).forEach(raw => {
      const modifier = normalizeEliteModifier(raw);
      if (!modifier || seen.has(modifier.id)) return;
      seen.add(modifier.id);
      found.push(modifier);
    });
    return found.sort((a, b) => (b.displayPriority || 0) - (a.displayPriority || 0)).slice(0, ELITE_STACKED_MODIFIER_MAX_COUNT);
  }

  function hasEliteModifier(monster, value) {
    const def = eliteModifierDef(value);
    if (!def) return false;
    return eliteModifiersForMonster(monster).some(modifier => modifier.id === def.id);
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
    const count = eliteModifierCountForDepth(rawDepth);
    const pool = eligibleEliteModifiers(rawDepth);
    const selected = [];
    for (let i = 0; i < count && selected.length < ELITE_STACKED_MODIFIER_MAX_COUNT; i++) {
      const candidates = pool.filter(candidate => !selected.some(chosen => chosen.id === candidate.id || eliteModifiersConflict(chosen, candidate)));
      const picked = weightedPick(candidates);
      if (!picked) break;
      selected.push({ ...picked });
    }
    return selected.length ? selected : [normalizeEliteModifier('Frenzied')].filter(Boolean);
  }

  function eliteModifierStatProfile(modifiers) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    const profile = list.reduce((acc, modifier) => {
      acc.power *= numberOr(modifier.power, 1, 0.75, 2);
      acc.hp *= numberOr(modifier.hp, 1, 0.75, 2);
      acc.guard *= numberOr(modifier.guard, 1, 0.75, 2);
      acc.speed *= numberOr(modifier.speed, 1, 0.75, 2);
      acc.reward *= numberOr(modifier.reward, 1, 0.75, 2);
      return acc;
    }, { power:1, hp:1, guard:1, speed:1, reward:1 });
    return {
      power: clamp(profile.power, 0.85, 1.36),
      hp: clamp(profile.hp, 0.85, 1.34),
      guard: clamp(profile.guard, 0.85, 1.32),
      speed: clamp(profile.speed, 0.85, 1.30),
      reward: clamp(profile.reward, 1, 1.62)
    };
  }

  function eliteRewardProfile(modifiers, rawDepth) {
    const list = asArray(modifiers, []).map(normalizeEliteModifier).filter(Boolean);
    if (!list.length) return null;
    const tierScore = list.reduce((sum, modifier) => sum + Math.floor(numberOr(modifier.tier, 1, 1, 4)), 0);
    const rewardWeight = list.reduce((sum, modifier) => sum + numberOr(modifier.rewardWeight, 1, 0, 3), 0);
    const depthBonus = depthStageValue(rawDepth) >= 75 ? 0.035 : depthStageValue(rawDepth) >= 45 ? 0.025 : depthStageValue(rawDepth) >= 24 ? 0.012 : 0;
    const bonusLootChance = clamp(0.025 + tierScore * 0.016 + Math.max(0, list.length - 1) * 0.035 + depthBonus, 0.04, 0.16);
    return {
      modifierCount: list.length,
      tierScore,
      rewardWeight: Math.round(rewardWeight * 100) / 100,
      bonusLootChance,
      shardBonus: tierScore >= 4 ? 1 : 0,
      label: list.length > 1 ? 'stacked elite risk' : `${eliteModifierTierLabel(list[0]).toLowerCase()} elite risk`
    };
  }

  function normalizeEliteRewardProfile(value, modifiers = [], rawDepth = 1) {
    const fallback = eliteRewardProfile(modifiers, rawDepth);
    if (!isPlainObject(value)) return fallback;
    return {
      modifierCount: Math.floor(numberOr(value.modifierCount, fallback?.modifierCount || 0, 0, ELITE_STACKED_MODIFIER_MAX_COUNT)),
      tierScore: Math.floor(numberOr(value.tierScore, fallback?.tierScore || 0, 0, 12)),
      rewardWeight: numberOr(value.rewardWeight, fallback?.rewardWeight || 0, 0, 12),
      bonusLootChance: clamp(numberOr(value.bonusLootChance, fallback?.bonusLootChance || 0, 0, 0.2), 0, 0.2),
      shardBonus: Math.floor(numberOr(value.shardBonus, fallback?.shardBonus || 0, 0, 5)),
      label: String(value.label || fallback?.label || 'elite risk')
    };
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
    const modifiers = eliteModifiersForMonster(monster);
    if (!modifiers.length) return '';
    return `<div class="elite-identity-panel" aria-label="Elite modifiers and threat readout">
      <div class="elite-threat-head">
        <span class="elite-threat-label">${escapeHtml(eliteModifierThreatRating(modifiers))}</span>
        <span class="elite-threat-count">${format(modifiers.length)} mod${modifiers.length === 1 ? '' : 's'}</span>
      </div>
      <div class="elite-modifier-row">
        ${modifiers.map(modifier => {
          const label = escapeHtml(modifier.name || modifier.key || 'Modifier');
          const mini = escapeHtml(eliteModifierMiniText(modifier));
          const key = String(modifier.key || modifier.name || 'modifier').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const tier = Math.floor(numberOr(modifier.tier, 1, 1, 4));
          const title = escapeHtml(`${modifier.name || modifier.key || 'Modifier'}: ${modifier.danger || modifier.description || 'Elite threat.'} ${modifier.callout || ''}`.trim());
          return `<span class="elite-modifier elite-mod-${key} elite-tier-${tier}" title="${title}" aria-label="${title}"><span class="elite-mod-name">${label}</span><span class="elite-mod-note">${mini}</span></span>`;
        }).join('')}
      </div>
      <div class="elite-danger-line"><b>Danger:</b> ${escapeHtml(eliteModifierDangerSummary(modifiers))}</div>
      <div class="elite-danger-line muted"><b>Plan:</b> ${escapeHtml(eliteModifierPlanLine(modifiers))}</div>
    </div>`;
  }
  function rarityIndex(key) { return Math.max(0, RARITIES.findIndex(r => r.key === key)); }

  function cappedRarityForLevel(level, source = 'normal') {
    if (source === 'forge') {
      if (level < 10) return 'rare';
      if (level < 15) return 'epic';
      return 'legendary';
    }
    if (source === 'merchant') {
      if (level < 6) return 'rare';
      if (level < 12) return 'epic';
      return 'legendary';
    }
    if (source === 'boss') {
      if (level < 10) return 'epic';
      if (level < 15) return 'legendary';
      return 'mythic';
    }
    if (source === 'elite') {
      if (level < 5) return 'rare';
      if (level < 10) return 'epic';
      return 'legendary';
    }
    if (level < 5) return 'rare';
    if (level < 10) return 'epic';
    if (level < 15) return 'legendary';
    return 'mythic';
  }

  function weightedRarityForLevel(level, source = 'normal', opts = {}) {
    let table;
    if (source === 'merchant') {
      table = level < 6
        ? [['common',62],['uncommon',32],['rare',6]]
        : level < 12
        ? [['common',50],['uncommon',36],['rare',12],['epic',2]]
        : [['common',38],['uncommon',36],['rare',19],['epic',6],['legendary',1]];
    } else if (source === 'elite') {
      table = level < 5
        ? [['common',56],['uncommon',34],['rare',9],['epic',1]]
        : level < 10
        ? [['common',42],['uncommon',36],['rare',18],['epic',4]]
        : level < 15
        ? [['common',30],['uncommon',35],['rare',24],['epic',9],['legendary',2]]
        : [['common',22],['uncommon',31],['rare',28],['epic',14],['legendary',4],['mythic',1]];
    } else if (source === 'boss') {
      table = level < 10
        ? [['common',25],['uncommon',45],['rare',22],['epic',7],['legendary',1]]
        : level < 15
        ? [['common',16],['uncommon',38],['rare',30],['epic',12],['legendary',4]]
        : [['uncommon',26],['rare',36],['epic',25],['legendary',11],['mythic',2]];
    } else if (source === 'forge') {
      table = level < 10
        ? [['uncommon',34],['rare',52],['epic',14]]
        : level < 15
        ? [['rare',50],['epic',38],['legendary',12]]
        : [['rare',26],['epic',42],['legendary',25],['mythic',7]];
    } else {
      table = level < 5
        ? [['common',72],['uncommon',22],['rare',5],['epic',1]]
        : level < 10
        ? [['common',62],['uncommon',27],['rare',9],['epic',2]]
        : level < 15
        ? [['common',48],['uncommon',31],['rare',16],['epic',4],['legendary',1]]
        : [['common',36],['uncommon',31],['rare',22],['epic',8],['legendary',2],['mythic',1]];
    }
    table = applyDepthLootScarcity(table, opts.depthRaw || opts.depth || level, source, opts.state || null);
    const allowedMax = rarityIndex(cappedRarityForLevel(level, source));
    const filtered = table.filter(([key]) => rarityIndex(key) <= allowedMax);
    const roll = Math.random() * filtered.reduce((sum, [, chance]) => sum + chance, 0);
    let sum = 0;
    for (const [key, chance] of filtered) {
      sum += chance;
      if (roll <= sum) return RARITIES.find(r => r.key === key);
    }
    return RARITIES[0];
  }

  function earlyStatScale(level) {
    if (level <= 4) return 0.62;
    if (level <= 9) return 0.78;
    if (level <= 15) return 0.9;
    return 1;
  }

  // Item scaling audit: most dropped gear uses threat-depth as its item level, while raw
  // descent depth can be thousands of chapters. Keep raw-depth pressure visible without
  // letting Mythic rarity become a runaway multiplier at very deep floors.
  //
  // v1.3.40 tuning note: Mythics should still beat Legendaries at deep floors. The softener
  // begins after depth 500 and reaches the existing 0.86 deep floor by depth 1000.
  function mythicDepthSoftener(level, rawDepth = 0) {
    const itemLevel = Math.max(1, Math.floor(numberOr(level, 1, 1, 999999)));
    const depth = Math.max(itemLevel, Math.floor(numberOr(rawDepth, 0, 0, 999999)));
    if (depth <= 500) return 1;
    const band = clamp((depth - 500) / 500, 0, 1);
    return 1 - band * 0.14;
  }

  // Rarity scaling audit: Mythics keep their early/midgame identity, then receive
  // diminishing raw-stat growth after deep-floor thresholds instead of stacking forever.
  function rarityStatMultiplier(rarityKey, level, rawDepth = 0) {
    const def = RARITIES.find(r => r.key === rarityKey) || RARITIES[0];
    if (def.key !== 'mythic') return def.mult;
    return def.mult * mythicDepthSoftener(level, rawDepth);
  }

  // Monster scaling audit: prior deep floors leaned too heavily on capped room/floor
  // pressure. Common enemies keep the existing readable deep curve; elite and boss enemies
  // gain a bounded post-D800 pressure bump so deep Mythics do not make marked fights soft.
  function deepMonsterPowerMultiplier(rawDepth, tier = 'Common') {
    const depth = depthStageValue(rawDepth);
    if (depth <= 800) return 1;
    const base = Math.min(0.55, (depth - 800) * 0.00018);
    const deepTierRamp = clamp((depth - 800) / 300, 0, 1);
    const tierBonus = tier === 'Boss' ? 0.08 + deepTierRamp * 0.15 : tier === 'Elite' ? 0.04 + deepTierRamp * 0.13 : 0;
    return 1 + base + tierBonus;
  }

  function expectedGearRating(level, rarityKey = 'common', source = 'normal', rawDepth = 0) {
    const safeLevel = Math.max(1, Math.floor(numberOr(level, 1, 1, 999999)));
    const sourceScale = source === 'merchant' ? 0.96 : source === 'elite' ? 1.05 : source === 'boss' ? 1.15 : source === 'forge' ? 1.08 : 1;
    const baseRollAverage = safeLevel * 7.5 + 5;
    return Math.max(3, Math.round(baseRollAverage * rarityStatMultiplier(rarityKey, safeLevel, rawDepth) * earlyStatScale(safeLevel) * sourceScale));
  }

  function expectedMonsterPowerAtDepth(rawDepth, tier = 'Common') {
    const depth = depthStageValue(rawDepth);
    const threatDepth = threatDepthFromDepth(depth);
    const ladder = depthDifficultyLadder(depth);
    const boss = tier === 'Boss';
    const elite = tier === 'Elite';
    const earlyPressure = threatDepth <= 3 ? 0.90 : threatDepth <= 5 ? 1.0 : threatDepth <= 10 ? 1.08 : threatDepth <= 15 ? 1.06 : 1;
    const base = (threatDepth * 9.5 + 15 + (boss ? 72 : 0) + (elite ? 16 : 0)) * earlyPressure * ladder.powerMult;
    const tierProfile = boss ? 1.22 : elite ? 1.16 : 1;
    return Math.round(base * deepMonsterPowerMultiplier(depth, tier) * tierProfile);
  }

  function generateStarterJunk() {
    const junk = generateGear(pick(['weapon','offhand','helm','gloves','boots']), 1, { forcedRarity:'common', source:'starter', broken:true });
    junk.name = pick(['Rust Knife','Cracked Buckler','Frayed Hood','Ashcloth Wraps','Torn Treads']);
    junk.rating = Math.max(3, Math.round(junk.rating * 0.45));
    Object.keys(junk.stats).forEach(k => junk.stats[k] = Math.max(0, Math.round(junk.stats[k] * 0.35)));
    junk.value = rand(6, 12);
    junk.summary = 'Barely serviceable salvage. Better than empty hands, not by much.';
    junk.tags = ['junk', junk.slot, 'starter'];
    return junk;
  }

  function eliteChanceForFloor(floor) {
    if (floor <= 3) return 0.08;
    if (floor <= 7) return 0.18;
    if (floor <= 12) return 0.28;
    if (floor <= 15) return 0.34;
    return 0.26;
  }

  function lootDropChance(floor, source = 'normal', state = null) {
    const rawDepth = depthStageValue(floor);
    const depth = threatDepthFromDepth(rawDepth);
    const base = source === 'boss' ? 1 : source === 'elite' ? 0.72 : 0.10;
    let chance;
    if (source === 'normal') {
      chance = depth < 6 ? 0.42 : depth < 12 ? 0.48 : 0.52;
    } else if (depth < 5) {
      chance = 0.08;
    } else if (depth < 10) {
      chance = 0.12;
    } else if (depth < 15) {
      chance = 0.16;
    } else {
      chance = base;
    }
    const scarcity = depthLootScarcityMeta(rawDepth, source, state);
    return clamp(chance * scarcity.dropChanceMult, 0.04, 1);
  }

  function shouldDropLoot(floor, source = 'normal', rollIndex = 0, state = null) {
    if (source === 'boss') {
      if (rollIndex === 0) return true;
      const scarcity = depthLootScarcityMeta(floor, source, state);
      return Math.random() < clamp(0.35 * scarcity.dropChanceMult, 0.18, 0.35);
    }
    return Math.random() < lootDropChance(floor, source, state);
  }


  function gearCatalogCount() {
    return SLOT_ORDER.reduce((acc, slot) => acc + (BASES[slot].length * PREFIXES.length * SUFFIXES.length), 0);
  }

  function monsterCatalogCount() {
    return MONSTER_FAMILIES.length * MONSTER_TYPES.length * MONSTER_AFFIXES.length;
  }

  function createBaseState() {
    const state = {
      build: BUILD,
      screen: 'town',
      filters: { slot:'all', rarity:'all', search:'', sort:'power' },
      player: {
        name: 'Warden',
        title: 'Ashbound Delver',
        level: 1,
        xp: 0,
        xpNext: 100,
        hp: 100,
        maxHp: 100,
        gold: coins(0, 12, 50),
        currencyVersion: 3,
        shards: 0,
        ember: 1,
        depth: 0,
        safeExtractDepth: 1,
        returnDepth: 1,
        kills: 0,
        crit: 6,
        dodge: 4,
        stats: { ...DEFAULT_PLAYER_STATS },
        equipment: {},
        inventory: [],
        discoveredMonsters: [],
        discoveredGear: [],
        log: [],
        loreSeen: [LORE_SNIPPETS[0]],
        runHistory: [],
        quests: [
          { id:'q1', title:'Open the Hollow Stair', goal:5, progress:0, reward:'2s50c + 1 ember', type:'kill' },
          { id:'q2', title:'Dress the Delver', goal:4, progress:0, reward:'1 forge spark', type:'equip' },
          { id:'q3', title:'Relic Census', goal:12, progress:0, reward:'80 shards', type:'loot' }
        ],
        forgeSpark: 0,
        earlyAidGiven: false,
        permanentStartFloor: 1,
        deepStairCharters: [],
        debtbrandBoostReady: false,
        boughtStart20Scroll: false,
        goldSink: createGoldSinkState(),
        eliteContracts: createEliteContractState()
      },
      town: { merchantRefreshCost: coins(0, 1, 50), forgeTier: 1, relicFavor: 0 },
      run: {
        active: false,
        floor: 0,
        chain: 0,
        danger: 1,
        zone: 'Low Steps',
        monster: null,
        combatLog: ['Lowfire waits above. The Hollow Stair waits below.'],
        roomsCleared: 0,
        encounters: 0,
        choices: [],
        goldBonusPct: 0,
        pendingRewards: createPendingRunRewards(),
        startedFromCharter: false,
        charterStartFloor: 0,
        setBonuses: { ashboundLethalUsed: false, bellforgeHits: 0 }
      },
      merchantStock: [],
      archive: [],
      ui: { combatLogExpanded: false }
    };

    state.player.inventory.push(generateStarterJunk());
    rollMerchant(state, true);
    spawnQuestLore(state, 'Lowfire sends the Warden down with almost nothing. Survival must be earned.');
    pushLog(state, 'Lowfire market stock is lean, useful, and priced for a hard descent.');
    return state;
  }

  function generateGear(slot, level, opts = {}) {
    const source = opts.source || 'normal';
    const rarity = opts.forcedRarity ? RARITIES.find(r => r.key === opts.forcedRarity) : weightedRarityForLevel(level, source, opts);
    const base = pick(BASES[slot]);
    const prefix = pick(PREFIXES);
    const suffix = pick(slot === 'charm' ? SUFFIXES.concat(TRINKET_SUFFIXES) : SUFFIXES);
    const maker = pick(MAKERS);
    const theme = pick(THEMES);
    const rawDepth = Math.floor(numberOr(opts.depthRaw || opts.depth, level, 1, 999999));
    const lowFloorScale = source === 'starter' ? 0.5 : earlyStatScale(level);
    const sourceScale = source === 'merchant' ? 0.96 : source === 'elite' ? 1.05 : source === 'boss' ? 1.15 : source === 'forge' ? 1.08 : 1;
    const brokenScale = opts.broken ? 0.55 : 1;
    // Item power score calculation: base item level roll × rarity scaling × source scaling.
    // Mythic rarity uses rarityStatMultiplier() so deep floors apply a soft cap instead of
    // compounding full Mythic multiplier forever.
    const rating = Math.max(3, Math.round((level * rand(6, 9) + rand(1, 9)) * rarityStatMultiplier(rarity.key, level, rawDepth) * lowFloorScale * sourceScale * brokenScale));
    const stats = {
      power: slot === 'weapon' ? rating + rand(1, 5) : Math.round(rating * 0.22),
      guard: ['armor','offhand','helm','boots'].includes(slot) ? rating + rand(0, 4) : Math.round(rating * 0.18),
      wit: ['amulet','charm','cloak','offhand'].includes(slot) ? Math.round(rating * 0.38) + rand(0, 3) : Math.round(rating * 0.13),
      speed: ['boots','gloves','weapon','cloak'].includes(slot) ? Math.round(rating * 0.34) + rand(0, 3) : Math.round(rating * 0.1),
      luck: ['ring','amulet','charm'].includes(slot) ? Math.round(rating * 0.26) + rand(0, 2) : Math.round(rating * 0.06),
      hp: ['armor','helm','ring','amulet'].includes(slot) ? Math.round(rating * 0.72) + rand(0, 6) : Math.round(rating * 0.22)
    };
    return {
      id: makeId('gear'),
      slot,
      rarity: rarity.key,
      theme,
      maker,
      name: `${prefix} ${base} ${suffix}`,
      level,
      rating,
      value: gearPriceFromRating(rating, level, rarity.key, source),
      stats,
      tags: [theme, maker, slot, source],
      summary: `${maker} ${slot === 'charm' ? 'trinket' : slot} attuned for ${theme} paths.`
    };
  }

  function generateMonster(floor, state = null) {
    const rawDepth = depthStageValue(floor);
    const threatDepth = threatDepthFromDepth(rawDepth);
    const ladder = depthDifficultyLadder(rawDepth);
    const contractRisk = activeEliteContractRisk(state);
    const family = pick(MONSTER_FAMILIES);
    const type = pick(MONSTER_TYPES);
    const affix = pick(MONSTER_AFFIXES);
    const skill = pick(MONSTER_SKILLS);
    const boss = rawDepth > 0 && rawDepth % (BOSS_INTERVAL * DEPTH_CHAPTERS_PER_THREAT_STEP) === 0;
    const eliteChance = clamp(eliteChanceForFloor(threatDepth) + ladder.eliteBonus + contractRisk.spawnBonus, 0.04, 0.43);
    const elite = !boss && Math.random() < eliteChance;
    const modifiers = elite && !boss ? selectEliteModifiers(rawDepth, state) : [];
    const modifier = modifiers[0] || null;
    const tier = boss ? 'Boss' : elite ? 'Elite' : 'Common';
    const earlyPressure = threatDepth <= 3 ? 0.90 : threatDepth <= 5 ? 1.0 : threatDepth <= 10 ? 1.08 : threatDepth <= 15 ? 1.06 : 1;
    // Monster scaling: threat-depth base roll × room/floor ladder × deep-floor pressure.
    // The deep multiplier is intentionally dormant before raw depth 800, then ramps so
    // normal monsters do not flatten behind deep Mythic-equipped players.
    let power = Math.round((threatDepth * rand(8, 11) + rand(10, 20) + (boss ? 72 : 0) + (elite ? 16 : 0)) * earlyPressure * ladder.powerMult * deepMonsterPowerMultiplier(rawDepth, tier));
    let hp = power * (boss ? 2.85 : elite ? 1.76 : 1.36) * ladder.hpMult;
    let guard = Math.round(power * 0.32 * ladder.guardMult);
    let speed = Math.round(power * 0.19 * ladder.speedMult);
    let rewardMult = (threatDepth <= 3 ? (boss ? 1.55 : elite ? 1.28 : 1.12) : boss ? 1.5 : elite ? 1.18 : 1) * ladder.rewardMult;
    let name = `${affix} ${family} ${type}`;
    let reviveUsed = false;
    if (modifiers.length) {
      const statProfile = eliteModifierStatProfile(modifiers);
      name = `${modifiers.map(entry => entry.key).join(' ')} ${name}`;
      power = Math.round(power * statProfile.power);
      hp = Math.round(hp * statProfile.hp);
      guard = Math.round(guard * statProfile.guard);
      speed = Math.round(speed * statProfile.speed);
      rewardMult *= statProfile.reward;
    }
    const eliteReward = elite ? eliteRewardProfile(modifiers, rawDepth) : null;
    const rewardPower = power;
    const rewardGold = encounterCoinReward(threatDepth, rewardPower, tier, rewardMult);
    if (elite) {
      power = Math.round(power * (1 + contractRisk.damageBonus));
      hp = Math.round(hp * (1 + contractRisk.hpBonus));
    }
    return {
      id: makeId('monster'),
      name,
      family,
      type,
      affix,
      skill,
      tier,
      modifier,
      modifiers,
      eliteReward,
      reviveUsed,
      ashFedTriggered: false,
      level: rawDepth,
      depthPressure: Math.round(ladder.totalPressure * 100),
      power,
      maxHp: Math.round(hp),
      hp: Math.round(hp),
      guard,
      speed,
      rewardGold,
      rewardXp: Math.max(6, Math.round(power * 1.05 * rewardMult)),
      rewardShard: boss ? rand(22, 34) : elite ? rand(7, 12) + (eliteReward?.shardBonus || 0) : rand(1, 4),
      lore: boss ? 'A named ruin-lord waits deeper than prayer.' : modifiers.length ? `${modifiers.map(entry => entry.text).join('; ')}. ${skill} follows every opening.` : `A ${tier.toLowerCase()} threat shaped by ${skill.toLowerCase()} and the ruin-depths.`
    };
  }

  function runDeepScalingAudit(state = S) {
    const depths = [50, 100, 250, 500, 1000, 2000, 3000, 4000];
    const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? +(a / b).toFixed(2) : 'n/a');
    const verdictFor = (rawDepth, mythicVsNormal, mythicVsElite, mythicVsBoss, mythicVsLegendary) => {
      if (rawDepth < 1000) return 'early/mid reference';
      if (mythicVsLegendary < 1.04) return 'watch: mythic identity thin';
      if (mythicVsBoss > 1.15) return 'watch: mythic outruns boss pressure';
      if (mythicVsElite > 1.30) return 'watch: mythic outruns elite pressure';
      if (mythicVsNormal > 1.65) return 'watch: mythic ahead of commons';
      if (mythicVsNormal < 0.95) return 'watch: monsters too steep';
      return 'healthy band';
    };
    const currentStats = state ? calcDerived(state) : null;
    const playerPower = currentStats ? Math.round(numberOr(currentStats.power, 0, 0, 9999999)) : 0;
    const rows = depths.map(rawDepth => {
      const level = threatDepthFromDepth(rawDepth);
      const common = expectedGearRating(level, 'common', 'normal', rawDepth);
      const rare = expectedGearRating(level, 'rare', 'normal', rawDepth);
      const legendary = expectedGearRating(level, 'legendary', 'boss', rawDepth);
      const mythic = expectedGearRating(level, 'mythic', 'boss', rawDepth);
      const normalMonster = expectedMonsterPowerAtDepth(rawDepth, 'Common');
      const eliteMonster = expectedMonsterPowerAtDepth(rawDepth, 'Elite');
      const bossMonster = expectedMonsterPowerAtDepth(rawDepth, 'Boss');
      const mythicVsNormal = ratio(mythic, normalMonster);
      const mythicVsElite = ratio(mythic, eliteMonster);
      const mythicVsBoss = ratio(mythic, bossMonster);
      const mythicVsLegendary = ratio(mythic, legendary);
      return {
        depth: rawDepth,
        threatLevel: level,
        normalMonsterPower: normalMonster,
        eliteMonsterPower: eliteMonster,
        bossMonsterPower: bossMonster,
        commonItemPower: common,
        rareItemPower: rare,
        legendaryItemPower: legendary,
        mythicItemPower: mythic,
        mythicSoftener: +mythicDepthSoftener(level, rawDepth).toFixed(3),
        mythicVsNormal,
        mythicVsElite,
        mythicVsBoss,
        mythicVsLegendary,
        eliteVsNormal: ratio(eliteMonster, normalMonster),
        bossVsNormal: ratio(bossMonster, normalMonster),
        currentPlayerPower: playerPower || 'n/a',
        currentPlayerToNormalRatio: playerPower ? ratio(playerPower, normalMonster) : 'n/a',
        tuningVerdict: verdictFor(rawDepth, mythicVsNormal, mythicVsElite, mythicVsBoss, mythicVsLegendary)
      };
    });
    console.info('DungeonDex scaling audit target: deep Mythics stay exciting while elite and boss pressure remains credible beyond D1000.');
    console.table(rows);
    return rows;
  }

  function calcDerived(state) {
    if (!isPlainObject(state?.player)) return { ...DEFAULT_PLAYER_STATS, hpBonus: 0 };
    if (!isPlainObject(state.player.stats)) state.player.stats = { ...DEFAULT_PLAYER_STATS };
    const base = { ...DEFAULT_PLAYER_STATS, ...state.player.stats };
    Object.keys(DEFAULT_PLAYER_STATS).forEach(k => {
      base[k] = Math.floor(numberOr(base[k], DEFAULT_PLAYER_STATS[k], 0, 99999));
      state.player.stats[k] = base[k];
    });
    const equip = { power:0, guard:0, wit:0, speed:0, luck:0, hp:0 };
    const seen = new Set();
    Object.values(state.player.equipment || {}).forEach(item => {
      if (!item) return;
      const key = item.id || item.name || JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      Object.keys(equip).forEach(k => equip[k] += item.stats[k] || 0);
    });
    const ashboundCount = getEquippedSetCount(state, 'ashbound_warden');
    const bellforgeCount = getEquippedSetCount(state, 'veyruhn_bellforge');
    if (ashboundCount >= 2) equip.hp += 24 + Math.floor(numberOr(state.player.level, 1, 1, 999) * 3);
    if (bellforgeCount >= 2) equip.power += 4 + Math.floor(numberOr(state.player.level, 1, 1, 999) / 3);

    const total = {
      power: base.power + equip.power,
      guard: base.guard + equip.guard,
      wit: base.wit + equip.wit,
      speed: base.speed + equip.speed,
      luck: base.luck + equip.luck,
      hpBonus: equip.hp
    };
    state.player.level = Math.floor(numberOr(state.player.level, 1, 1, 999));
    state.player.maxHp = 100 + total.hpBonus + state.player.level * 10;
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    return total;
  }

  function xpGain(state, amount) {
    state.player.xp += amount;
    while (state.player.xp >= state.player.xpNext) {
      state.player.xp -= state.player.xpNext;
      state.player.level += 1;
      state.player.xpNext = Math.round(state.player.xpNext * 1.22);
      state.player.stats.power += rand(2,3);
      state.player.stats.guard += rand(1,3);
      state.player.stats.wit += rand(1,2);
      state.player.stats.speed += rand(1,2);
      state.player.stats.luck += rand(0,2);
      state.player.hp = state.player.maxHp;
      pushLog(state, `Level up → ${state.player.level}. The warden hardens.`);
    }
  }

  function pushCombat(state, line) {
    if (!state.run) return;
    state.run.combatLog = asArray(state.run.combatLog);
    state.run.combatLog.unshift(String(line || ''));
    state.run.combatLog = state.run.combatLog.slice(0, COMBAT_LOG_STORE_LIMIT);
  }
  function pushLog(state, line) {
    if (!state?.player) return;
    state.player.log = asArray(state.player.log, []);
    state.player.log.unshift(line);
    state.player.log = state.player.log.slice(0, 60);
  }
  function stripHtml(text) {
    return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // v1.3.22f final lock: every Archive, feed, and popup summary should render as clean player-facing text.
  function cleanDisplayText(text, fallback = '') {
    const stripped = stripHtml(text);
    const decoded = stripped
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return decoded || fallback;
  }

  function moneyText(copper) {
    return cleanDisplayText(formatMoney(copper), '0c');
  }

  function runRewardSummaryText(pending) {
    const p = createPendingRunRewards(pending);
    const parts = [];
    if (p.gold) parts.push(moneyText(p.gold));
    if (p.shards) parts.push(`${format(p.shards)} shards`);
    if (p.ember) parts.push(`${format(p.ember)} ember`);
    if (p.xp) parts.push(`${format(p.xp)} XP`);
    if (p.loot.length) parts.push(`${format(p.loot.length)} loot`);
    return parts.length ? parts.join(' • ') : 'no unsecured rewards';
  }

  function runHistoryRewardText(entry) {
    const r = isPlainObject(entry) ? entry : {};
    const saved = cleanDisplayText(r.rewards || '');
    if (saved && saved !== 'no unsecured rewards') return saved;
    const parts = [];
    const gold = sanitizeCurrencyValue(r.gold, 0);
    const shards = sanitizeCurrencyValue(r.shards, 0);
    const ember = sanitizeCurrencyValue(r.ember, 0);
    const xp = sanitizeCurrencyValue(r.xp, 0);
    const lootCount = sanitizeCurrencyValue(r.lootCount, 0);
    if (gold) parts.push(moneyText(gold));
    if (shards) parts.push(`${format(shards)} shards`);
    if (ember) parts.push(`${format(ember)} ember`);
    if (xp) parts.push(`${format(xp)} XP`);
    if (lootCount) parts.push(`${format(lootCount)} loot`);
    return parts.length ? parts.join(' • ') : (saved || 'no unsecured rewards');
  }

  function normalizeRunHistoryReason(reason) {
    const clean = String(reason || 'ended').toLowerCase().trim();
    if (clean === 'extract' || clean === 'extracted' || clean === 'success') return 'extract';
    if (clean === 'defeat' || clean === 'defeated' || clean === 'death' || clean === 'died') return 'defeat';
    return clean || 'ended';
  }

  function safeRunHistoryDate(entry) {
    const r = isPlainObject(entry) ? entry : {};
    return cleanDisplayText(r.date || r.stamp || r.time || '');
  }

  function combatFeedKind(line) {
    const raw = String(line || '');
    const lower = stripHtml(raw).toLowerCase();
    if (!lower) return 'empty';
    if (lower.includes('hardcore') || lower.includes('death') || lower.startsWith('defeated.') || lower.startsWith('defeated in ') || lower.includes('forfeit') || lower.includes('descent claimed') || lower.includes('run failed')) return 'death';
    if (/\b(extract|extracted|extraction|escaped)\b/.test(lower) || lower.includes('extraction secured')) return 'escape';
    if (lower.includes('boss') || lower.includes('warning') || lower.includes('enraged')) return 'boss';
    if (lower.includes('elite') || lower.includes('frenzied') || lower.includes('ironhide') || lower.includes('venomous') || lower.includes('swift') || lower.includes('hollow-eyed') || lower.includes('ash-fed') || lower.includes('gravebound') || lower.includes('wardmarked')) return 'elite';
    if (lower.includes('floor secured') || lower.includes('floor cleared') || lower.includes('floor reached') || lower.startsWith('floor ')) return 'floor';
    if (lower.includes('room secured') || lower.includes('room cleared') || lower.includes('room reached')) return 'milestone';
    if (lower.includes('recovered') || lower.includes('healed') || lower.includes('returns') || lower.includes('regen')) return 'heal';
    if (lower.includes('loot') || lower.includes('found:') || lower.includes('relic') || lower.includes('drop') || lower.includes('cache')) return 'loot';
    if (lower.includes('gold') || lower.includes('shard') || lower.includes('reward')) return 'reward';
    if (lower.includes('you hit') || lower.includes('ashburst') || lower.includes('critical') || lower.includes('strike')) return 'player-hit';
    if (lower.includes('hits for') || lower.includes('misses') || lower.includes('takes') || lower.includes('poison') || lower.includes('bleed') || lower.includes('pierces for') || lower.includes('seeps for') || lower.includes('lingers for')) return 'enemy-hit';
    if (lower.includes('guard') || lower.includes('brace')) return 'guard';
    if (lower.includes('descent continues') || lower.includes('entering ') || lower.includes('contract')) return 'progress';
    return 'action';
  }

  function combatFeedIcon(kind) {
    switch (kind) {
      case 'reward': return '✦';
      case 'loot': return '◈';
      case 'milestone': return '◆';
      case 'floor': return '▲';
      case 'progress': return '➜';
      case 'heal': return '✚';
      case 'boss': return '⚠';
      case 'elite': return '◇';
      case 'death': return '✕';
      case 'escape': return '⇡';
      case 'player-hit': return '⚔';
      case 'enemy-hit': return '!';
      case 'guard': return '▣';
      case 'empty': return '·';
      default: return '•';
    }
  }

  function combatFeedLabel(kind) {
    switch (kind) {
      case 'reward': return 'Reward';
      case 'loot': return 'Loot';
      case 'milestone': return 'Room';
      case 'floor': return 'Floor';
      case 'progress': return 'Progress';
      case 'heal': return 'Recovery';
      case 'boss': return 'Boss';
      case 'elite': return 'Elite';
      case 'death': return 'Defeat';
      case 'escape': return 'Extract';
      case 'player-hit': return 'Strike';
      case 'enemy-hit': return 'Damage';
      case 'guard': return 'Guard';
      case 'empty': return 'No Drop';
      default: return 'Action';
    }
  }

  function renderCombatFeedLine(line) {
    const raw = String(line || '');
    const kind = combatFeedKind(raw);
    let normalized = escapeHtml(cleanDisplayText(raw))
      .replace(/\(\+gold charm\)/gi, '<span class="feed-chip feed-chip-gold">Gold Charm</span>')
      .replace(/\+(\d+)\s*gold/gi, '<span class="feed-chip feed-chip-gold">+$1 gold</span>')
      .replace(/\+(\d+)\s*shards?/gi, '<span class="feed-chip feed-chip-shard">+$1 shards</span>')
      .replace(/recovered\s+(\d+)\s+hp/gi, '<span class="feed-chip feed-chip-heal">recovered $1 HP</span>')
      .replace(/healed\s+(\d+)/gi, '<span class="feed-chip feed-chip-heal">healed $1</span>')
      .replace(/returns\s+(\d+)/gi, '<span class="feed-chip feed-chip-heal">returns $1</span>')
      .replace(/hits for\s+(\d+)/gi, '<span class="feed-chip feed-chip-hurt">hits for $1</span>')
      .replace(/you hit/gi, '<span class="feed-chip feed-chip-player">You hit</span>')
      .replace(/ashburst/gi, '<span class="feed-chip feed-chip-skill">Ashburst</span>')
      .replace(/critical/gi, '<span class="feed-chip feed-chip-crit">Critical</span>')
      .replace(/seeps for\s+(\d+)/gi, '<span class="feed-chip feed-chip-hurt">seeps for $1</span>')
      .replace(/lingers for\s+(\d+)/gi, '<span class="feed-chip feed-chip-hurt">lingers for $1</span>')
      .replace(/pierces for\s+(\d+)/gi, '<span class="feed-chip feed-chip-hurt">pierces for $1</span>')
      .replace(/Boss Spoils/gi, '<span class="feed-chip feed-chip-boss">Boss Spoils</span>')
      .replace(/Elite Spoils/gi, '<span class="feed-chip feed-chip-elite">Elite Spoils</span>')
      .replace(/Room Reward/gi, '<span class="feed-chip feed-chip-floor">Room Reward</span>')
      .replace(/Milestone Reward/gi, '<span class="feed-chip feed-chip-floor">Milestone Reward</span>')
      .replace(/Mythic Find/gi, '<span class="feed-chip rarity-mythic">Mythic Find</span>')
      .replace(/Boss relic/gi, '<span class="feed-chip feed-chip-boss">Boss relic</span>')
      .replace(/Bounty relic/gi, '<span class="feed-chip feed-chip-boss">Bounty relic</span>')
      .replace(/Elite warning/gi, '<span class="feed-chip feed-chip-elite feed-chip-threat">Elite warning</span>')
      .replace(/Elite read/gi, '<span class="feed-chip feed-chip-elite feed-chip-read">Elite read</span>')
      .replace(/Elite plan/gi, '<span class="feed-chip feed-chip-elite feed-chip-read">Elite plan</span>')
      .replace(/Dangerous elite defeated/gi, '<span class="feed-chip feed-chip-elite">Dangerous elite defeated</span>')
      .replace(/Elite drop/gi, '<span class="feed-chip feed-chip-elite">Elite drop</span>')
      .replace(/Elite bonus loot/gi, '<span class="feed-chip feed-chip-elite">Elite bonus loot</span>')
      .replace(/Frenzied/gi, '<span class="feed-chip feed-chip-elite feed-mod-frenzied">Frenzied</span>')
      .replace(/Ironhide/gi, '<span class="feed-chip feed-chip-elite feed-mod-ironhide">Ironhide</span>')
      .replace(/Venomous/gi, '<span class="feed-chip feed-chip-elite feed-mod-venomous">Venomous</span>')
      .replace(/Swift/gi, '<span class="feed-chip feed-chip-elite feed-mod-swift">Swift</span>')
      .replace(/Hollow-Eyed/gi, '<span class="feed-chip feed-chip-elite feed-mod-hollow-eyed">Hollow-Eyed</span>')
      .replace(/Ash-fed/gi, '<span class="feed-chip feed-chip-elite feed-mod-ash-fed">Ash-fed</span>')
      .replace(/Gravebound/gi, '<span class="feed-chip feed-chip-elite feed-mod-gravebound">Gravebound</span>')
      .replace(/Wardmarked/gi, '<span class="feed-chip feed-chip-elite feed-mod-wardmarked">Wardmarked</span>')
      .replace(/Floor cleared/gi, '<span class="feed-chip feed-chip-floor">Floor cleared</span>')
      .replace(/Floor secured/gi, '<span class="feed-chip feed-chip-floor">Floor secured</span>')
      .replace(/Room cleared/gi, '<span class="feed-chip feed-chip-floor">Room cleared</span>')
      .replace(/Room secured/gi, '<span class="feed-chip feed-chip-floor">Room secured</span>')
      .replace(/\bUnsecured\b/gi, '<span class="feed-chip feed-chip-unsecured">Unsecured</span>')
      .replace(/\b(Extraction|Extracted|Extract)\b/gi, match => `<span class="feed-chip feed-chip-extract">${match}</span>`)
      .replace(/Death forfeits(?: all)?(?: unextracted)? rewards?/gi, match => `<span class="feed-chip feed-chip-death">${match}</span>`)
      .replace(/Death forfeits loot/gi, '<span class="feed-chip feed-chip-death">Death forfeits loot</span>')
      .replace(/Hardcore/gi, '<span class="feed-chip feed-chip-death">Hardcore</span>');
    return `<div class="log-line small combat-feed-line feed-${kind}">
      <span class="feed-icon">${combatFeedIcon(kind)}</span>
      <div class="feed-copy">
        <div class="feed-kicker">${combatFeedLabel(kind)}</div>
        <div class="feed-body">${normalized}</div>
      </div>
    </div>`;
  }
  function spawnQuestLore(state, text) {
    if (!state) return;
    state.archive = asArray(state.archive, []);
    state.archive.unshift({ stamp: new Date().toLocaleString(), text });
    state.archive = state.archive.slice(0, 40);
  }

  function startRun(state, startDepth = null) {
    if (!isPlainObject(state) || !isPlainObject(state.player)) return false;
    const run = ensureRunShell(state);
    if (run.active && run.monster) {
      state.screen = 'run';
      return true;
    }
    if (run.active && !run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete active descent before starting a new descent.');
    }
    calcDerived(state);
    const sink = ensureGoldSinkState(state);
    const hasExplicitStart = startDepth !== null && startDepth !== undefined;
    const requestedDepth = hasExplicitStart
      ? progressDepthValue(startDepth, 1)
      : defaultRunStartDepth(state);
    const allowedCharterStart = requestedDepth > 1 && canUseCharterStart(state, requestedDepth);
    const allowedSafeReturnStart = !hasExplicitStart && canUseSafeReturnStart(state, requestedDepth);
    const actualStartDepth = requestedDepth === 1 || allowedCharterStart || allowedSafeReturnStart ? requestedDepth : 1;
    run.active = true;
    run.floor = actualStartDepth;
    run.startedFromCharter = allowedCharterStart;
    run.charterStartFloor = allowedCharterStart ? run.floor : 0;
    run.setBonuses = { ashboundLethalUsed: false, bellforgeHits: 0 };
    run.chain = 0;
    run.roomsCleared = 0;
    run.encounters = 0;
    run.goldBonusPct = Math.floor(numberOr(sink.nextRunGoldBonusPct, 0, 0, 50));
    sink.nextRunGoldBonusPct = 0;
    run.pendingRewards = createPendingRunRewards();
    run.zone = zoneName(run.floor);
    run.danger = dangerRatingForDepth(run.floor);
    run.combatLog = [];
    if (!state.ui) state.ui = { combatLogExpanded:false };
    state.ui.combatLogExpanded = false;
    // Hollow Stair entry preserves current HP; only clamp invalid saved/runtime values.
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 1, state.player.maxHp));
    nextEncounter(state);
    if (!state.run.monster) {
      recoverRunToTown(state, 'The Hollow Stair failed to raise a threat; returned safely to Lowfire.');
      return false;
    }
    state.screen = 'run';
    pushLog(state, `Entered ${state.run.zone}. ${runDepthLabel(state)}. The Hollow Stair seals behind you.`);
    if (state.run.goldBonusPct > 0) pushLog(state, `Small Debt Charm active: +${state.run.goldBonusPct}% gold this descent.`);
    return true;
  }


  function startCharterRun(state, depth) {
    const startDepth = normalizeCharterMilestoneDepth(depth);
    if (state.run?.active) {
      state.screen = 'run';
      return pushLog(state, 'A descent is already active. Continue it before using a charter.');
    }
    const alreadyOwned = ownsPermanentCharter(state, startDepth);
    if (!alreadyOwned && !isCharterDepthUnlocked(state, startDepth)) return pushLog(state, 'That Hollow Stair Charter is not unlocked yet.');
    const cost = charterStartCost(startDepth);
    if (!alreadyOwned) {
      if (state.player.gold < cost) return pushLog(state, `Need ${formatMoney(cost)} to permanently buy the ${charterDepthLabel(startDepth)} charter.`);
      state.player.gold -= cost;
      grantPermanentCharter(state, startDepth);
      pushLog(state, `Permanent Hollow Stair Charter bought: ${charterDepthLabel(startDepth)} for ${formatMoney(cost)}.`);
    }
    startRun(state, startDepth);
    pushLog(state, `Hollow Stair Charter used: bypassed the upper stair and entered at ${charterDepthLabel(startDepth)}.`);
  }

  function zoneName(floor) {
    return districtByDepth(floor).name;
  }

  function nextEncounter(state) {
    const run = ensureRunShell(state);
    if (!run.active) return;
    run.floor = progressDepthValue(run.floor, defaultRunStartDepth(state));
    run.zone = zoneName(run.floor);
    run.monster = generateMonster(run.floor, state);
    if (!run.monster) {
      recoverRunToTown(state, 'Recovered from a failed encounter roll and returned to Lowfire.');
      return;
    }
    state.run.encounters += 1;
    state.run.choices = ['attack','guard','skill','extract'];
    state.player.discoveredMonsters = asArray(state.player.discoveredMonsters, []);
    if (!state.player.discoveredMonsters.includes(state.run.monster.name)) state.player.discoveredMonsters.push(state.run.monster.name);
    const monster = state.run.monster;
    if (monster.tier === 'Boss') {
      pushCombat(state, `Boss pressure locks the stair: ${monster.name}.`);
    } else if (monster.tier === 'Elite') {
      pushCombat(state, `Elite pressure rises: ${monster.name}.`);
    } else {
      pushCombat(state, `Encounter: ${monster.name} rises in ${state.run.zone}.`);
    }
    const modifiers = eliteModifiersForMonster(monster);
    if (monster.tier === 'Elite' && modifiers.length) {
      pushCombat(state, `Elite read: ${eliteModifierNames(modifiers)}. ${eliteModifierDangerSummary(modifiers)}`);
      pushCombat(state, `Elite plan: ${eliteModifierPlanLine(modifiers)}`);
    }
  }

  function damageRoll(offense, defense, swing = 1) {
    return Math.max(1, Math.round((offense * swing) - defense * 0.33 + rand(-4, 5)));
  }

  function combatAction(state, action) {
    const result = { saveNow: false, fullRender: false };
    ensureRunShell(state);
    action = String(action || '');
    if (!CORE_COMBAT_ACTIONS.includes(action)) return result;
    if (!hasActiveCombat(state)) {
      if (state?.run?.active && !state.run.monster) {
        recoverRunToTown(state, 'Recovered from an incomplete combat state and returned to Lowfire.');
        result.saveNow = true;
        result.fullRender = true;
      }
      return result;
    }
    const monster = state.run.monster;
    if (numberOr(monster.hp, 0, 0, Number.MAX_SAFE_INTEGER) <= 0) {
      winEncounter(state);
      result.saveNow = true;
      return result;
    }
    const stats = calcDerived(state);
    let playerSwing = 1;
    let playerShield = 0;

    if (action === 'attack') {
      playerSwing = 1.0 + stats.speed * 0.008;
      if (Math.random() < (state.player.crit + stats.luck * 0.18) / 100) playerSwing += 0.7;
      if (hasEquippedSetBonus(state, 'veyruhn_bellforge', 3) && monster.tier === 'Boss') playerSwing += 0.14;
      if (hasEquippedSetBonus(state, 'veyruhn_bellforge', 5)) {
        const setRun = ensureRunSetBonusState(state);
        setRun.bellforgeHits += 1;
        if (setRun.bellforgeHits % 5 === 0) {
          playerSwing += 0.55;
          pushCombat(state, 'Bellforge toll rings: the fifth strike lands heavy.');
        }
      }
      if (consumeDebtbrandCombatBoost(state)) playerSwing += 0.20;
      const dealt = damageRoll(stats.power, monster.guard, playerSwing);
      monster.hp -= dealt;
      pushCombat(state, `You strike for ${dealt}.`);
    } else if (action === 'guard') {
      playerShield = Math.round(stats.guard * 0.65 + stats.wit * 0.25);
      const recovered = Math.max(1, Math.round(stats.guard * 0.09));
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);
      pushCombat(state, `You brace and recover ${recovered} HP.`);
    } else if (action === 'skill') {
      if (state.player.ember <= 0) {
        pushCombat(state, 'No ember left. Ashburst fizzles.');
      } else {
        state.player.ember -= 1;
        const skillSwing = 1.45 + (hasEquippedSetBonus(state, 'veyruhn_bellforge', 3) && monster.tier === 'Boss' ? 0.12 : 0) + (consumeDebtbrandCombatBoost(state) ? 0.18 : 0);
        const dealt = damageRoll(stats.power + stats.wit * 0.7, monster.guard * 0.6, skillSwing);
        monster.hp -= dealt;
        const siphon = Math.max(1, Math.round(stats.wit * 0.18));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + siphon);
        pushCombat(state, `Ashburst burns for ${dealt} and returns ${siphon} HP.`);
      }
    } else if (action === 'extract') {
      const odds = clamp(38 + stats.speed + stats.luck - threatDepthFromDepth(state.run.floor) * 2, 10, 90);
      if (Math.random() * 100 <= odds) {
        pushCombat(state, `You extract safely from ${state.run.zone} at ${runDepthLabel(state)}.`);
        finishRun(state, 'extract');
        result.saveNow = true;
        result.fullRender = true;
        return result;
      } else {
        pushCombat(state, 'Extraction failed. The haul stays unsecured; guard or finish the fight.');
      }
    } else {
      return result;
    }

    if (monster.hp <= 0) {
      if (hasEliteModifier(monster, 'Gravebound') && !monster.reviveUsed) {
        monster.reviveUsed = true;
        monster.hp = Math.max(1, Math.round(monster.maxHp * 0.22));
        pushCombat(state, `Gravebound refuses death. ${monster.name} rises again.`);
      } else {
        winEncounter(state);
        result.saveNow = true;
        return result;
      }
    }

    if (hasEliteModifier(monster, 'Ash-fed') && !monster.ashFedTriggered && monster.hp <= monster.maxHp * 0.35) {
      monster.ashFedTriggered = true;
      monster.power = Math.round(monster.power * 1.06);
      pushCombat(state, `Ash-fed surge. ${monster.name} burns hotter near defeat.`);
    }

    if (hasEquippedSetBonus(state, 'ashbound_warden', 3) && monster.tier === 'Boss') {
      playerShield += Math.max(2, Math.round(stats.guard * 0.22));
    }
    const swing = monster.tier === 'Boss' ? 1.3 : monster.tier === 'Elite' ? 1.16 : 1;
    const incoming = Math.max(1, damageRoll(monster.power, stats.guard + playerShield, swing));
    const dodged = Math.random() * 100 < clamp(state.player.dodge + stats.speed * 0.25, 3, 38);
    if (dodged) {
      pushCombat(state, `${monster.name} misses through the gloom.`);
    } else {
      state.player.hp -= incoming;
      pushCombat(state, `${monster.name} hits for ${incoming}.`);
      if (hasEliteModifier(monster, 'Venomous')) {
        const venom = Math.max(1, Math.round(threatDepthFromDepth(monster.level) * 0.7));
        const venomNoted = asArray(state.run.combatLog, []).some(line => String(line).includes('Venomous poison follows clean hits'));
        state.player.hp -= venom;
        pushCombat(state, venomNoted ? `Venom seeps for ${venom}.` : `Venom seeps for ${venom}. Venomous poison follows clean hits.`);
      }
      if (hasEliteModifier(monster, 'Hollow-Eyed') && Math.random() < 0.18) {
        const pierce = Math.max(2, Math.round(threatDepthFromDepth(monster.level) * 1.1));
        const hollowNoted = asArray(state.run.combatLog, []).some(line => String(line).includes('Hollow-Eyed can pierce guard'));
        state.player.hp -= pierce;
        pushCombat(state, hollowNoted ? `Hollow-Eyed precision pierces for ${pierce}.` : `Hollow-Eyed precision pierces for ${pierce}. Hollow-Eyed can pierce guard.`);
      }
    }

    if (monster.skill === 'Burn' && Math.random() < 0.2) {
      const dot = Math.round(threatDepthFromDepth(monster.level) * 1.2);
      state.player.hp -= dot;
      pushCombat(state, `Burn lingers for ${dot}.`);
    }

    if (state.player.hp <= 0) {
      if (tryAshboundLethalWard(state)) {
        result.saveNow = true;
      } else {
        defeat(state);
        result.saveNow = true;
        result.fullRender = true;
      }
    }
    return result;
  }

  function winEncounter(state) {
    ensureRunShell(state);
    const m = state.run.monster;
    if (!m) {
      recoverRunToTown(state, 'Recovered from a cleared encounter with no active threat.');
      return;
    }
    const source = m.tier === 'Boss' ? 'boss' : m.tier === 'Elite' ? 'elite' : 'normal';
    const eliteModifiers = source === 'elite' ? eliteModifiersForMonster(m) : [];
    const eliteReward = source === 'elite' ? normalizeEliteRewardProfile(m.eliteReward, eliteModifiers, state.run.floor) : null;
    const runGoldBonus = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    const debtbrandGoldBonus = hasEquippedSetBonus(state, 'lowfire_debtbrand', 2) ? 7 : 0;
    const eliteContractGoldBonus = source === 'elite' ? Math.round(activeEliteContractRisk(state).coinBonus * 100) : 0;
    const totalGoldBonus = runGoldBonus + debtbrandGoldBonus + eliteContractGoldBonus;
    const earnedGold = sanitizeCurrencyValue(totalGoldBonus > 0 ? Math.max(1, Math.round(m.rewardGold * (1 + totalGoldBonus / 100))) : m.rewardGold, 0);
    addPendingRunGold(state, earnedGold);
    addPendingRunShards(state, m.rewardShard);
    addPendingRunXp(state, m.rewardXp);
    addPendingRunKill(state, 1);
    state.run.roomsCleared += 1;
    state.run.chain += 1;
    const victoryLead = source === 'boss' ? 'Boss cleared' : source === 'elite' ? 'Elite defeated' : 'Room secured';
    const rewardLead = source === 'boss' ? 'Boss Spoils' : source === 'elite' ? 'Elite Spoils' : 'Room Reward';
    const victoryVerb = source === 'boss' ? 'cleared' : source === 'elite' ? 'defeated' : 'secured';
    pushCombat(state, `${rewardLead}: ${m.name} ${victoryVerb}. Unsecured +${formatMoney(earnedGold)}, +${m.rewardShard} shards, +${format(m.rewardXp)} XP${runGoldBonus > 0 ? ' (+gold charm)' : ''}${debtbrandGoldBonus > 0 ? ' (+Debtbrand)' : ''}${eliteContractGoldBonus > 0 ? ' (+contract)' : ''}${eliteReward?.modifierCount ? ' (+elite risk)' : ''}.`);
    pushLog(state, `${victoryLead}: ${m.name} at ${runDepthLabel(state)}.`);
    updateQuest(state, 'kill', 1);

    const lootRolls = source === 'boss' ? 2 : 1;
    let drops = 0;
    for (let i = 0; i < lootRolls; i++) {
      if (!shouldDropLoot(state.run.floor, source, i, state)) continue;
      const loot = shouldDropMythicSetPiece(state, source, state.run.floor)
        ? generateMythicSetPiece(state.run.floor, source, state)
        : generateGear(pick(SLOT_ORDER), threatDepthFromDepth(state.run.floor) + rand(0, 1), { source, depthRaw: state.run.floor, state });
      addPendingRunLoot(state, loot);
      drops += 1;
      const lootLabel = source === 'boss' ? 'Boss Spoils' : source === 'elite' ? 'Elite Spoils' : 'Room Reward loot';
      const lootLine = loot.rarity === 'mythic'
        ? `Mythic Find from ${lootLabel}`
        : lootLabel;
      pushCombat(state, `${lootLine}: ${loot.name} (${loot.rarity}) added to the unsecured haul.`);
      updateQuest(state, 'loot', 1);
    }
    if (source === 'elite' && eliteReward?.modifierCount) {
      const bonusPct = Math.round(eliteReward.bonusLootChance * 100);
      pushCombat(state, `Elite Spoils: elite risk adds a +${bonusPct}% bonus loot roll.`);
      if (Math.random() < eliteReward.bonusLootChance) {
        const bonusLoot = generateGear(pick(SLOT_ORDER), threatDepthFromDepth(state.run.floor) + rand(0, 1), { source:'elite', depthRaw:state.run.floor, state });
        bonusLoot.tags = asArray(bonusLoot.tags, []).concat(['elite-risk-bonus']);
        addPendingRunLoot(state, bonusLoot);
        drops += 1;
        pushCombat(state, `Elite Spoils bonus loot: ${bonusLoot.name} (${bonusLoot.rarity}) added to the unsecured haul.`);
        updateQuest(state, 'loot', 1);
      }
    }
    if (source === 'boss') {
      const sink = ensureGoldSinkState(state);
      if (sink.nextBossBounty) {
        const bountyDepth = threatDepthFromDepth(state.run.floor);
        const forcedRarity = bountyDepth >= 50 ? 'legendary' : bountyDepth >= 30 ? 'epic' : 'rare';
        const bounty = generateGear(pick(SLOT_ORDER), bountyDepth + 1, { source:'boss', forcedRarity });
        bounty.name = `Bounty ${bounty.name}`;
        bounty.summary = 'Extra boss relic paid for by a Sootveil bounty writ.';
        bounty.tags = asArray(bounty.tags, []).concat(['bounty-writ']);
        addPendingRunLoot(state, bounty);
        sink.nextBossBounty = false;
        drops += 1;
        pushCombat(state, `Boss Spoils bounty relic: ${bounty.name} (${bounty.rarity}) added to the unsecured haul.`);
        updateQuest(state, 'loot', 1);
      }
    }
    if (!drops && source === 'normal') pushCombat(state, 'No gear found. You pocket the coin and move on.');
    if (!drops && source === 'elite') pushCombat(state, 'Elite Spoils: no gear found. Coin, shards, and XP stay in the unsecured haul.');

    if (source === 'elite' && !m.eliteContractCounted) {
      m.eliteContractCounted = true;
      recordEliteContractKill(state);
    }

    const pending = ensurePendingRunRewards(state);
    const hasMeaningfulGear = state.player.inventory.some(item => item && !item.tags?.includes('starter'))
      || pending.loot.some(item => item && !item.tags?.includes('starter'))
      || Object.values(state.player.equipment || {}).some(item => item && !item.tags?.includes('starter'));
    const currentThreatDepth = threatDepthFromDepth(state.run.floor);
    if (currentThreatDepth >= 4 && currentThreatDepth <= 5 && !state.player.earlyAidGiven && !hasMeaningfulGear) {
      const aidSlot = pick(['weapon','offhand','armor','helm','boots','gloves']);
      const aid = generateGear(aidSlot, Math.max(1, currentThreatDepth), { source:'normal', forcedRarity:'common' });
      aid.value = Math.max(aid.value, coins(0, 1, 80));
      aid.tags = asArray(aid.tags, []).concat(['early-aid-cache']);
      addPendingRunLoot(state, aid);
      pushCombat(state, `Room Reward cache: ${aid.name} added to the unsecured haul.`);
      pushLog(state, `A last-resort Lowfire cache produced basic gear: ${aid.name}.`);
      updateQuest(state, 'loot', 1);
    }

    const beforeDepth = depthStageValue(state.run.floor);
    state.run.floor = beforeDepth + 1;
    state.run.zone = zoneName(state.run.floor);
    state.run.danger = dangerRatingForDepth(state.run.floor);
    state.player.depth = Math.max(state.player.depth, state.run.floor);
    if (state.run.floor % 4 === 0) addPendingRunEmber(state, 1);

    const enteredDistrict = districtByDepth(state.run.floor);
    if (isDistrictEntryDepth(state.run.floor, enteredDistrict)) {
      pushCombat(state, `Entering ${enteredDistrict.name}: ${districtArrivalLine(enteredDistrict)}`);
    }
    pushCombat(state, `Descent continues: ${runDepthLabel(state)}.`);
    const milestone = depthMilestoneNotice(state.run.floor);
    if (milestone) pushCombat(state, milestone);
    applyRoomMilestoneReward(state, beforeDepth, state.run.floor);
    applyFloorMilestoneReward(state, beforeDepth, state.run.floor);

    nextEncounter(state);
  }

  function updateQuest(state, type, amount) {
    if (state?.run?.active) {
      addPendingQuestProgress(state, type, amount);
      return;
    }
    applyQuestProgressNow(state, type, amount);
  }

  function applyQuestProgressNow(state, type, amount) {
    const progress = sanitizeCurrencyValue(amount, 0);
    if (progress <= 0) return;
    state.player.quests.forEach(q => {
      if (q.type === type && q.progress < q.goal) {
        q.progress = Math.min(q.goal, q.progress + progress);
        if (q.progress >= q.goal) rewardQuest(state, q);
      }
    });
  }

  function rewardQuest(state, q) {
    if (q.claimed) return;
    q.claimed = true;
    if (q.id === 'q1') { addPlayerGold(state, coins(0, 2, 50)); state.player.ember += 1; }
    if (q.id === 'q2') { state.player.forgeSpark += 1; }
    if (q.id === 'q3') { state.player.shards += 80; }
    pushLog(state, `Objective complete: ${q.title}. Reward: ${q.reward}.`);
  }

  function finishRun(state, reason) {
    ensureRunShell(state);
    let runResultDetail = '';
    const endedAtFloor = progressDepthValue(state.run.floor, state.player?.returnDepth || 1);
    const endedAtZone = state.run.zone || currentStagingDistrict(state).name;
    const endedRunLabel = runDepthLabel(state);
    const nextReturnDepth = reason === 'extract'
      ? progressDepthValue(endedAtFloor, 1)
      : hardcoreDeathCheckpointDepth(state, endedAtFloor);
    const returnLabel = hardcoreDepthReturnLabel(nextReturnDepth);
    const rewardSnapshot = runHistoryRewardSnapshot(state.run.pendingRewards);
    if (reason === 'extract') {
      const secured = bankPendingRunRewards(state);
      const securedText = cleanDisplayText(secured, 'no unsecured rewards');
      runResultDetail = `Extraction Haul secured: ${securedText}. Lowfire marks the run complete. Next descent can start from ${returnLabel}.`;
      pushCombat(state, `Extraction Haul secured. Banked: ${securedText}.`);
      pushLog(state, `Extraction Haul secured. Banked: ${securedText}. Next start: ${returnLabel}.`);
      showExtractionPopup(`${extractionPopupSummary(rewardSnapshot, securedText)} • Next: ${returnLabel}`);
      recordSafeExtractionProgress(state);
    } else if (reason === 'defeat') {
      const lost = discardPendingRunRewards(state);
      const lostText = cleanDisplayText(lost, 'no unsecured rewards');
      runResultDetail = `The run ends here. Lost unsecured rewards: ${lostText}. Restart: ${returnLabel}. Banked gear and wallet stayed safe.`;
      pushLog(state, `Run failed. Lost unsecured rewards: ${lostText}. Restart: ${returnLabel}. Banked gear and wallet stayed safe.`);
      showDefeatPopup(`Run ended. Lost unsecured: ${lostText}. Restart: ${returnLabel}.`);
    } else {
      clearPendingRunRewards(state);
      runResultDetail = 'Descent ended without unsecured rewards.';
    }
    const summaryLine = extractionSummaryLine(state, reason);
    if (summaryLine) pushLog(state, summaryLine);
    state.player.returnDepth = nextReturnDepth;
    if (reason === 'extract') state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth || 1, nextReturnDepth);
    state.run.active = false;
    state.run.monster = null;
    state.run.choices = [];
    state.run.chain = 0;
    state.run.goldBonusPct = 0;
    state.player.debtbrandBoostReady = false;
    state.run.startedFromCharter = false;
    state.run.charterStartFloor = 0;
    state.player.runHistory.unshift({
      floor: endedAtFloor,
      reason,
      zone: endedAtZone,
      runLabel: endedRunLabel,
      detail: runResultDetail,
      summary: summaryLine || '',
      restartDepth: nextReturnDepth,
      restartLabel: returnLabel,
      checkpointLabel: returnLabel,
      rewards: rewardSnapshot.rewards,
      gold: rewardSnapshot.gold,
      shards: rewardSnapshot.shards,
      ember: rewardSnapshot.ember,
      xp: rewardSnapshot.xp,
      kills: rewardSnapshot.kills,
      eliteMarks: rewardSnapshot.eliteMarks,
      lootCount: rewardSnapshot.lootCount,
      questProgress: rewardSnapshot.questProgress,
      lootPreview: rewardSnapshot.lootPreview,
      date: new Date().toLocaleString()
    });
    state.player.runHistory = state.player.runHistory.slice(0, 12);
    state.screen = 'town';
  }

  function defeat(state) {
    state.player.hp = Math.round(state.player.maxHp * 0.55);
    pushCombat(state, 'The run ends here. Lowfire records the floor. Unsecured rewards were lost; banked gear and wallet stayed safe.');
    spawnQuestLore(state, `The Lowfire bells rang for a warden lost at ${runDepthLabel(state)} — ${state.run.zone}.`);
    finishRun(state, 'defeat');
  }

  function equipItem(state, id, silent = false) {
    const idx = state.player.inventory.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = normalizeItem(state.player.inventory[idx]);
    if (!item) return;
    state.player.inventory[idx] = item;
    const conflicts = equipmentConflictSlots(item.slot);
    conflicts.forEach(slot => {
      const prev = state.player.equipment[slot];
      if (prev && prev.id !== item.id) state.player.inventory.push(prev);
      delete state.player.equipment[slot];
    });
    state.player.equipment[item.slot] = item;
    state.player.inventory.splice(idx, 1);
    calcDerived(state);
    if (!silent) {
      pushLog(state, `Equipped ${item.name}.`);
      updateQuest(state, 'equip', 1);
    }
  }

  function sellItem(state, id) {
    const idx = state.player.inventory.findIndex(x => x.id === id);
    if (idx === -1) return 0;
    const item = state.player.inventory[idx];
    const bonusUsed = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
    const paid = sellValueWithGoldSink(state, item, true);
    consumeJunkSaleBonus(state, bonusUsed);
    addPlayerGold(state, paid);
    state.player.inventory.splice(idx, 1);
    pushLog(state, `Sold ${item.name} for ${formatMoney(paid)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return paid;
  }

  function sellAllQuickSafeGear(state) {
    const inventory = asArray(state.player.inventory, []);
    const keep = [];
    let soldCount = 0;
    let paidTotal = 0;
    let bonusUsed = false;
    inventory.forEach(item => {
      if (canQuickSellItem(state, item)) {
        soldCount += 1;
        const useBonus = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
        paidTotal += sellValueWithGoldSink(state, item, useBonus);
        bonusUsed = bonusUsed || useBonus;
      } else {
        keep.push(item);
      }
    });
    if (!soldCount) return { count: 0, paid: 0 };
    consumeJunkSaleBonus(state, bonusUsed);
    state.player.inventory = keep;
    addPlayerGold(state, paidTotal);
    pushLog(state, `Sold ${soldCount} junk-marked gear pieces for ${formatMoney(paidTotal)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return { count: soldCount, paid: paidTotal };
  }

  function sellAllGear(state) {
    const inventory = asArray(state.player.inventory, []);
    const keep = [];
    let soldCount = 0;
    let paidTotal = 0;
    let bonusUsed = false;
    inventory.forEach(item => {
      if (canSellAllGearItem(state, item)) {
        soldCount += 1;
        const useBonus = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
        paidTotal += sellValueWithGoldSink(state, item, useBonus);
        bonusUsed = bonusUsed || useBonus;
      } else {
        keep.push(item);
      }
    });
    if (!soldCount) return { count: 0, paid: 0 };
    consumeJunkSaleBonus(state, bonusUsed);
    state.player.inventory = keep;
    addPlayerGold(state, paidTotal);
    pushLog(state, `Sold all unequipped sellable gear: ${soldCount} pieces for ${formatMoney(paidTotal)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return { count: soldCount, paid: paidTotal };
  }

  function hasNonStarterWeapon(state) {
    const equipped = state.player.equipment && state.player.equipment.weapon;
    const inventoryHit = state.player.inventory.some(item => item && item.slot === 'weapon' && !(item.tags || []).includes('starter'));
    return !!(equipped && !(equipped.tags || []).includes('starter')) || inventoryHit;
  }

  function merchantGear(slot, level, rarity, tag, rawDepth = level) {
    const itemLevel = Math.max(1, Math.floor(numberOr(level, 1, 1, 999999)));
    const item = generateGear(slot, itemLevel, { source:'merchant', forcedRarity:rarity, depthRaw:rawDepth });
    item.shopRole = tag || 'stock';
    item.summary = tag === 'core'
      ? 'Core shop stock: practical, affordable, and meant to fill weak equipment slots.'
      : tag === 'upgrade'
      ? 'Featured upgrade: stronger than baseline stock, priced to make the choice matter.'
      : tag === 'rare'
      ? 'Rare shelf item: expensive, uncommon, and not guaranteed to appear.'
      : item.summary;
    return item;
  }

  function buildMerchantStock(state) {
    const rawDepth = Math.max(1, Math.floor(numberOr(state?.player?.depth || state?.player?.level || 1, 1, 1, 999999)));
    const shopThreatDepth = threatDepthFromDepth(rawDepth);
    const stock = [];
    const coreSlots = ['weapon','armor','offhand','boots','gloves','helm'];
    const accessorySlots = ['ring','amulet','cloak','charm'];
    const used = new Set();
    const takeSlot = (pool) => {
      const options = pool.filter(slot => !used.has(slot));
      const slot = pick(options.length ? options : pool);
      used.add(slot);
      return slot;
    };

    // Emergency shop fairness: if the player reaches floor 4 without a real weapon, show one.
    if (rawDepth >= 4 && !hasNonStarterWeapon(state)) {
      stock.push(merchantGear('weapon', shopThreatDepth, 'common', 'core', rawDepth));
      used.add('weapon');
    }

    while (stock.length < 2) stock.push(merchantGear(takeSlot(coreSlots), shopThreatDepth + rand(-1, 0), 'common', 'core', rawDepth));

    stock.push(merchantGear(takeSlot(coreSlots), shopThreatDepth + rand(0, 1), 'uncommon', 'upgrade', rawDepth));

    const flexRarity = Math.random() < 0.7 ? 'common' : 'uncommon';
    stock.push(merchantGear(takeSlot(accessorySlots.concat(coreSlots)), shopThreatDepth + rand(-1, 1), flexRarity, 'stock', rawDepth));

    if (Math.random() < 0.10) stock.push(merchantGear(takeSlot(coreSlots.concat(accessorySlots)), shopThreatDepth + rand(0, 2), 'rare', 'rare', rawDepth));

    return stock.slice(0, 5);
  }


  function findCursedRerollTarget(state) {
    const items = asArray(state.player.inventory, [])
      .filter(item => item && item.kind !== 'special' && item.slot && !item.locked && !item.favorite && !item.protected && !itemIsEquipped(state, item));
    if (!items.length) return null;
    return items.slice().sort((a, b) => (a.rating || 0) - (b.rating || 0) || (a.level || 0) - (b.level || 0))[0];
  }

  function buyDistrictWare(state, id) {
    const ware = unlockedDistrictWares(state).find(entry => entry.id === id);
    if (!ware) return pushLog(state, 'That district ware is not unlocked yet.');
    const blocked = goldSinkCannotBuyReason(state, ware);
    if (blocked) return pushLog(state, `${ware.name}: ${blocked}.`);

    const sink = ensureGoldSinkState(state);
    const paidCost = merchantCostWithSetBonus(state, ware.cost);
    if (state.player.gold < paidCost) return pushLog(state, `Not enough coin for ${ware.name}.`);
    state.player.gold = Math.max(0, state.player.gold - paidCost);
    grantDebtbrandMerchantBoost(state);

    if (ware.id === 'junkers_token') {
      sink.junkSaleBonusCharges = Math.min(3, sink.junkSaleBonusCharges + 1);
      pushLog(state, `Bought ${ware.name}. Your next junk/common sell action pays more.`);
      return;
    }

    if (ware.id === 'small_debt_charm') {
      sink.nextRunGoldBonusPct = 10;
      pushLog(state, `Bought ${ware.name}. Your next descent earns +10% gold.`);
      return;
    }

    if (ware.id === 'black_market_key') {
      const rawDepth = Math.max(1, reachedDistrictFloor(state));
      const shopThreatDepth = threatDepthFromDepth(rawDepth);
      const shelfRarity = rawDepth >= 25 ? 'epic' : 'rare';
      const item = merchantGear(pick(SLOT_ORDER), shopThreatDepth + rand(0, 2), shelfRarity, 'rare', rawDepth);
      item.name = `Black Market ${item.name}`;
      item.value = Math.max(coins(0, 75, 0), Math.round(item.value * 0.82));
      item.summary = 'Unlocked by a Black Market Key. Stronger shelf stock, still priced like a risk.';
      item.tags = asArray(item.tags, []).concat(['black-market']);
      state.merchantStock.unshift(item);
      state.merchantStock = state.merchantStock.slice(0, 6);
      pushLog(state, `Bought ${ware.name}. A shady item was added to the merchant shelf.`);
      return;
    }

    if (ware.id === 'cursed_reroll_token') {
      const target = findCursedRerollTarget(state);
      if (!target) {
        addPlayerGold(state, paidCost);
        return pushLog(state, 'No safe unequipped gear exists to reroll. Purchase refunded.');
      }
      const idx = state.player.inventory.findIndex(item => item && item.id === target.id);
      const nextRarity = Math.random() < 0.2
        ? (RARITIES[Math.min(RARITIES.length - 1, rarityIndex(target.rarity) + 1)]?.key || target.rarity)
        : target.rarity;
      const rawDepth = Math.max(1, reachedDistrictFloor(state));
      const shopThreatDepth = threatDepthFromDepth(rawDepth);
      const rerollLevel = Math.max(Math.floor(numberOr(target.level, 1, 1, 999999)), shopThreatDepth);
      const rerolled = generateGear(target.slot, rerollLevel, { source:'merchant', forcedRarity:nextRarity, depthRaw:rawDepth });
      rerolled.name = `Cursed ${rerolled.name}`;
      rerolled.summary = `Rerolled from ${target.name} by an Ember Debtworks token.`;
      rerolled.tags = asArray(rerolled.tags, []).concat(['cursed-reroll']);
      if (idx >= 0) state.player.inventory.splice(idx, 1, rerolled);
      pushLog(state, `Bought ${ware.name}. ${target.name} became ${rerolled.name}.`);
      return;
    }

    if (ware.id === 'legendary_bounty_writ') {
      sink.nextBossBounty = true;
      pushLog(state, `Bought ${ware.name}. The next boss carries an extra relic.`);
      return;
    }

    if (ware.id === 'golden_coffin') {
      sink.goldenCoffin = true;
      pushLog(state, `Bought ${ware.name}. Defeat insurance is armed.`);
    }
  }

  function buyMerchantItem(state, id) {
    const idx = state.merchantStock.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = state.merchantStock[idx];
    const itemCost = merchantCostWithSetBonus(state, item.value);
    if (state.player.gold < itemCost) return pushLog(state, `Not enough coin for ${item.name}.`);
    state.player.gold = Math.max(0, state.player.gold - itemCost);
    state.player.inventory.unshift(item);
    state.merchantStock.splice(idx, 1);
    grantDebtbrandMerchantBoost(state);
    pushLog(state, `Bought ${item.name}.`);
  }

  function rollMerchant(state, first = false) {
    if (!first && state.player.gold < state.town.merchantRefreshCost) return pushLog(state, 'Not enough coin to refresh Lowfire stock.');
    if (!first) state.player.gold -= state.town.merchantRefreshCost;
    state.merchantStock = buildMerchantStock(state);
    pushLog(state, 'Lowfire market stock updated.');
  }

  function forgeItem(state) {
    if (state.player.forgeSpark <= 0 || state.player.shards < 40) return pushLog(state, 'Need 1 forge spark and 40 shards.');
    state.player.forgeSpark -= 1;
    state.player.shards -= 40;
    // Forge scaling: use threat-depth item level, not raw chapter depth, to prevent deep-floor forged items from outpacing the monster ladder.
    const crafted = generateGear(pick(SLOT_ORDER), Math.max(1, threatDepthFromDepth(state.player.depth) + rand(1, 2)), { source:'forge', depthRaw:state.player.depth });
    crafted.value += coins(0, 16, 0);
    state.player.inventory.unshift(crafted);
    pushLog(state, `Forged ${crafted.name}.`);
    if (!state.player.discoveredGear.includes(crafted.name)) state.player.discoveredGear.push(crafted.name);
  }

  function restCost(state) {
    // Rest cost display: shared by town UI and rest action so the visible price cannot drift from the charged price.
    const player = state?.player || {};
    const earlyDiscount = player.depth <= 2 ? 35 : 0;
    return Math.max(coins(0, 0, 85), coins(0, 0, 95 + player.level * 42 - earlyDiscount));
  }

  function restPlayer(state) {
    const cost = restCost(state);
    if (state.player.gold < cost) return pushLog(state, `Need ${formatMoney(cost)} to rest.`);
    state.player.gold -= cost;
    calcDerived(state);
    state.player.hp = state.player.maxHp;
    state.player.ember = Math.max(state.player.ember, 2);
    pushLog(state, `Rested at the Lowfire bunks for ${formatMoney(cost)}. HP restored, 2 ember minimum assured.`);
  }

  function normalizeItem(item, fallbackSlot = 'weapon') {
    if (!isPlainObject(item)) return null;
    if (item.kind === 'special') {
      item.id = item.id || makeId('special');
      item.name = String(item.name || 'Special Charter');
      item.rarity = RARITIES.some(r => r.key === item.rarity) ? item.rarity : 'legendary';
      item.slot = item.slot || 'scroll';
      item.level = Math.floor(numberOr(item.level, 1, 1, 999));
      item.rating = Math.floor(numberOr(item.rating, item.level, 1, 99999));
      item.value = Math.floor(numberOr(item.value, coins(1, 25, 0), 1, Number.MAX_SAFE_INTEGER));
      item.summary = String(item.summary || 'A rare Lowfire special.');
      return item;
    }
    const fallback = SLOT_ORDER.includes(fallbackSlot) ? fallbackSlot : baseSlotForSlot(fallbackSlot, 'weapon');
    const rawSlot = String(item.slot || fallback).toLowerCase();
    const legacySetSlot = mythicSetSlotFromSlot(item.setSlot || rawSlot);
    const baseSlot = baseSlotForSlot(rawSlot, baseSlotForSlot(fallback, 'weapon'));
    const stats = isPlainObject(item.stats) ? item.stats : {};
    item.id = item.id || makeId('gear');
    item.slot = baseSlot;
    item.rarity = RARITIES.some(r => r.key === item.rarity) ? item.rarity : 'common';
    item.level = Math.floor(numberOr(item.level, 1, 1, 999));
    item.rating = Math.floor(numberOr(item.rating, 3, 1, 99999));
    item.value = Math.floor(numberOr(item.value, coins(0, 0, 25), 1, Number.MAX_SAFE_INTEGER));
    item.name = String(item.name || `${BASES[baseSlot][0]} of Lowfire`);
    item.theme = String(item.theme || 'warden');
    item.maker = String(item.maker || 'Lowfire');
    item.summary = String(item.summary || `${item.maker} ${baseSlot} recovered from an older save.`);
    if (item.setId != null) item.setId = String(item.setId);
    if (item.mythicSetId != null && item.setId == null) item.setId = String(item.mythicSetId);
    if (item.setId && !getMythicSetDefinition(item.setId)) delete item.setId;
    if (item.setId || item.mythicSetId || item.setSlot != null || LEGACY_MYTHIC_SET_SLOTS.includes(rawSlot)) item.setSlot = legacySetSlot || mythicSetSlotFromSlot(baseSlot) || '';
    item.tags = asArray(item.tags, []).map(String);
    item.stats = {
      power: Math.floor(numberOr(stats.power, 0, 0, 99999)),
      guard: Math.floor(numberOr(stats.guard, 0, 0, 99999)),
      wit: Math.floor(numberOr(stats.wit, 0, 0, 99999)),
      speed: Math.floor(numberOr(stats.speed, 0, 0, 99999)),
      luck: Math.floor(numberOr(stats.luck, 0, 0, 99999)),
      hp: Math.floor(numberOr(stats.hp, 0, 0, 99999))
    };
    return item;
  }

  function normalizeMonster(monster, floor) {
    if (!isPlainObject(monster)) return null;
    const level = Math.floor(numberOr(monster.level, Math.max(1, floor || 1), 1, 999));
    const maxHp = Math.floor(numberOr(monster.maxHp, Math.max(12, level * 18), 1, 999999));
    const tier = ['Common','Elite','Boss'].includes(monster.tier) ? monster.tier : 'Common';
    const normalizedModifiers = tier === 'Elite'
      ? eliteModifiersForMonster({ tier, modifier:monster.modifier, modifiers:monster.modifiers })
      : [];
    const eliteReward = tier === 'Elite' ? normalizeEliteRewardProfile(monster.eliteReward, normalizedModifiers, level) : null;
    return {
      id: monster.id || makeId('monster'),
      name: String(monster.name || 'Recovered Hollow Threat'),
      family: String(monster.family || 'Husk'),
      type: String(monster.type || 'Stalker'),
      affix: String(monster.affix || 'Ashwake'),
      skill: MONSTER_SKILLS.includes(monster.skill) ? monster.skill : 'Bleed',
      tier,
      modifier: normalizedModifiers[0] || null,
      modifiers: normalizedModifiers,
      eliteReward,
      reviveUsed: !!monster.reviveUsed,
      ashFedTriggered: !!monster.ashFedTriggered,
      eliteContractCounted: !!monster.eliteContractCounted,
      level,
      power: Math.floor(numberOr(monster.power, Math.max(8, level * 10), 1, 999999)),
      maxHp,
      hp: Math.floor(numberOr(monster.hp, maxHp, 1, maxHp)),
      guard: Math.floor(numberOr(monster.guard, Math.max(1, level * 3), 0, 999999)),
      speed: Math.floor(numberOr(monster.speed, Math.max(1, level * 2), 0, 999999)),
      rewardGold: Math.floor(numberOr(monster.rewardGold, encounterCoinReward(level, Math.max(8, level * 10), tier, 1), 0, Number.MAX_SAFE_INTEGER)),
      rewardXp: Math.floor(numberOr(monster.rewardXp, Math.max(6, level * 10), 0, 999999)),
      rewardShard: Math.floor(numberOr(monster.rewardShard, tier === 'Boss' ? 22 : tier === 'Elite' ? 7 : 1, 0, 999999)),
      lore: String(monster.lore || 'Recovered from an older save.')
    };
  }

  function normalizeSaveShape(parsed) {
    if (!isPlainObject(parsed) || !isPlainObject(parsed.player)) return createBaseState();

    const base = createBaseState();
    const savedPlayer = parsed.player;
    const state = { ...base, ...parsed };
    state.build = BUILD;
    state.screen = normalizeScreenName(state.screen);
    state.filters = { ...base.filters, ...(isPlainObject(parsed.filters) ? parsed.filters : {}) };
    if (!FUTURE_EQUIPMENT_SLOTS.includes(state.filters.slot) && state.filters.slot !== 'all') state.filters.slot = 'all';
    if (!RARITIES.some(r => r.key === state.filters.rarity) && state.filters.rarity !== 'all') state.filters.rarity = 'all';
    state.filters.search = String(state.filters.search || '');
    if (!INVENTORY_SORTS.includes(state.filters.sort)) state.filters.sort = 'power';

    state.player = { ...base.player, ...savedPlayer };
    state.player.name = String(state.player.name || base.player.name);
    state.player.title = String(state.player.title || base.player.title);
    state.player.level = Math.floor(numberOr(state.player.level, 1, 1, 999));
    state.player.xp = Math.floor(numberOr(state.player.xp, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.xpNext = Math.floor(numberOr(state.player.xpNext, 100, 1, Number.MAX_SAFE_INTEGER));
    state.player.maxHp = Math.floor(numberOr(state.player.maxHp, base.player.maxHp, 1, 999999));
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    state.player.gold = Math.floor(numberOr(state.player.gold, base.player.gold, 0, Number.MAX_SAFE_INTEGER));
    state.player.currencyVersion = Math.floor(numberOr(state.player.currencyVersion, 3, 1, 99));
    state.player.shards = Math.floor(numberOr(state.player.shards, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.ember = Math.floor(numberOr(state.player.ember, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.depth = Math.floor(numberOr(state.player.depth, 0, 0, 999999));
    state.player.safeExtractDepth = Math.floor(numberOr(state.player.safeExtractDepth, 1, 1, 999999));
    state.player.kills = Math.floor(numberOr(state.player.kills, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.crit = numberOr(state.player.crit, base.player.crit, 0, 100);
    state.player.dodge = numberOr(state.player.dodge, base.player.dodge, 0, 100);
    state.player.forgeSpark = Math.floor(numberOr(state.player.forgeSpark, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.permanentStartFloor = Math.floor(numberOr(state.player.permanentStartFloor, 1, 1, 999999));
    if (state.player.permanentStartFloor >= 40) state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth, state.player.permanentStartFloor);
    // v1.3.26: preserve earned return checkpoints from older saves instead of
    // clamping them to the district table ceiling or permanentStartFloor only.
    state.player.returnDepth = progressDepthValue(state.player.returnDepth, state.player.safeExtractDepth || 1);
    state.player.boughtStart20Scroll = !!state.player.boughtStart20Scroll;
    state.player.debtbrandBoostReady = !!state.player.debtbrandBoostReady;
    state.player.earlyAidGiven = !!state.player.earlyAidGiven;
    state.player.goldSink = createGoldSinkState(isPlainObject(savedPlayer.goldSink) ? savedPlayer.goldSink : {});
    state.player.eliteContracts = createEliteContractState(isPlainObject(savedPlayer.eliteContracts) ? savedPlayer.eliteContracts : {}, state);
    state.player.deepStairCharters = normalizeCharterDepthList(savedPlayer.deepStairCharters);
    if (state.player.permanentStartFloor >= 40) state.player.goldSink.boughtStart40Charter = true;
    ensurePermanentCharters(state);
    state.player.stats = { ...base.player.stats, ...(isPlainObject(savedPlayer.stats) ? savedPlayer.stats : {}) };
    Object.keys(base.player.stats).forEach(k => { state.player.stats[k] = Math.floor(numberOr(state.player.stats[k], base.player.stats[k], 0, 99999)); });

    state.player.inventory = asArray(savedPlayer.inventory, base.player.inventory).map(item => normalizeItem(item)).filter(Boolean);
    const equipment = isPlainObject(savedPlayer.equipment) ? savedPlayer.equipment : {};
    state.player.equipment = {};
    const equipmentLoadSlots = Array.from(new Set([...SLOT_ORDER, ...LEGACY_MYTHIC_SET_SLOTS]));
    equipmentLoadSlots.forEach(slot => {
      const item = normalizeItem(equipment[slot], slot);
      if (!item) return;
      const targetSlot = baseSlotForSlot(item.slot, slot);
      item.slot = targetSlot;
      const equipped = state.player.equipment[targetSlot];
      if (!equipped) {
        state.player.equipment[targetSlot] = item;
        return;
      }
      const keepNew = numberOr(item.rating, 0, 0, 999999) > numberOr(equipped.rating, 0, 0, 999999);
      if (keepNew) {
        state.player.inventory.push(equipped);
        state.player.equipment[targetSlot] = item;
      } else {
        state.player.inventory.push(item);
      }
    });
    state.player.discoveredMonsters = asArray(savedPlayer.discoveredMonsters, []).map(String).slice(0, 200);
    state.player.discoveredGear = asArray(savedPlayer.discoveredGear, []).map(String).slice(0, 200);
    state.player.log = asArray(savedPlayer.log, base.player.log).map(String).slice(0, 60);
    state.player.loreSeen = asArray(savedPlayer.loreSeen, base.player.loreSeen).map(String).slice(0, 80);
    state.player.runHistory = asArray(savedPlayer.runHistory, []).filter(isPlainObject).slice(0, 12);
    const savedQuests = asArray(savedPlayer.quests, []);
    state.player.quests = base.player.quests.map(def => {
      const saved = savedQuests.find(q => q && q.id === def.id) || {};
      return {
        ...def,
        ...saved,
        progress: Math.floor(numberOr(saved.progress, def.progress, 0, def.goal)),
        goal: Math.floor(numberOr(saved.goal, def.goal, 1, 99999)),
        claimed: !!saved.claimed
      };
    });

    state.town = { ...base.town, ...(isPlainObject(parsed.town) ? parsed.town : {}) };
    state.town.merchantRefreshCost = Math.floor(numberOr(state.town.merchantRefreshCost, base.town.merchantRefreshCost, 0, Number.MAX_SAFE_INTEGER));
    state.town.forgeTier = Math.floor(numberOr(state.town.forgeTier, 1, 1, 999));
    state.town.relicFavor = Math.floor(numberOr(state.town.relicFavor, 0, 0, Number.MAX_SAFE_INTEGER));
    state.archive = asArray(parsed.archive, base.archive).filter(isPlainObject).slice(0, 40);
    state.ui = { ...base.ui, ...(isPlainObject(parsed.ui) ? parsed.ui : {}) };
    state.ui.combatLogExpanded = !!state.ui.combatLogExpanded;

    state.run = { ...base.run, ...(isPlainObject(parsed.run) ? parsed.run : {}) };
    state.run.active = !!state.run.active;
    state.run.floor = state.run.active
      ? progressDepthValue(state.run.floor, defaultRunStartDepth(state))
      : Math.floor(numberOr(state.run.floor, 0, 0, 999999));
    state.run.chain = Math.floor(numberOr(state.run.chain, 0, 0, 99999));
    state.run.danger = dangerRatingForDepth(Math.max(1, state.run.floor || 1));
    state.run.zone = String(state.run.zone || zoneName(Math.max(1, state.run.floor || 1)));
    state.run.roomsCleared = Math.floor(numberOr(state.run.roomsCleared, 0, 0, 99999));
    state.run.encounters = Math.floor(numberOr(state.run.encounters, 0, 0, 99999));
    state.run.goldBonusPct = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    state.run.pendingRewards = state.run.active ? createPendingRunRewards(state.run.pendingRewards) : createPendingRunRewards();
    state.run.startedFromCharter = !!state.run.startedFromCharter;
    state.run.charterStartFloor = Math.floor(numberOr(state.run.charterStartFloor, 0, 0, 999999));
    ensureRunSetBonusState(state);
    if (!state.run.active) { state.run.startedFromCharter = false; state.run.charterStartFloor = 0; state.run.setBonuses = { ashboundLethalUsed:false, bellforgeHits:0 }; clearPendingRunRewards(state); }
    state.run.choices = asArray(state.run.choices, CORE_COMBAT_ACTIONS).filter(x => CORE_COMBAT_ACTIONS.includes(x));
    state.run.combatLog = asArray(state.run.combatLog, base.run.combatLog).map(String).slice(0, COMBAT_LOG_STORE_LIMIT);
    state.run.monster = state.run.active ? normalizeMonster(state.run.monster, state.run.floor) : null;
    if (state.run.active && !state.run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete combat save and returned to Lowfire.');
    }
    if (state.run.active && state.run.monster) state.screen = 'run';

    state.merchantStock = asArray(parsed.merchantStock, []).map(item => normalizeItem(item)).filter(item => item && item.specialType !== 'start20');
    if (!state.merchantStock.length) state.merchantStock = buildMerchantStock(state);

    calcDerived(state);
    return state;
  }

  function sanitizeLiveStateForSave(state) {
    if (!isPlainObject(state) || !isPlainObject(state.player)) return false;
    state.build = BUILD;
    state.screen = normalizeScreenName(state.screen);
    state.player.maxHp = Math.floor(numberOr(state.player.maxHp, 100, 1, 999999));
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    state.player.gold = sanitizeCurrencyValue(state.player.gold, 0);
    state.player.shards = sanitizeCurrencyValue(state.player.shards, 0);
    state.player.ember = sanitizeCurrencyValue(state.player.ember, 0);
    state.player.forgeSpark = sanitizeCurrencyValue(state.player.forgeSpark, 0);
    state.player.log = asArray(state.player.log, []).map(String).slice(0, 60);
    state.player.eliteContracts = createEliteContractState(isPlainObject(state.player.eliteContracts) ? state.player.eliteContracts : {}, state);
    if (!isPlainObject(state.run)) state.run = {};
    ensureRunShell(state);
    state.run.active = !!state.run.active;
    state.run.floor = state.run.active
      ? progressDepthValue(state.run.floor, defaultRunStartDepth(state))
      : Math.floor(numberOr(state.run.floor, 0, 0, 999999));
    state.run.goldBonusPct = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    state.run.pendingRewards = state.run.active ? createPendingRunRewards(state.run.pendingRewards) : createPendingRunRewards();
    state.run.combatLog = asArray(state.run.combatLog, []).map(String).slice(0, COMBAT_LOG_STORE_LIMIT);
    state.run.choices = asArray(state.run.choices, []).filter(x => CORE_COMBAT_ACTIONS.includes(x));
    if (state.run.active && !state.run.choices.length) state.run.choices = CORE_COMBAT_ACTIONS.slice();
    if (state.run.active && !state.run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete combat state before saving and returned to Lowfire.');
    }
    return true;
  }

  function save(state) {
    try {
      if (!sanitizeLiveStateForSave(state)) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('DungeonDex save skipped. Progress may not persist this session.');
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createBaseState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return createBaseState();
      parsed.build = BUILD;
      if (!parsed.archive) parsed.archive = [];
      if (!isPlainObject(parsed.player)) return createBaseState();
      if (parsed.player.permanentStartFloor == null) parsed.player.permanentStartFloor = 1;
      if (parsed.player.boughtStart20Scroll == null) parsed.player.boughtStart20Scroll = false;
      if ((parsed.player.currencyVersion || 1) < 2) {
        parsed.player.gold = toCopper(parsed.player.gold || 0);
        if (parsed.town && parsed.town.merchantRefreshCost != null) parsed.town.merchantRefreshCost = toCopper(parsed.town.merchantRefreshCost);
        if (Array.isArray(parsed.player.inventory)) parsed.player.inventory.forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
        if (isPlainObject(parsed.player.equipment)) Object.values(parsed.player.equipment).forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
        if (Array.isArray(parsed.merchantStock)) parsed.merchantStock.forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
      }
      if ((parsed.player.currencyVersion || 1) < 3) {
        parsed.player.gold = Math.min(Math.max(0, Math.floor(parsed.player.gold || 0)), coins(2, 0, 0));
        parsed.player.currencyVersion = 3;
        if (parsed.town) parsed.town.merchantRefreshCost = coins(0, 1, 50);
        const normalizeItem = (item) => {
          if (!item) return;
          if (!Number.isFinite(item.value) || item.value <= 0) item.value = coins(0, 0, 25);
          if (item.value > coins(4, 0, 0)) item.value = Math.max(coins(0, 0, 25), Math.round(item.value / COPPER_PER_GOLD * 100));
        };
        if (Array.isArray(parsed.player.inventory)) parsed.player.inventory.forEach(normalizeItem);
        if (isPlainObject(parsed.player.equipment)) Object.values(parsed.player.equipment).forEach(normalizeItem);
        if (Array.isArray(parsed.merchantStock)) parsed.merchantStock.forEach(normalizeItem);
      }
      if (parsed.player.earlyAidGiven == null) parsed.player.earlyAidGiven = false;
      return normalizeSaveShape(parsed);
    } catch (err) {
      console.warn('DungeonDex save recovery used a fresh state.');
      return createBaseState();
    }
  }

  let S = load();

  function switchScreen(screen) {
    if (S?.run?.active && screen !== 'run') screen = 'run';
    screen = normalizeScreenName(screen);
    S.screen = screen;
    $$('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
    $$('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === screen));
    render();
  }

  function rarityClass(key) {
    const found = RARITIES.find(r => r.key === key);
    return found ? found.color : 'rarity-common';
  }

  function itemRarityKey(item) {
    const key = String(item?.rarity || 'common').toLowerCase();
    return RARITIES.some(r => r.key === key) ? key : 'common';
  }

  function getItemLevelValue(item) {
    if (!isPlainObject(item)) return null;
    const fields = ['itemLevel', 'ilvl', 'level', 'power', 'score', 'rating'];
    for (const field of fields) {
      const value = Number(item[field]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
    return null;
  }

  function getItemLevelLabel(item) {
    const value = getItemLevelValue(item);
    return value == null ? 'ilvl —' : `ilvl ${format(value)}`;
  }

  function getRarityCardClass(item) {
    return `rarity-card rarity-card-${itemRarityKey(item)}`;
  }

  function upgradeMarkup(item, state) {
    const slot = item && item.slot;
    if (!slot) return '';
    const equipped = state && state.player && state.player.equipment && state.player.equipment[slot];
    if (!equipped || equipped.id === item.id) return '';
    const delta = (item.rating || 0) - (equipped.rating || 0);
    if (delta <= 0) return '';
    return `<span class="upgrade-badge">↑ Upgrade<span class="upgrade-delta">+${delta} PWR</span></span>`;
  }

  function renderStatBoxes() {
    calcDerived(S);
    const d = calcDerived(S);
    const heroStats = el('heroStats');
    const resourceBar = el('resourceBar');
    const bestDepth = Math.max(1, S.player.depth || S.player.safeExtractDepth || 1);
    if (heroStats) heroStats.innerHTML = [
      statBox('Level', S.player.level),
      statBox('Best Floor', depthShortLabel(bestDepth)),
      statBox('Power', d.power),
      statBox('Guard', d.guard)
    ].join('');
    if (resourceBar) resourceBar.innerHTML = [
      resourceBox('HP', `${format(S.player.hp)}/${format(S.player.maxHp)}`),
      resourceBox('Wallet', formatMoney(S.player.gold)),
      resourceBox('Shards', format(S.player.shards)),
      resourceBox('Ember', format(S.player.ember))
    ].join('');
    const buildTag = el('buildTag');
    if (buildTag) buildTag.textContent = VISIBLE_VERSION_LABEL;
    const loreLine = el('loreLine');
    if (loreLine) loreLine.textContent = SESSION_LORE_LINE;
  }

  function statBox(label, value) { return `<div class="stat-box"><div class="small muted">${escapeHtml(label)}</div><strong>${escapeHtml(value)}</strong></div>`; }
  function resourceBox(label, value) { return `<div class="resource-box"><div class="small muted">${label}</div><strong>${value}</strong></div>`; }

  function updateSaveStatus(ok, label = '') {
    const node = el('saveStatus');
    if (!node) return;
    node.textContent = label || (ok ? 'Saved' : 'Save blocked');
    node.classList.toggle('save-warn', !ok);
  }

  function showGoldPopup(copper) {
    const popup = document.createElement('div');
    popup.className = 'gold-popup';
    popup.innerHTML = `+${formatMoney(copper)}`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.remove(), 1200);
  }

  function showExtractionPopup(summary = '') {
    if (typeof document === 'undefined' || !document.body) return;
    document.querySelectorAll('.extract-success-popup').forEach(node => node.remove());
    const popup = document.createElement('div');
    popup.className = 'extract-success-popup';
    popup.setAttribute('role', 'status');
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `<strong>Extraction Haul</strong><span>${escapeHtml(summary || 'Rewards banked. You made it back to Lowfire.')}</span>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.classList.remove('show'), 2100);
    setTimeout(() => popup.remove(), 2450);
  }

  function showDefeatPopup(summary = '') {
    if (typeof document === 'undefined' || !document.body) return;
    document.querySelectorAll('.defeat-result-popup').forEach(node => node.remove());
    const popup = document.createElement('div');
    popup.className = 'defeat-result-popup';
    popup.setAttribute('role', 'status');
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `<strong>Run Lost</strong><span>${escapeHtml(summary || 'Unsecured rewards were forfeited.')}</span>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.classList.remove('show'), 2400);
    setTimeout(() => popup.remove(), 2750);
  }

  function latestRunSummary(state) {
    const latest = asArray(state.player.runHistory, [])[0];
    if (!latest) return 'No descents logged yet';
    const floor = Math.max(0, Math.floor(numberOr(latest.floor, 0, 0, 999999)));
    const reason = normalizeRunHistoryReason(latest.reason);
    if (reason === 'extract') return `Last descent: extraction secured at ${depthWithRawLabel(floor || 1)}`;
    if (reason === 'defeat') return `Last descent: run lost at ${depthWithRawLabel(floor || 1)}`;
    return `Last descent: ${reason} at ${depthWithRawLabel(floor || 1)}`;
  }

  function nextBossFloorFromDepth(depth) {
    const next = nextBossDepthFromDepth(depth);
    return { floor: next, name: bossFloorNameByDepth(next) };
  }

  function introStat(label, value, extraClass = '') {
    return `<div class="intro-stat ${extraClass}"><div class="small muted">${label}</div><strong>${value}</strong></div>`;
  }

  function deepStairCharterMarkup(mode = 'panel') {
    const unlockedDepth = getUnlockedCharterDepth(S);
    const depths = Array.from(new Set([...charterStartDepths(S), ...ensurePermanentCharters(S)])).sort((a, b) => a - b);
    const nextUnlock = unlockedDepth ? getNextCharterUnlockDepth(unlockedDepth) : CHARTER_EARLY_STEP;
    const safeDepth = Math.max(1, Math.floor(numberOr(S.player.safeExtractDepth || S.player.depth || 1, 1, 1, 999999)));
    const progress = clamp((safeDepth / nextUnlock) * 100, 0, 100);
    const label = unlockedDepth
      ? `Unlocked through ${charterDepthCompactLabel(unlockedDepth)}.`
      : `Extract safely at ${charterDepthCompactLabel(40)} to unlock the first charter.`;
    const buttons = depths.length
      ? depths.map(depth => {
          const owned = ownsPermanentCharter(S, depth);
          const cost = charterStartCost(depth);
          const disabled = S.run.active || (!owned && S.player.gold < cost) ? 'disabled' : '';
          const startLabel = charterDepthLabel(depth);
          const cleanPrice = formatMoney(cost).replace(/<[^>]*>/g, '');
          const title = owned
            ? `Owned forever. Start at ${startLabel}`
            : (S.player.gold < cost ? `Need ${cleanPrice} to permanently buy ${startLabel}` : `Buy forever and start at ${startLabel}`);
          const labelText = owned ? 'Start' : formatMoney(cost);
          const ownedClass = owned ? ' charter-owned' : '';
          const aria = owned ? `Start at owned ${startLabel}` : `Permanently buy ${startLabel} for ${cleanPrice}`;
          return `<button class="ghost mini charter-price-btn${ownedClass}" data-charter-start="${depth}" title="${escapeHtml(title)}" aria-label="${escapeHtml(aria)}" ${disabled}>${labelText}</button>`;
        }).join('')
      : '<span class="charter-empty small">No Hollow Stair charters claimed yet.</span>';

    return `<div class="deep-charter-card compact-charter-card" aria-label="Hollow Stair Charters">
      <div class="charter-glow" aria-hidden="true"></div>
      <div class="charter-head">
        <div>
          <div class="charter-kicker">Safe Return Milestone</div>
          <strong>Hollow Stair Charters</strong>
        </div>
        <span class="charter-badge">Next D${format(nextUnlock)}</span>
      </div>
      <p class="charter-copy small">${escapeHtml(label)} Later safe extractions unlock more charters through D800, then every D5000.</p>
      <div class="charter-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
      <div class="charter-actions">${buttons}</div>
    </div>`;
  }

  function introProgressMarkup() {
    const stagingDistrict = currentStagingDistrict(S);
    const activeDepth = S.run.active ? progressDepthValue(S.run.floor || 1, 1) : defaultRunStartDepth(S);
    const activeDepthMeta = depthProgressMeta(activeDepth);
    const bestDepth = Math.max(1, progressDepthValue(S.player.depth || S.player.safeExtractDepth || 1, 1));
    const safeDepth = progressDepthValue(S.player.safeExtractDepth || 1, 1);
    const returnDepth = S.run.active ? activeDepth : defaultRunStartDepth(S);
    const boss = nextBossFloorFromDepth(activeDepth);
    const bossText = boss.name ? `${escapeHtml(bossFloorLabel(boss.floor))} - ${escapeHtml(boss.name)}` : escapeHtml(bossFloorLabel(boss.floor));
    const lastRunText = S.run.active ? `Current descent: ${depthWithRawLabel(activeDepth)}` : latestRunSummary(S);
    const title = S.run.active ? 'Descent In Progress' : 'Hollow Stair Threshold';
    const subtitle = S.player.runHistory.length || S.player.depth > 0
      ? stagingDistrict.line
      : 'The Hollow Stair descends below Emberfall. Only debt is free here.';
    const kicker = S.run.active ? 'Active Descent' : 'Lowfire Return';
    const metaMarkup = `<span><b>Best Floor</b> ${escapeHtml(depthShortLabel(bestDepth))}</span>
          <span><b>Safe Return</b> ${escapeHtml(depthShortLabel(safeDepth))}</span>
          <span><b>Next Boss</b> ${bossText}</span>`;
    const actionId = S.run.active ? 'introModalContinueRunBtn' : 'introModalEnterDungeonBtn';
    const action = S.run.active
      ? `<button class="primary mini threshold-enter" id="${actionId}">Continue Run</button>`
      : `<button class="primary mini threshold-enter" id="${actionId}">Enter Dungeon</button>`;
    const closeAction = '<button class="ghost mini threshold-close" id="introModalCloseBtn">Close</button>';

    return `
      <div class="threshold-hero ${districtToneClass(stagingDistrict)}">
        <div class="threshold-veil" aria-hidden="true"></div>
        <div class="intro-head threshold-head">
          <div>
            <span class="threshold-kicker">${escapeHtml(kicker)}</span>
            <h2>${title}</h2>
            <p class="threshold-copy">${escapeHtml(subtitle)}</p>
          </div>
          <div class="intro-actions threshold-actions">${action}${closeAction}</div>
        </div>
        <div class="threshold-district-card">
          <div>
            <span class="threshold-label">Current District</span>
            <strong>${escapeHtml(stagingDistrict.name)}</strong>
          </div>
          <span class="pill threshold-pill">${escapeHtml(depthShortLabel(returnDepth))}</span>
        </div>
        <div class="threshold-progress" aria-label="Hollow Stair progress">
          <div class="split threshold-progress-head">
            <span>${escapeHtml(floorNumberLabel(activeDepth))} • Room ${format(activeDepthMeta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)}</span>
            <b>${activeDepthMeta.chapterPct.toFixed(0)}% through room</b>
          </div>
          <div class="depth-meter threshold-meter"><div style="width:${activeDepthMeta.chapterPct.toFixed(1)}%"></div></div>
        </div>
        <div class="threshold-meta-row" aria-label="Hollow Stair status">
          ${metaMarkup}
        </div>
        <div class="threshold-footer">
          <span>${escapeHtml(lastRunText)}</span>
          <span>${formatMoney(S.player.gold)} / Ember ${format(S.player.ember)}</span>
        </div>
      </div>`;
  }

  function renderIntroModal() {
    const content = el('introModalContent');
    if (!content) return;
    content.innerHTML = introProgressMarkup();
  }

  function hideIntroModal() {
    const modal = el('introModal');
    if (!modal) return;
    modal.hidden = true;
  }

  let introModalFallbackSeen = false;
  function shouldShowIntroModal() {
    try {
      if (sessionStorage.getItem(INTRO_MODAL_SESSION_KEY)) return false;
      sessionStorage.setItem(INTRO_MODAL_SESSION_KEY, '1');
      return true;
    } catch (err) {
      if (introModalFallbackSeen) return false;
      introModalFallbackSeen = true;
      return true;
    }
  }

  function showIntroModalOnce() {
    const modal = el('introModal');
    if (!modal || !shouldShowIntroModal()) return;
    renderIntroModal();
    modal.hidden = false;
    bindIntroModalActions();
  }

  function eliteContractBoardMarkup(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;

    if (active) {
      const contract = eliteContractDef(active.id);
      if (!contract) return '';
      const progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)));
      const pct = Math.min(100, Math.round((progress / contract.goal) * 100));
      const ready = active.complete || progress >= contract.goal;
      const statusLabel = ready ? 'Ready to Claim' : 'Active';
      const rewardAmount = activeContractRewardAmount(active, contract, state);
      const riskLevel = eliteContractRiskLevel(contract);
      const objective = eliteContractObjective(contract);
      return `<div class="elite-contract-board">
        <div class="elite-contract-head">
          <div><h3>Lowfire Elite Board</h3><p>Clear paid marks for wardens taking extra elite risk.</p></div>
          <span class="pill ${ready ? 'rarity-rare' : ''}">${statusLabel}</span>
        </div>
        <div class="elite-contract-card ${ready ? 'ready' : 'active'}">
          <div class="split"><strong>Active Contract: ${escapeHtml(contract.name)}</strong><span class="small muted">${escapeHtml(active.tier || contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Progress:</b> ${progress} / ${contract.goal} elites defeated</span>
            <span><b>Objective:</b> ${escapeHtml(objective)}</span>
            <span><b>Risk:</b> ${escapeHtml(riskLevel)}</span>
            <span><b>Reward:</b> ${formatMoney(rewardAmount)}</span>
            <span><b>Completion:</b> ${ready ? 'Ready to Claim' : 'In progress'}</span>
          </div>
          <div class="elite-contract-meter"><div style="width:${pct}%"></div></div>
          <div class="elite-contract-actions">
            <span class="pill">${ready ? 'Ready to Claim' : 'Payment held'}: ${formatMoney(rewardAmount)}</span>
            ${ready ? '<button class="primary mini" id="claimEliteContractBtn">Claim Reward</button>' : '<span class="small muted">Finish the elite mark, then claim in Lowfire.</span>'}
          </div>
        </div>
      </div>`;
    }

    const available = availableEliteContracts(state);
    const body = available.length
      ? available.map(contract => `<div class="elite-contract-card">
          <div class="split"><strong>${escapeHtml(contract.name)}</strong><span class="small muted">${escapeHtml(contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Objective:</b> ${escapeHtml(eliteContractObjective(contract))}</span>
            <span><b>Risk:</b> ${escapeHtml(eliteContractRiskLevel(contract))}</span>
            <span><b>Reward:</b> ${formatMoney(calculateContractReward(contract, state))}</span>
          </div>
          <div class="elite-contract-actions">
            <span class="pill">Reward Preview</span>
            <button class="primary mini" data-start-contract="${escapeHtml(contract.id)}">Take Mark</button>
          </div>
        </div>`).join('')
      : '<p class="small muted elite-contract-empty">No paid marks are currently available.</p>';

    return `<div class="elite-contract-board">
      <div class="elite-contract-head">
        <div><h3>Lowfire Elite Board</h3><p>Take marked danger for a clear payout.</p></div>
        <span class="pill">No Active (${contracts.claimed.length}/${ELITE_CONTRACTS.length})</span>
      </div>
      <div class="elite-contract-list">${body}</div>
    </div>`;
  }

  function renderTown() {
    const stagingDistrict = currentStagingDistrict(S);
    const lowfireDistrict = DISTRICT_DATA.find(district => district.id === 'lowfire') || stagingDistrict;
    const questPanel = el('questPanel');
    const merchantPanel = el('merchantPanel');
    const forgePanel = el('forgePanel');
    const districtPanel = el('districtName')?.closest('.panel');
    if (districtPanel) {
      districtPanel.className = `panel section-header district-banner town-district-hub district-charter-hub ${districtToneClass(lowfireDistrict)}`;
    }
    if (el('districtName')) el('districtName').textContent = 'Lowfire District';
    if (el('districtLine')) el('districtLine').innerHTML = `Lowfire return: rest, improve gear, claim work, then descend again.<br><span class="district-mood">${escapeHtml(lowfireDistrict.mood || '')}</span>`;
    if (el('startRunBtn')) el('startRunBtn').textContent = S.run.active ? 'Continue Run' : 'Enter Dungeon';
    const restCostNode = el('restCostPill');
    if (restCostNode) {
      const cost = restCost(S);
      const affordable = S.player.gold >= cost;
      restCostNode.innerHTML = `Cost ${formatMoney(cost)}`;
      restCostNode.classList.toggle('rest-cost-low', !affordable);
      restCostNode.title = affordable ? 'Cost to rest and restore HP' : `Need ${cleanDisplayText(formatMoney(cost))} to rest`;
    }
    if (el('districtCharterSlot')) el('districtCharterSlot').innerHTML = deepStairCharterMarkup('hollow');
    if (questPanel) questPanel.innerHTML = `
      <div class="card-head"><div><h2>Lowfire Board</h2><p>Paid marks and Warden Objectives tracked from the safe district.</p></div></div>
      <div class="warden-ledger">
        <div class="split ledger-subhead"><div><strong>Warden Objectives</strong><p class="small">Short Lowfire orders paid after descent work.</p></div><span class="pill">${S.player.quests.filter(q => q.claimed).length}/${S.player.quests.length}</span></div>
      </div>
      <div class="list warden-objective-list">
        ${S.player.quests.map(q => `
          <div class="quest-card warden-objective-card">
            <div class="split"><strong>${q.title}</strong><span class="small muted">${q.progress}/${q.goal}</span></div>
            <p class="small">${q.reward}${q.claimed ? ' - claimed' : ''}</p>
            <div class="xpbar"><div class="xpfill" style="width:${(q.progress/q.goal)*100}%"></div></div>
          </div>`).join('')}
      </div>
      ${eliteContractBoardMarkup(S)}`;

    const districtWares = unlockedDistrictWares(S);
    const activeSinkPills = activeGoldSinkPills(S);
    if (merchantPanel) merchantPanel.innerHTML = `
      <div class="split merchant-head"><div><h2>Lowfire Market</h2><p>Stair gear, district wares, and descent support.</p></div><button class="ghost mini refresh-compact" id="refreshMerchantBtn"><span>Refresh</span><strong>${formatMoney(S.town.merchantRefreshCost)}</strong></button></div>
      ${activeSinkPills.length ? `<div class="tag-row market-pills">${activeSinkPills.map(label => `<span class="pill rarity-uncommon">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      <div class="list market-stock-list">${S.merchantStock.map(item => shopCard(item)).join('')}</div>
      <div class="sep"></div>
      <div class="district-market lowfire-wares">
        <div class="split market-subhead"><div><strong>District Wares</strong><p class="small">Support unlocked by your deepest secured floor.</p></div><span class="pill">${districtWares.length}/${DISTRICT_MARKET_WARES.length}</span></div>
        <div class="list district-ware-list">${districtWares.map(ware => districtWareCard(ware)).join('')}</div>
      </div>`;

    if (forgePanel) forgePanel.innerHTML = `
      <div class="card-head"><div><h2>Relic Forge</h2><p>Sparks, shards, and salvage work.</p></div></div>
      <div class="tag-row"><span class="pill">Forge spark: ${S.player.forgeSpark}</span><span class="pill">Shards: ${S.player.shards}</span></div>
      <div class="sep"></div>
      <button class="primary" id="forgeBtn">Forge Item (1 spark + 40 shards)</button>
      <div class="sep"></div>
      <p class="small">Every crafted relic rolls at least rare quality.</p>`;
  }

  function districtWareCard(ware) {
    const district = districtForWare(ware);
    const status = goldSinkStatus(S, ware);
    const reason = goldSinkCannotBuyReason(S, ware);
    const disabled = reason ? 'disabled' : '';
    const buttonText = status && ['owned','armed','bounty active','next descent ready'].includes(status) ? status : 'Buy';
    return `<div class="shop-item district-ware rarity-card rarity-card-${ware.rarity}">
      <div class="split"><div><div class="item-name ${rarityClass(ware.rarity)}">${escapeHtml(ware.name)}</div><div class="item-meta">${escapeHtml(district.name)} • unlock ${escapeHtml(charterDepthCompactLabel(ware.unlockFloor))}</div></div><span class="pill ${rarityClass(ware.rarity)}">${escapeHtml(ware.rarity)}</span></div>
      <div class="tag-row"><span class="pill">${merchantCostMarkup(S, ware.cost)}</span>${status ? `<span class="pill rarity-uncommon">${escapeHtml(status)}</span>` : ''}</div>
      <p class="small"><strong>${escapeHtml(ware.effect)}</strong> ${escapeHtml(ware.summary)}</p>
      <div class="item-actions"><button class="primary mini" data-buy-district="${escapeHtml(ware.id)}" ${disabled}>${escapeHtml(buttonText)}</button>${reason && reason !== 'not enough gold' ? `<span class="small muted">${escapeHtml(reason)}</span>` : ''}</div>
    </div>`;
  }

  function shopCard(item) {
    const meta = item.kind === 'special'
      ? `unlocks ${charterDepthCompactLabel(15)} • starts ${charterDepthCompactLabel(20)}`
      : `${item.slot} • ilvl ${item.level} • pwr ${item.rating} • ${item.theme}`;
    const tags = item.kind === 'special'
      ? `<span class="pill">Permanent</span><span class="pill">${merchantCostMarkup(S, item.value)}</span>`
      : `<span class="pill">${merchantCostMarkup(S, item.value)}</span>`;
    return `<div class="shop-item"><div class="split"><div><div class="item-name ${rarityClass(item.rarity)}">${item.name}</div><div class="item-meta">${meta}</div></div><span class="pill ${rarityClass(item.rarity)}">${item.rarity}</span></div><div class="tag-row">${tags}</div><p class="small">${item.summary || ''}</p><div class="item-actions"><button class="primary mini" data-buy="${item.id}">Buy</button></div></div>`;
  }

  function renderRun() {
    const runStatus = el('runStatus');
    const combatPanel = el('combatPanel');
    const combatLog = el('combatLog');
    if (!runStatus || !combatPanel || !combatLog) return;
    const d = calcDerived(S);
    const monster = S.run.monster;
    if (!S.ui) S.ui = { combatLogExpanded:false };
    const depth = S.run.floor || 1;
    const depthMeta = depthProgressMeta(depth);
    const runDistrict = currentStagingDistrict(S);
    const isBossFight = monster && monster.tier === 'Boss';
    const isEliteFight = monster && monster.tier === 'Elite';
    const currentFloorText = floorNumberLabel(depth);
    const nextBoss = nextBossFloorFromDepth(depth);
    const nextBossText = isBossFight ? `${bossFloorLabel(depth)} now` : `Next boss: ${bossFloorLabel(nextBoss.floor)}`;
    const encounterLabel = isBossFight ? 'Boss Floor' : isEliteFight ? 'Elite Encounter' : 'Hollow Stair Encounter';
    const bossTitle = isBossFight ? (bossFloorNameByDepth(depth) || bossFloorLabel(depth)) : '';
    const enemyKicker = isBossFight ? `${bossFloorLabel(depth)} • ${bossTitle}` : (monster?.tier || 'Enemy');
    const playerHpPct = Math.max(0, Math.min(100, (S.player.hp / Math.max(1, S.player.maxHp)) * 100));
    const monsterHpPct = monster ? Math.max(0, Math.min(100, (monster.hp / Math.max(1, monster.maxHp)) * 100)) : 0;
    const pendingRewards = ensurePendingRunRewards(S);
    const hasUnsecured = hasPendingRunRewards(pendingRewards);
    const monsterGuard = monster ? Math.max(0, Math.floor(numberOr(monster.guard, 0, 0, 999999))) : 0;
    const shellTone = `${districtToneClass(runDistrict)} ${isBossFight ? 'combat-device-boss boss-atmosphere' : isEliteFight ? 'combat-device-elite' : ''}`;
    const playerDanger = playerHpPct <= 25 ? 'hp-critical' : playerHpPct <= 50 ? 'hp-warn' : '';
    const monsterDanger = monsterHpPct <= 25 ? 'hp-critical' : monsterHpPct <= 50 ? 'hp-warn' : '';
    const eliteMarkup = monster ? eliteModifierMarkup(monster) : '';
    const threatBrief = monster
      ? isBossFight
        ? `<div class="combat-threat-brief boss-threat-brief"><b>Boss floor:</b> heavier pressure, better stakes. Guard before risky bursts.</div>`
        : isEliteFight
          ? `<div class="combat-threat-brief elite-threat-brief"><b>Elite plan:</b> ${escapeHtml(eliteModifierPlanLine(eliteModifiersForMonster(monster)))}</div>`
          : ''
      : '';

    if (!S.run.active || !monster) {
      runStatus.innerHTML = `
        <div class="split"><div><h2>No active descent</h2><p>Rest in Lowfire, then return to the Hollow Stair when ready.</p></div><button class="primary mini" id="runFromIdleBtn">Enter Dungeon</button></div>`;
      combatPanel.innerHTML = `<p>No Hollow Stair threat detected.</p>`;
      combatLog.innerHTML = `<div class="run-log-head split"><h2>Combat Feed</h2><span class="pill">Idle</span></div><div class="run-log-list"><div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Resting</div><div class="feed-body">Lowfire is quiet.</div></div></div></div>`;
      return;
    }

    runStatus.innerHTML = `
      <div class="combat-device-top ${shellTone}">
        <div class="combat-top-strip run-shell-top" aria-label="Run status">
          <span class="combat-district-title">${escapeHtml(runDistrict.name)}</span>
          <span>${escapeHtml(currentFloorText)} • ${escapeHtml(encounterLabel)}</span>
        </div>
        <div class="run-progress-only" aria-label="Run progress">
          <div class="split run-progress-copy">
            <span>Room ${format(depthMeta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)} • C${format(depthMeta.chapter)}</span>
            <span>${escapeHtml(nextBossText)}</span>
          </div>
          <div class="depth-meter"><div style="width:${depthMeta.chapterPct.toFixed(1)}%"></div></div>
        </div>
      </div>`;

    combatPanel.innerHTML = `
      <div class="combat-device-shell ${shellTone}" aria-label="Combat screen">
        <section class="combat-enemy-header">
          <div class="depth-kicker">${escapeHtml(enemyKicker)}</div>
          <h2>${escapeHtml(monster.name || 'Unknown Threat')}</h2>
          <p class="small muted">${escapeHtml(monster.family || 'Depthborn')} · ${escapeHtml(monster.skill || 'Basic attack')}</p>
          ${eliteMarkup}
          ${threatBrief}
        </section>

        <section class="combat-monster-stage ${isBossFight ? 'stage-boss' : isEliteFight ? 'stage-elite' : ''}" aria-label="Enemy stage">
          <div class="monster-aura"></div>
          <div class="monster-silhouette">
            <span class="monster-horns" aria-hidden="true"></span>
            <span class="monster-core" aria-hidden="true">${isBossFight ? '♛' : isEliteFight ? '◆' : '▲'}</span>
          </div>
          <div class="stage-floor"></div>
        </section>

        <section class="combat-hp-card enemy-hp ${monsterDanger} ${isBossFight ? 'boss-hp' : isEliteFight ? 'elite-hp' : ''}">
          <div class="hp-label-row"><strong>${escapeHtml(monster.name || 'Enemy')}</strong><span>${format(monster.hp)} / ${format(monster.maxHp)} HP</span></div>
          <div class="hpbar"><span style="width:${monsterHpPct}%"></span></div>
          <div class="combat-stat-row">
            <span class="pill">PWR ${format(monster.power || 0)}</span>
            <span class="pill">GRD ${format(monsterGuard)}</span>
          </div>
        </section>

        <section class="combat-hp-card player-hp ${playerDanger}">
          <div class="hp-label-row"><strong>Warden</strong><span>${format(S.player.hp)} / ${format(S.player.maxHp)} HP</span></div>
          <div class="hpbar player-hpbar"><span style="width:${playerHpPct}%"></span></div>
          <div class="combat-stat-row">
            ${hasUnsecured ? '<span class="pill pill-danger">Unsecured loot</span>' : ''}
            <span class="pill">Gold ${stripHtml(formatMoney(S.player.gold || 0))}</span>
            <span class="pill">Shards ${format(S.player.shards || 0)}</span>
            <span class="pill">Ember ${format(S.player.ember || 0)}</span>
          </div>
        </section>

        <section class="combat-hud run-stat-grid" aria-label="Player combat stats">
          ${statBox('PWR', d.power)}
          ${statBox('GRD', d.guard)}
          ${statBox('SPD', d.speed)}
          ${statBox('LCK', d.luck)}
        </section>

        <section class="combat-device-actions" aria-label="Combat actions">
          <button class="primary combat-btn attack-btn" data-action="attack" aria-label="Attack enemy">Attack</button>
          <button class="ghost combat-btn skill-btn" data-action="skill" aria-label="Use Ashburst skill">Skill</button>
          <button class="ghost combat-btn guard-btn" data-action="guard" aria-label="Guard and recover HP">Guard</button>
          <button class="ghost combat-btn danger-btn extract-btn" data-action="extract" aria-label="Attempt to extract from the Hollow Stair">Extract</button>
        </section>
      </div>`;

    const logLines = asArray(S.run.combatLog).slice(0, COMBAT_LOG_RENDER_LIMIT);
    combatLog.innerHTML = `
      <div class="run-log-head split"><h2>Combat Feed</h2><div class="tag-row"><span class="pill">Latest ×${format(logLines.length)}</span></div></div>
      <div class="run-log-list">${logLines.length ? logLines.map(renderCombatFeedLine).join('') : '<div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Quiet</div><div class="feed-body">No combat messages yet.</div></div></div>'}</div>`;
  }
  function renderGear() {
    if (!el('equipmentPanel') || !el('filtersPanel') || !el('inventoryPanel')) return;
    el('equipmentPanel').innerHTML = `
      <h2>Loadout</h2>
      <div class="list">${EQUIPMENT_DISPLAY_SLOTS.map(slot => {
        const item = S.player.equipment[slot];
        const levelLine = item ? `<div class="item-level">${getItemLevelLabel(item)}</div>` : '';
        const setMini = item ? setBonusMiniMarkup(item, S) : '';
        const cardClass = item ? getRarityCardClass(item) : '';
        const filledClass = item ? ' equip-slot-filled' : '';
        const statLine = item ? `<div class="tag-row" style="margin-top:3px"><span class="pill">PWR ${item.rating}</span><span class="pill">Atk ${item.stats.power}</span><span class="pill">Guard ${item.stats.guard}</span><span class="pill">HP ${item.stats.hp}</span></div>` : '';
        return `<div class="equip-slot ${cardClass}${filledClass}"><div class="split"><div><div class="item-name">${slot}</div><div class="item-meta gear-equipped-name ${item ? rarityClass(item.rarity) : ''}"><span class="${item ? rarityClass(item.rarity) : ''}">${item ? item.name : 'Empty slot'}</span></div>${levelLine}${statLine}${setMini}</div>${item ? `<span class="pill ${rarityClass(item.rarity)}">${item.rarity}</span>` : ''}</div></div>`;
      }).join('')}</div>`;

    el('filtersPanel').innerHTML = `
      <h2>Inventory Filters</h2>
      <div class="filter-grid">
        <select id="slotFilter">${['all', ...FUTURE_EQUIPMENT_SLOTS].map(x => `<option value="${x}" ${S.filters.slot===x?'selected':''}>${x}</option>`).join('')}</select>
        <select id="rarityFilter">${['all', ...RARITIES.map(r => r.key)].map(x => `<option value="${x}" ${S.filters.rarity===x?'selected':''}>${x}</option>`).join('')}</select>
        <select id="sortFilter">
          <option value="power" ${S.filters.sort==='power'?'selected':''}>power first</option>
          <option value="level" ${S.filters.sort==='level'?'selected':''}>ilvl first</option>
          <option value="rarity" ${S.filters.sort==='rarity'?'selected':''}>rarity first</option>
          <option value="value" ${S.filters.sort==='value'?'selected':''}>value first</option>
          <option value="slot" ${S.filters.sort==='slot'?'selected':''}>slot order</option>
          <option value="newest" ${S.filters.sort==='newest'?'selected':''}>newest first</option>
        </select>
      </div>
      <div class="sep"></div>
      <input id="searchFilter" value="${escapeHtml(S.filters.search)}" placeholder="search name, maker, theme" />`;

    renderInventoryPanel();
  }

  function renderInventoryPanel() {
    const inv = filteredInventory();
    const safeSellCount = S.player.inventory.filter(item => canQuickSellItem(S, item)).length;
    const allSellCount = S.player.inventory.filter(item => canSellAllGearItem(S, item)).length;
    const sellJunkBtn = `<button class="ghost mini tiny-sell-all" id="sellJunkGearBtn" title="Sells unequipped gear marked as Junk" ${safeSellCount ? '' : 'disabled'}>Sell Junk</button>`;
    const sellAllBtn = `<button class="ghost mini tiny-sell-all danger-sell-all" id="sellAllGearBtn" title="Sells all unequipped sellable gear after two confirmations" ${allSellCount ? '' : 'disabled'}>Sell All</button>`;
    el('inventoryPanel').innerHTML = `
      <div class="split inventory-head"><div><h2>Inventory</h2><p class="small muted inventory-subline">Rarity, upgrades, junk, and sell value at a glance.</p></div><div class="inventory-actions"><span class="pill item-count-pill">${inv.length} items</span>${sellJunkBtn}${sellAllBtn}</div></div>
      <div class="list">${inv.map(itemCard).join('') || '<p class="small muted">No matching gear.</p>'}</div>`;
  }

  function filteredInventory() {
    const items = S.player.inventory.filter(item => {
      if (S.filters.slot !== 'all' && item.slot !== S.filters.slot) return false;
      if (S.filters.rarity !== 'all' && item.rarity !== S.filters.rarity) return false;
      const q = S.filters.search.trim().toLowerCase();
      if (!q) return true;
      return [item.name, item.maker, item.theme, item.slot].join(' ').toLowerCase().includes(q);
    });
    if (S.filters.sort === 'newest') return items;
    return items.sort((a,b) => {
      if (S.filters.sort === 'level') return (b.level || 0) - (a.level || 0) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'rarity') return rarityIndex(b.rarity) - rarityIndex(a.rarity) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'value') return (b.value || 0) - (a.value || 0) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'slot') return slotSortIndex(a.slot) - slotSortIndex(b.slot) || (b.rating || 0) - (a.rating || 0);
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  function itemCard(item) {
    const isJunk = canQuickSellItem(S, item);
    const junkPill = isJunk ? '<span class="pill junk-pill">Junk</span>' : '';
    const setDef = getMythicSetDefinition(getItemSetId(item));
    const setPill = setDef ? `<span class="pill rarity-mythic">${escapeHtml(setDef.name)}</span>` : '';
    const setBonusPreview = setBonusPreviewMarkup(item, S);
    const upgradeMark = upgradeMarkup(item, S);
    const rarityLabel = item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : '';
    const rarityEyebrow = rarityLabel ? `<div class="rarity-eyebrow ${rarityClass(item.rarity)}">${rarityLabel}</div>` : '';
    return `<div class="loot-card ${getRarityCardClass(item)}"><div class="split"><div>${rarityEyebrow}<div class="item-name ${rarityClass(item.rarity)}">${item.name}</div><div class="item-level">${getItemLevelLabel(item)}</div><div class="item-meta">${item.slot} • ${item.maker}</div></div><div class="tag-row right-tags">${upgradeMark}${setPill}${junkPill}</div></div><div class="tag-row"><span class="pill stat-pill primary-stat">Power ${item.rating}</span><span class="pill stat-pill">Atk ${item.stats.power}</span><span class="pill stat-pill">Guard ${item.stats.guard}</span><span class="pill stat-pill">HP ${item.stats.hp}</span>${item.stats.speed > 0 ? `<span class="pill">Spd ${item.stats.speed}</span>` : ''}${item.stats.wit > 0 ? `<span class="pill">Wit ${item.stats.wit}</span>` : ''}</div><p class="small">${item.summary}</p>${setBonusPreview}<div class="item-actions polished-actions"><button class="primary mini" data-equip="${item.id}">${upgradeMark ? 'Equip ↑' : 'Equip'}</button><button class="ghost mini sell-value-btn" data-sell="${item.id}">Sell ${formatMoney(sellValue(item))}</button></div></div>`;
  }

  function renderDex() {
    if (!el('dexSummary') || !el('monsterDex') || !el('gearDex')) return;
    const bestDepth = Math.max(1, S.player.depth || S.player.safeExtractDepth || 1);
    el('dexSummary').innerHTML = `
      <div class="split"><div><h2>Emberfall Index</h2><p>Relics and sightings logged by the Warden across the Hollow Stair.</p></div><span class="pill">Best ${escapeHtml(depthShortLabel(bestDepth))}</span></div>
      <div class="tag-row"><span class="pill">Seen gear: ${S.player.discoveredGear.length}</span><span class="pill">Seen monsters: ${S.player.discoveredMonsters.length}</span></div>`;
    el('monsterDex').innerHTML = `<h2>Monster Register</h2><div class="list">${S.player.discoveredMonsters.slice(0, 40).map(n => `<div class="monster-card small">${n}</div>`).join('') || '<p class="small muted">No sightings yet.</p>'}</div>`;
    el('gearDex').innerHTML = `<h2>Relic Register</h2><div class="list">${S.player.discoveredGear.slice(0, 40).map(n => `<div class="monster-card small">${n}</div>`).join('') || '<p class="small muted">No relics logged yet.</p>'}</div>`;
  }

  function renderArchive() {
    if (!el('archivePanel') || !el('settingsPanel')) return;
    const history = asArray(S.player.runHistory, []).filter(isPlainObject).slice(0, 12);
    const historyMarkup = history.map(rawEntry => {
      const r = rawEntry || {};
      const reason = normalizeRunHistoryReason(r.reason);
      const isWin = reason === 'extract';
      const isDefeat = reason === 'defeat';
      const outcomeLabel = runHistoryOutcomeLabel(reason);
      const outcomeClass = isWin ? 'outcome-win' : isDefeat ? 'outcome-loss' : 'outcome-neutral';
      const icon = isWin ? '✓' : isDefeat ? '✕' : '•';
      const zone = cleanDisplayText(r.zone || r.district || 'Hollow Stair', 'Hollow Stair');
      const fallbackDetail = isWin ? 'Extraction Haul secured. Lowfire marked the run complete.' : isDefeat ? 'The run ended here. Unsecured rewards were lost; banked gear and wallet stayed safe.' : 'Descent ended.';
      const detail = cleanDisplayText(r.detail || r.summary || fallbackDetail, fallbackDetail);
      const runLabel = cleanDisplayText(r.runLabel || depthWithRawLabel(r.floor || 1), depthWithRawLabel(1));
      const lootPreview = asArray(r.lootPreview, []).slice(0, 3)
        .map(name => cleanDisplayText(name || ''))
        .filter(Boolean)
        .map(name => `<span class="pill run-history-loot-pill">${escapeHtml(name)}</span>`)
        .join('');
      const meta = [
        `<span><b>${format(numberOr(r.kills, 0, 0, 999999))}</b> kills</span>`,
        `<span><b>${format(numberOr(r.lootCount, 0, 0, 999999))}</b> loot</span>`,
        `<span><b>${format(numberOr(r.xp, 0, 0, 999999))}</b> XP</span>`,
        cleanDisplayText(r.restartLabel || r.checkpointLabel || '') ? `<span><b>${isWin ? 'Next Start' : 'Restart'}:</b> ${escapeHtml(cleanDisplayText(r.restartLabel || r.checkpointLabel || ''))}</span>` : '',
        numberOr(r.eliteMarks, 0, 0, 999999) ? `<span><b>${format(numberOr(r.eliteMarks, 0, 0, 999999))}</b> elite mark</span>` : '',
        numberOr(r.questProgress, 0, 0, 999999) ? `<span><b>${format(numberOr(r.questProgress, 0, 0, 999999))}</b> objective progress</span>` : ''
      ].filter(Boolean).join('');
      const rewardText = runHistoryRewardText(r);
      const dateText = safeRunHistoryDate(r);
      return `<div class="run-history-card combat-feed-line ${runHistoryOutcomeClass(reason)}">
        <span class="feed-icon ${outcomeClass}">${icon}</span>
        <div class="feed-copy">
          <div class="feed-kicker">${escapeHtml(outcomeLabel)} • ${escapeHtml(runLabel)}</div>
          <div class="feed-body"><strong>${escapeHtml(zone)}</strong> — ${escapeHtml(detail)}</div>
          <div class="run-history-meta-grid">${meta}</div>
          <div class="run-history-rewards"><span class="feed-chip ${isWin ? 'feed-chip-extract' : 'feed-chip-danger'}">${isWin ? 'Banked' : 'Lost'}</span><span>${escapeHtml(rewardText)}</span></div>
          ${lootPreview ? `<div class="tag-row run-history-loot-row">${lootPreview}</div>` : ''}
          ${dateText ? `<div class="run-history-sub small muted">${escapeHtml(dateText)}</div>` : ''}
        </div>
      </div>`;
    }).join('') || '<p class="small muted">No descents logged yet. Enter the Hollow Stair to begin.</p>';

    const archiveLines = asArray(S.archive, []).filter(isPlainObject).map(a => {
      const stamp = cleanDisplayText(a.stamp || '');
      const text = cleanDisplayText(a.text || '', 'Archive note unavailable.');
      return `<div class="archive-line"><div class="small muted">${escapeHtml(stamp)}</div><div>${escapeHtml(text)}</div></div>`;
    }).join('') || '<p class="small muted">No Emberfall notes yet.</p>';

    el('archivePanel').innerHTML = `
      <div class="archive-history-head">
        <div><h2>Descent History</h2><p class="small muted">Lowfire records what was banked, what was lost, and where the next descent starts.</p></div>
        <span class="pill">Latest ${format(history.length)}</span>
      </div>
      <div class="list run-history-list">${historyMarkup}</div>
      <div class="sep"></div>
      <h3>Emberfall Notes</h3>
      <div class="list archive-log-list">${archiveLines}</div>`;

    el('settingsPanel').innerHTML = `
      <h2>System Notes</h2>
      <p class="small">DungeonDex v1.3.44</p>
      <div class="tag-row"><span class="pill">Lowfire return</span><span class="pill">Hollow Stair</span><span class="pill">Guarded loop</span></div>
      <div class="sep"></div>
      <div class="log-wrap">${S.player.log.map(line => `<div class="log-line small">${escapeHtml(cleanDisplayText(line))}</div>`).join('')}</div>`;
  }

  function renderStickyBar() {
    const bar = el('stickyBar');
    if (!bar) return;
    bar.classList.remove('context-actions');
    bar.style.display = 'none';
    bar.innerHTML = '';
  }

  function syncScreenState() {
    const shell = document.querySelector('.app-shell');
    const activeDistrict = currentStagingDistrict(S);
    if (shell) {
      Array.from(shell.classList).filter(cls => cls.startsWith('district-tone-')).forEach(cls => shell.classList.remove(cls));
      shell.classList.add(districtToneClass(activeDistrict));
      shell.classList.toggle('run-focus', S.screen === 'run');
      shell.classList.toggle('combat-active', S.screen === 'run' && S.run.active);
    }
    $$('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${S.screen}`));
    $$('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === S.screen));
  }

  function render() {
    try {
      syncScreenState();
      renderStatBoxes();
      renderTown();
      renderRun();
      renderGear();
      renderDex();
      renderArchive();
      renderStickyBar();
      syncScreenState();
    } catch (err) {
      console.warn('DungeonDex render error (partial):', err);
    }
    updateSaveStatus(save(S));
    try { bindDynamic(); } catch(err) { console.warn('DungeonDex bindDynamic error:', err); }
  }

  let lastCombatAutosaveAt = 0;
  function maybeSaveCombat(force = false) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (!force && now - lastCombatAutosaveAt < COMBAT_AUTOSAVE_MS) return;
    lastCombatAutosaveAt = now;
    updateSaveStatus(save(S));
  }

  function renderCombatTick(forceSave = false) {
    if (!S.run.active) {
      render();
      return;
    }
    try {
      syncScreenState();
      renderRun();
      renderStickyBar();
    } catch (err) {
      console.warn('DungeonDex combat render error:', err);
    }
    maybeSaveCombat(forceSave);
    try { bindCombatActions(); } catch(err) { console.warn('DungeonDex combat bind error:', err); }
  }

  function refreshInventoryOnly() {
    renderInventoryPanel();
    updateSaveStatus(save(S));
    bindInventoryActions();
  }

  let actionGuardUntil = 0;
  let combatActionGuardUntil = 0;
  let combatActionInFlight = false;
  function runGuardedAction(fn) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (now < actionGuardUntil) return;
    actionGuardUntil = now + ACTION_GUARD_MS;
    try {
      fn();
    } catch (err) {
      console.warn('DungeonDex guarded action skipped after an error:', err);
      updateSaveStatus(save(S));
    }
  }

  function runCombatGuardedAction(fn) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (combatActionInFlight || now < combatActionGuardUntil) return;
    combatActionGuardUntil = now + COMBAT_ACTION_GUARD_MS;
    combatActionInFlight = true;
    try {
      fn();
    } catch (err) {
      console.warn('DungeonDex combat action skipped after an error:', err);
      maybeSaveCombat(true);
    } finally {
      combatActionInFlight = false;
    }
  }

  function bindInventoryActions() {
    $$('[data-equip]').forEach(btn => btn.onclick = () => runGuardedAction(() => { equipItem(S, btn.dataset.equip); render(); }));
    $$('[data-sell]').forEach(btn => btn.onclick = () => runGuardedAction(() => { const paid = sellItem(S, btn.dataset.sell); if (paid) showGoldPopup(paid); render(); }));
    const sellJunkBtn = el('sellJunkGearBtn');
    if (sellJunkBtn) sellJunkBtn.onclick = () => runGuardedAction(() => {
      const result = sellAllQuickSafeGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });

    const sellAllBtn = el('sellAllGearBtn');
    if (sellAllBtn) sellAllBtn.onclick = () => runGuardedAction(() => {
      const count = S.player.inventory.filter(item => canSellAllGearItem(S, item)).length;
      if (!count) return;
      const firstConfirm = window.confirm(`Sell ALL ${count} unequipped sellable gear items? Equipped, protected, favorite, locked, and special items will stay.`);
      if (!firstConfirm) return;
      const secondConfirm = window.confirm('Final warning: press Yes again to permanently sell this gear.');
      if (!secondConfirm) return;
      const result = sellAllGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });
  }

  function bindCombatActions() {
    $$('[data-action]').forEach(btn => {
      const handler = (e) => {
        if (e) e.preventDefault();
        const action = btn.dataset.action;
        if (!hasActiveCombat(S) || !CORE_COMBAT_ACTIONS.includes(action)) return;
        btn.classList.add('tap-now');
        window.setTimeout(() => btn.classList.remove('tap-now'), 90);
        runCombatGuardedAction(() => {
          const result = combatAction(S, action) || {};
          if (result.fullRender || !S.run.active) {
            render();
          } else {
            renderCombatTick(!!result.saveNow);
          }
        });
      };
      const canAct = hasActiveCombat(S) && CORE_COMBAT_ACTIONS.includes(btn.dataset.action);
      btn.disabled = !canAct;
      btn.onclick = (e) => {
        if (e && e.detail !== 0) return;
        handler(e);
      };
      btn.onpointerdown = handler;
    });
  }

  function bindIntroModalActions() {
    if (el('introModalCloseBtn')) el('introModalCloseBtn').onclick = hideIntroModal;
    if (el('introModalEnterDungeonBtn')) {
      el('introModalEnterDungeonBtn').onclick = () => runGuardedAction(() => {
        hideIntroModal();
        startRun(S);
        render();
      });
    }
    if (el('introModalContinueRunBtn')) {
      el('introModalContinueRunBtn').onclick = () => runGuardedAction(() => {
        hideIntroModal();
        if (continueRun(S)) switchScreen('run');
        else render();
      });
    }
    $$('[data-charter-start]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      hideIntroModal();
      startCharterRun(S, btn.dataset.charterStart);
      render();
    }));
  }

  function bindDynamic() {
    $$('[data-buy]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyMerchantItem(S, btn.dataset.buy); render(); }));
    $$('[data-buy-district]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyDistrictWare(S, btn.dataset.buyDistrict); render(); }));
    $$('[data-start-contract]').forEach(btn => btn.onclick = () => runGuardedAction(() => { startEliteContract(S, btn.dataset.startContract); render(); }));
    bindInventoryActions();
    bindCombatActions();
    if (el('refreshMerchantBtn')) el('refreshMerchantBtn').onclick = () => runGuardedAction(() => { rollMerchant(S); render(); });
    if (el('forgeBtn')) el('forgeBtn').onclick = () => runGuardedAction(() => { forgeItem(S); render(); });
    if (el('claimEliteContractBtn')) el('claimEliteContractBtn').onclick = () => runGuardedAction(() => {
      const claimBtn = el('claimEliteContractBtn');
      if (claimBtn) claimBtn.disabled = true;
      const claimed = claimEliteContract(S);
      if (!claimed && claimBtn) claimBtn.disabled = false;
      render();
    });
    if (el('slotFilter')) el('slotFilter').onchange = (e) => { S.filters.slot = e.target.value; render(); };
    if (el('rarityFilter')) el('rarityFilter').onchange = (e) => { S.filters.rarity = e.target.value; render(); };
    if (el('sortFilter')) el('sortFilter').onchange = (e) => { S.filters.sort = e.target.value; render(); };
    if (el('searchFilter')) el('searchFilter').oninput = (e) => { S.filters.search = e.target.value; refreshInventoryOnly(); };
    $$('[data-charter-start]').forEach(btn => btn.onclick = () => runGuardedAction(() => { startCharterRun(S, btn.dataset.charterStart); render(); }));
    if (el('runFromIdleBtn')) el('runFromIdleBtn').onclick = () => runGuardedAction(() => { startRun(S); render(); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch]));
  }

  function checkpointAuditRow(label, safeDepth, returnDepth, endedDepth, reason = 'defeat', ownedCharters = []) {
    const mock = {
      player: {
        safeExtractDepth: progressDepthValue(safeDepth, 1),
        returnDepth: progressDepthValue(returnDepth, safeDepth || 1),
        permanentStartFloor: 1,
        deepStairCharters: normalizeCharterDepthList(ownedCharters),
        goldSink: createGoldSinkState()
      },
      run: {
        active: true,
        floor: progressDepthValue(endedDepth, returnDepth || safeDepth || 1),
        zone: zoneName(progressDepthValue(endedDepth, 1))
      }
    };
    const unlocked = getUnlockedCharterDepth(mock);
    const nextReturn = reason === 'extract'
      ? progressDepthValue(endedDepth, 1)
      : hardcoreDeathCheckpointDepth(mock, endedDepth);
    mock.run.active = false;
    mock.player.returnDepth = nextReturn;
    return {
      case: label,
      reason,
      endedDepth: progressDepthValue(endedDepth, 1),
      safeDepth: mock.player.safeExtractDepth,
      unlockedCharter: unlocked || 0,
      nextReturnDepth: nextReturn,
      nextStart: defaultRunStartDepth(mock),
      nextDistrict: districtByDepth(nextReturn).name,
      checkpointLabel: hardcoreDepthReturnLabel(nextReturn),
      note: reason === 'extract'
        ? 'extract keeps earned return depth'
        : (nextReturn >= 40 ? 'death returns to unlocked charter checkpoint' : 'death returns to Lowfire')
    };
  }

  function runCheckpointCharterAudit() {
    const rows = [
      checkpointAuditRow('fresh death before first charter', 1, 1, 12, 'defeat'),
      checkpointAuditRow('extract before first charter', 1, 1, 37, 'extract'),
      checkpointAuditRow('death after D72 safe progress', 72, 72, 75, 'defeat'),
      checkpointAuditRow('extract at D121', 80, 80, 121, 'extract'),
      checkpointAuditRow('death after D121 safe progress', 121, 121, 128, 'defeat'),
      checkpointAuditRow('death after D805 safe progress', 805, 805, 820, 'defeat'),
      checkpointAuditRow('extract at D4000', 805, 805, 4000, 'extract'),
      checkpointAuditRow('death before first mega-charter', 4000, 4000, 4100, 'defeat'),
      checkpointAuditRow('death after D5800 mega-charter', 5800, 5800, 6110, 'defeat')
    ];
    console.info('DungeonDex checkpoint/charter QA: extraction keeps the earned return depth; death returns to Lowfire or the best unlocked charter milestone. Use these rows to verify return flow without mutating your save.');
    console.table(rows);
    return rows;
  }

  if (typeof window !== 'undefined') {
    window.DungeonDexBalanceAudit = runDeepScalingAudit;
    window.DungeonDexCheckpointAudit = runCheckpointCharterAudit;
  }

  function bindStatic() {
    $$('.tab').forEach(btn => btn.addEventListener('click', () => switchScreen(btn.dataset.screen)));
    const startRunBtn = el('startRunBtn');
    if (startRunBtn) startRunBtn.onclick = () => runGuardedAction(() => {
      if (S.run?.active) {
        if (continueRun(S)) switchScreen('run');
        else render();
        return;
      }
      startRun(S);
      render();
    });
    const restBtn = el('restBtn');
    if (restBtn) restBtn.onclick = () => runGuardedAction(() => { restPlayer(S); render(); });
    const saveBtn = el('saveBtn');
    if (saveBtn) saveBtn.onclick = () => { pushLog(S, save(S) ? 'Manual save written.' : 'Manual save failed; browser storage is unavailable.'); render(); };
    const resetBtn = el('resetBtn');
    if (resetBtn) resetBtn.onclick = () => {
      if (!confirm('Reset all progress?')) return;
      S = createBaseState();
      render();
    };
  }

  bindStatic();
  render();
  showIntroModalOnce();
})();
