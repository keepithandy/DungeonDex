import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('./js/systems/29_monster_backdrops_canvas.js', 'utf8');

function record(label, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    if (detail) console.error(detail);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${label}`);
}

const context = {
  console,
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 0; },
  clearTimeout: () => {},
  requestAnimationFrame: fn => { if (typeof fn === 'function') fn(); return 1; },
  devicePixelRatio: 1,
  globalThis: null,
  window: null
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: '29_monster_backdrops_canvas.js' });

record('Monster backdrop API is exposed as complete visual system',
  typeof context.generateMonsterBackdrop === 'function'
  && typeof context.renderMonsterBackdrop === 'function'
  && typeof context.monsterBackdropCatalog === 'function'
  && context.DDMonsterBackdropCanvas?.visualOnly === true
  && context.DDMonsterBackdropCanvas?.complete === true
);

const baseState = {
  run: {
    floor: 42,
    zone: 'salt forge',
    monster: {
      id: 'blacksalt_guard_42',
      name: 'Blacksalt Guard',
      family: 'Construct',
      type: 'Construct',
      tier: 'Elite',
      hp: 500,
      maxHp: 500,
      power: 100
    }
  },
  player: { hp: 100, maxHp: 100, gold: 25, shards: 0, ember: 0 }
};

const before = JSON.stringify(baseState);
const first = context.generateMonsterBackdrop(baseState.run.monster, baseState);
const second = context.generateMonsterBackdrop(baseState.run.monster, baseState);
record('Backdrop generation is deterministic for same state and monster', JSON.stringify(first) === JSON.stringify(second));
record('Backdrop generation does not mutate state', JSON.stringify(baseState) === before);
record('Backdrop contract stays visual-only and non-gameplay', first.visualOnly === true && first.lockedVisualOnly === true && first.gameplayAffecting === false && first.renderer === 'canvas' && first.complete === true);
record('Backdrop maps known monster/district identity to a theme', first.kind === 'salt-forge' && first.themeLabel === 'Salt Forge');
record('Backdrop exposes no gameplay action fields', !Object.keys(first).some(key => /reward|entry|damage|hp|power|scale|combatHook|activation/i.test(key)), JSON.stringify(Object.keys(first)));

const boss = context.generateMonsterBackdrop({ id: 'void_boss', name: 'Noctis Watcher', family: 'Shade', tier: 'Boss' }, { run: { floor: 96, zone: 'noctis' }, player: {} });
record('Boss backdrop uses stronger visual intensity only', boss.intensity === 3 && boss.visualOnly === true && boss.gameplayAffecting === false && boss.props.includes('boss-frame'));

const catalog = context.monsterBackdropCatalog();
record('Backdrop catalog covers all production themes', Array.isArray(catalog) && catalog.length >= 9 && catalog.every(entry => entry.visualOnly === true && entry.kind && entry.label && entry.prop && entry.horizon));

const noOp = () => {};
const fakeContext = new Proxy({
  createLinearGradient: () => ({ addColorStop: noOp }),
  createRadialGradient: () => ({ addColorStop: noOp }),
  save: noOp, restore: noOp, setTransform: noOp, clearRect: noOp, fillRect: noOp,
  beginPath: noOp, moveTo: noOp, lineTo: noOp, closePath: noOp, fill: noOp, stroke: noOp,
  strokeRect: noOp, quadraticCurveTo: noOp, arc: noOp
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return target[prop] = noOp;
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});

function makeCanvas(width = 320, height = 150) {
  return {
    width: 0,
    height: 0,
    clientWidth: width,
    clientHeight: height,
    dataset: {},
    style: {},
    getContext: type => type === '2d' ? fakeContext : null,
    getBoundingClientRect: () => ({ width, height })
  };
}

const canvas = makeCanvas();
record('Canvas renderer accepts the generated backdrop', context.renderMonsterBackdrop(canvas, first) === true && canvas.width === 320 && canvas.height === 150 && canvas.dataset.renderSize === '320x150@1');

const resizedCanvas = makeCanvas(414, 168);
record('Canvas renderer tracks resize dimensions', context.renderMonsterBackdrop(resizedCanvas, first) === true && resizedCanvas.dataset.renderSize === '414x168@1');

if (process.exitCode) process.exit(process.exitCode);
