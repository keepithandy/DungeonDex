  'use strict';

// Core constants, utility helpers, item/monster/district data
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
  const BUILD = 'DungeonDex v1.3.47d';
  const VISIBLE_VERSION_LABEL = 'DungeonDex v1.3.47d';
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
