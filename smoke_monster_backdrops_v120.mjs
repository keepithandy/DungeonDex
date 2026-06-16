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
  setTimeout: () => 0,
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

record('Monster backdrop API is exposed', typeof context.generateMonsterBackdrop === 'function' && typeof context.renderMonsterBackdrop === 'function' && context.DDMonsterBackdropCanvas?.visualOnly === true);

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
  player: {
    hp: 100,
    maxHp: 100,
    gold: 25,
    shards: 0,
    ember: 0
  }
};
const before = JSON.stringify(baseState);
const first = context.generateMonsterBackdrop(baseState.run.monster, baseState);
const second = context.generateMonsterBackdrop(baseState.run.monster, baseState);
record('Backdrop generation is deterministic for same state and monster', JSON.stringify(first) === JSON.stringify(second));
record('Backdrop generation does not mutate state', JSON.stringify(baseState) === before);
record('Backdrop contract stays visual-only and non-gameplay', first.visualOnly === true && first.lockedVisualOnly === true && first.gameplayAffecting === false && first.renderer === 'canvas');
record('Backdrop maps known monster/district identity to a theme', first.kind === 'salt-forge' && first.themeLabel === 'Salt Forge');
record('Backdrop exposes no gameplay action fields', !Object.keys(first).some(key => /reward|entry|damage|hp|power|scale|combatHook|activation/i.test(key)), JSON.stringify(Object.keys(first)));

const boss = context.generateMonsterBackdrop({ id: 'void_boss', name: 'Noctis Watcher', family: 'Shade', tier: 'Boss' }, { run: { floor: 96, zone: 'noctis' }, player: {} });
record('Boss backdrop uses stronger visual intensity only', boss.intensity === 3 && boss.visualOnly === true && boss.gameplayAffecting === false);

const noOp = () => {};
const fakeContext = new Proxy({
  createLinearGradient: () => ({ addColorStop: noOp }),
  createRadialGradient: () => ({ addColorStop: noOp }),
  save: noOp,
  restore: noOp,
  setTransform: noOp,
  clearRect: noOp,
  fillRect: noOp,
  beginPath: noOp,
  moveTo: noOp,
  lineTo: noOp,
  closePath: noOp,
  fill: noOp,
  stroke: noOp,
  strokeRect: noOp,
  quadraticCurveTo: noOp,
  arc: noOp
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
const canvas = {
  width: 0,
  height: 0,
  clientWidth: 320,
  clientHeight: 150,
  style: {},
  getContext: type => type === '2d' ? fakeContext : null,
  getBoundingClientRect: () => ({ width: 320, height: 150 })
};
record('Canvas renderer accepts the generated backdrop', context.renderMonsterBackdrop(canvas, first) === true && canvas.width === 320 && canvas.height === 150);

if (process.exitCode) process.exit(process.exitCode);
