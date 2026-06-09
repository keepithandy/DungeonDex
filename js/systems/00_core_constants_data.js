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
   * @property {{tags:string[], title:string, firstMarkedAt:string, notes:string[], kills:number, bossKills:number, eliteKills:number, chaptersCleared:number}} [gearMemory]
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
  const BUILD = '1.6.20';
  const VISIBLE_VERSION_LABEL = 'DungeonDex v1.6.20';
  const MAX_ITEM_LEVEL = 3250;
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
  const FAMOUS_GEAR_MEMORY_TAGS = Object.freeze(['Boss-Worn', 'Rival-Marked', 'Deepmarked', 'Charter-Carried', 'Archive-Worthy']);
  const RARITIES = [
    { key:'common', mult:1, color:'rarity-common', chance:40 },
    { key:'uncommon', mult:1.18, color:'rarity-uncommon', chance:26 },
    { key:'rare', mult:1.42, color:'rarity-rare', chance:17 },
    { key:'epic', mult:1.75, color:'rarity-epic', chance:10 },
    { key:'legendary', mult:2.15, color:'rarity-legendary', chance:5 },
    { key:'mythic', mult:2.55, color:'rarity-mythic', chance:2 }
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
    },
    sootveil_regalia: {
      id: 'sootveil_regalia',
      name: 'Sootveil Regalia',
      theme: 'ashglass / deep survival / run-event salvage',
      role: 'Living Dungeon deep-run survival',
      slots: MYTHIC_SET_SLOTS,
      pieceNames: {
        helm: 'Sootveil Crown',
        armor: 'Sootveil Vest',
        boots: 'Sootveil Boots',
        gloves: 'Sootveil Gloves',
        cloak: 'Sootveil Mantle'
      },
      bonuses: {
        2: 'Elite critical strikes deal 25% less damage',
        3: '+15% Run Event gold and ember; improved shard salvage',
        5: 'Ignore the first lethal strike each run'
      }
    }
  };

  const BOSS_TROPHY_DEFINITIONS = [
    { id:'lowfire_fang', boss:1, requiredDepth:15, name:'Lowfire Fang', source:'Boss Floor 5', tone:'Starter Relic', icon:'fang', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A smoke-black tooth pulled from the first real thing that tried to end the descent.' },
    { id:'cinder_crown', boss:2, requiredDepth:30, name:'Cinder Crown', source:'Boss Floor 10', tone:'Charred Iron', icon:'crown', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A bent crown of furnace metal, still warm where the skull met flame.' },
    { id:'gravetoll_bell', boss:3, requiredDepth:45, name:'Gravetoll Bell', source:'Boss Floor 15', tone:'Bone Chime', icon:'bell', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A cracked bell with a pale clapper. It rings once for every room owed.' },
    { id:'mireglass_eye', boss:4, requiredDepth:60, name:'Mireglass Eye', source:'Boss Floor 20', tone:'Wet Glass', icon:'eye', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A green-black eye sealed behind broken glass. It does not blink anymore.' },
    { id:'butchers_moon', boss:5, requiredDepth:75, name:'Butcher’s Moon', source:'Boss Floor 25', tone:'Blood Crescent', icon:'moon', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A crescent blade trophy dried dark at the edge. The handle still twitches.' },
    { id:'red_chapel_thorn', boss:6, requiredDepth:90, name:'Red Chapel Thorn', source:'Boss Floor 30', tone:'Ritual Thorn', icon:'thorn', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A chapel barb wrapped through a small skull, polished by prayer and violence.' },
    { id:'salt_forge_maw', boss:7, requiredDepth:105, name:'Salt Forge Maw', source:'Boss Floor 35', tone:'Kiln Jaw', icon:'maw', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A metal jawplate split by orange furnace cracks and old bite marks.' },
    { id:'ivory_span_halo', boss:8, requiredDepth:120, name:'Ivory Span Halo', source:'Boss Floor 40', tone:'Broken Sanctum', icon:'halo', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A holy ring snapped around teeth. Whatever wore it died badly.' },
    { id:'noctis_sigil', boss:9, requiredDepth:135, name:'Noctis Sigil', source:'Boss Floor 45', tone:'Black Rite', icon:'sigil', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A hooked occult crest. The dark around it looks carved, not cast.' },
    { id:'hollow_stair_skull', boss:10, requiredDepth:150, name:'Hollow Stair Skull', source:'Boss Floor 50', tone:'Gore Prestige', icon:'skull', image:'assets/trophies/hollow_stair_skull_trophy.png', flavor:'A horned skull marked with the stair. Blood gathers under it even when dry.' }
  ];

  const ELITE_TROPHY_DEFINITIONS = [
    { id:'glassfang_blade_chip', sourceElite:'Glassfang Brute', floorName:'Lowfire District', name:'Glassfang Blade Chip', bonusText:'+1% Elite Board payout', flavor:'A sliver of cracked blade glass from a contract target that never stayed still.' },
    { id:'ash_crowned_buckle', sourceElite:'Ash-Crowned Marauder', floorName:'Ashgate Warrens', name:'Ash-Crowned Buckle', bonusText:'+1% Elite Board payout', flavor:'A scorched buckle pried from a marauder wrapped in old authority.' },
    { id:'mireglass_ledger_shard', sourceElite:'Mireglass Collector', floorName:'Mireglass District', name:'Mireglass Ledger Shard', bonusText:'+1% Elite Board payout', flavor:'A green shard etched with a broken tally line and a wet ink stain.' },
    { id:'rook_eater_pin', sourceElite:'Rook-Eater Venn', floorName:'Rookery', name:'Cracked Guild Pin', bonusText:'+1% Elite Board payout', flavor:'A bent pin that still smells faintly of feathers and office smoke.' },
    { id:'cinderjaw_writ_seal', sourceElite:'Cinderjaw Bailiff', floorName:'Lowfire District', name:'Cinderjaw Writ Seal', bonusText:'+1% Elite Board payout', flavor:'A broken seal once used to stamp debts onto living hands.' },
    { id:'saltgrave_hook', sourceElite:'Saltgrave Hookman', floorName:'Saltgrave', name:'Saltgrave Hook', bonusText:'+1% Elite Board payout', flavor:'A hooked tool with a blade edge polished by salt and rope.' },
    { id:'ivory_span_plate', sourceElite:'Ivory Span Oathbreaker', floorName:'Ivory Span', name:'Broken Oath Plate', bonusText:'+1% Elite Board payout', flavor:'A pale plate snapped from ceremonial armor that could not hold its promise.' },
    { id:'red_chapel_hymn_scrap', sourceElite:'Red Chapel Hex-Singer', floorName:'Red Chapel', name:'Red Chapel Hymn Scrap', bonusText:'+1% Elite Board payout', flavor:'A torn hymn fragment that still carries a low, ugly vibration.' }
  ];

  const ELITE_TROPHY_BY_ELITE = {
    'glassfang brute': 'glassfang_blade_chip',
    'ash-crowned marauder': 'ash_crowned_buckle',
    'mireglass collector': 'mireglass_ledger_shard',
    'rook-eater venn': 'rook_eater_pin',
    'cinderjaw bailiff': 'cinderjaw_writ_seal',
    'saltgrave hookman': 'saltgrave_hook',
    'ivory span oathbreaker': 'ivory_span_plate',
    'red chapel hex-singer': 'red_chapel_hymn_scrap'
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
  const normalizeItemLevel = (value, fallback = 1) => Math.max(1, Math.floor(numberOr(value, fallback, 1, MAX_ITEM_LEVEL)));


// v1.4.2 Sootveil Mythic Set Pass
window.DD_MONSTER_ARCHETYPES = [
  "Brute","Ritualist","Skulker","Ashbound",
  "Mireborn","Furnace Spawn","Hollowed","Warden"
];

window.ddGetMonsterCue = function(name){
  const cues = [
    "The creature watches silently.",
    "Ash drifts from the enemy's armor.",
    "A hostile presence fills the chamber.",
    "The monster prepares to strike."
  ];
  return cues[Math.floor(Math.random()*cues.length)];
};
