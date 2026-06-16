'use strict';

// DungeonDex v1.20.0 - Procedural Monster Backdrop Canvas Foundation.
// Deterministic, visual-only canvas layer for combat monster stages.
(function(root){
  const BUILD_TAG = 'monster_backdrop_canvas_foundation_v1';
  if (!root || root.DDMonsterBackdropCanvas?.buildTag === BUILD_TAG) return;

  const THEMES = Object.freeze({
    lowfire:{label:'Lowfire Crypt',sky:'#120c08',floor:'#251711',fog:'rgba(255,145,63,.14)',accent:'#f0a24d',shadow:'#050302',prop:'pillars'},
    veyruhn:{label:'Bellforge Works',sky:'#130908',floor:'#2a1510',fog:'rgba(255,82,38,.14)',accent:'#ff7d44',shadow:'#070302',prop:'chains'},
    mireglass:{label:'Mireglass Hollow',sky:'#07120d',floor:'#122018',fog:'rgba(107,219,150,.13)',accent:'#76d99a',shadow:'#030805',prop:'reeds'},
    'red-chapel':{label:'Red Chapel',sky:'#160809',floor:'#241012',fog:'rgba(255,80,74,.13)',accent:'#ff746c',shadow:'#070203',prop:'arches'},
    'salt-forge':{label:'Salt Forge',sky:'#12100a',floor:'#24200f',fog:'rgba(255,225,150,.12)',accent:'#ffe196',shadow:'#060504',prop:'crystals'},
    'sunken-court':{label:'Sunken Court',sky:'#07101a',floor:'#111b26',fog:'rgba(109,184,255,.13)',accent:'#72b8ff',shadow:'#02050a',prop:'banners'},
    rookery:{label:'Ash Rookery',sky:'#0b0b0d',floor:'#19171a',fog:'rgba(214,194,156,.11)',accent:'#d8c39a',shadow:'#030304',prop:'rafters'},
    noctis:{label:'Noctis Vault',sky:'#06050d',floor:'#12101d',fog:'rgba(176,122,255,.13)',accent:'#b77cff',shadow:'#020106',prop:'void'},
    generic:{label:'Hollow Stair',sky:'#0d0b0a',floor:'#171310',fog:'rgba(255,190,105,.11)',accent:'#f0a24d',shadow:'#030202',prop:'stones'}
  });

  function stateRef(){ /* global S */ return typeof S !== 'undefined' ? S : (root.S || {}); }
  function num(value, fallback, min, max){ const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; }
  function token(value){ return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function has(key, terms){ return terms.some(term => key.includes(term)); }
  function hash(value){ let h = 2166136261; const text = String(value || 'dungeondex'); for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function randFrom(seed){ let s = seed >>> 0; return function(){ s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function band(depth){ const d = Math.floor(num(depth, 1, 1, 999999)); return d >= 120 ? 'abyssal' : d >= 80 ? 'grave' : d >= 40 ? 'deep' : d >= 15 ? 'pressured' : 'fresh'; }
  function rgba(hex, alpha){ const clean = String(hex || '#fff').replace('#', ''); const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean.padEnd(6, '0').slice(0, 6); const n = parseInt(full, 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`; }

  function currentDistrict(state, depth){
    try { /* global getLoreDepthProgress, getLoreFloorDistrict */
      if (typeof getLoreDepthProgress === 'function' && typeof getLoreFloorDistrict === 'function') return getLoreFloorDistrict(getLoreDepthProgress(depth)?.floorNumber || 1);
    } catch (_) {}
    return null;
  }

  function fallbackKind(state, monster, district, depth){
    const d = Math.floor(num(depth ?? state?.run?.floor ?? state?.player?.returnDepth, 1, 1, 999999));
    const districtKey = token([district?.id, district?.tone, district?.name, state?.run?.zone].filter(Boolean).join(' '));
    const monsterKey = token([monster?.id, monster?.name, monster?.family, monster?.type, monster?.tier].filter(Boolean).join(' '));
    if (d <= 4 || has(districtKey, ['lowsteps','lowfire','ashgate'])) return 'lowfire';
    if (has(districtKey, ['saltforge','salt','hunger','kiln','mineral'])) return 'salt-forge';
    if (has(districtKey, ['veyruhn','bellforge','debtworks','cinderbone','forge','furnace'])) return 'veyruhn';
    if (has(districtKey, ['mireglass','mire','sootveil','swamp'])) return 'mireglass';
    if (has(districtKey, ['redchapel','chapel','blacktithe','ritual'])) return 'red-chapel';
    if (has(districtKey, ['sunkencourt','sunken','redwake','catacomb','drowned'])) return 'sunken-court';
    if (has(districtKey, ['rookery','rafter'])) return 'rookery';
    if (has(districtKey, ['noctis','atelier','lanternless','lowflame','vault'])) return 'noctis';
    if (has(monsterKey, ['harpy','silkbound','rookery','feather','wing'])) return 'rookery';
    if (has(monsterKey, ['mireborn','venom','spitter','frostbit','mireglass'])) return 'mireglass';
    if (has(monsterKey, ['bloodlit','cultist','gravesworn','revenant','bleed'])) return 'red-chapel';
    if (has(monsterKey, ['sunken','knight','warden','chill','drain'])) return 'sunken-court';
    if (has(monsterKey, ['blacksalt','starved','construct','guardbreak','rage'])) return 'salt-forge';
    if (has(monsterKey, ['ashwake','burn','ghoul','husk','beast'])) return 'lowfire';
    if (has(monsterKey, ['shade','watcher','dreadmarked','lanterneyed','seer','hex'])) return 'noctis';
    return d <= 10 ? 'lowfire' : d <= 25 ? 'veyruhn' : d <= 38 ? 'mireglass' : d <= 50 ? 'salt-forge' : d <= 62 ? 'red-chapel' : d <= 78 ? 'sunken-court' : d <= 100 ? 'noctis' : 'generic';
  }

  function resolveKind(state, monster, district, depth){
    try { /* global combatBackdropKind */
      if (typeof combatBackdropKind === 'function') { const kind = combatBackdropKind(state, district, depth, monster); if (THEMES[kind]) return kind; }
    } catch (_) {}
    return fallbackKind(state, monster, district, depth);
  }

  function generateMonsterBackdrop(monster, state, options){
    const safeState = state && typeof state === 'object' ? state : stateRef();
    const activeMonster = monster || safeState?.run?.monster || null;
    const opts = options && typeof options === 'object' ? options : {};
    const depth = Math.floor(num(opts.depth ?? safeState?.run?.floor ?? safeState?.player?.returnDepth, 1, 1, 999999));
    const district = opts.district || currentDistrict(safeState, depth);
    const kind = resolveKind(safeState, activeMonster, district, depth);
    const theme = THEMES[kind] || THEMES.generic;
    const tier = String(activeMonster?.tier || 'Common');
    const tierKey = tier.toLowerCase();
    const depthBand = band(depth);
    const seed = hash(['DungeonDexBackdrop', kind, depthBand, depth, tierKey, activeMonster?.id, activeMonster?.name, activeMonster?.family].filter(Boolean).join('|'));
    const intensity = tierKey === 'boss' ? 3 : tierKey === 'elite' ? 2 : 1;
    return Object.freeze({
      contractId:'monster_backdrop_canvas_foundation_v1', renderer:'canvas', visualOnly:true, lockedVisualOnly:true, gameplayAffecting:false,
      kind, themeLabel:theme.label, depth, depthBand, tier, intensity, seed, propCount:Math.max(3, Math.min(9, 3 + intensity + Math.floor(depth / 25))),
      props:Object.freeze([theme.prop, 'fog', tierKey === 'boss' ? 'boss-frame' : tierKey === 'elite' ? 'elite-glow' : 'stage-frame']),
      colors:Object.freeze({ sky:theme.sky, floor:theme.floor, fog:theme.fog, accent:theme.accent, shadow:theme.shadow })
    });
  }

  function poly(ctx, pts, fill){ if (!pts.length) return; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }

  function drawProps(ctx, w, h, backdrop, rand){
    const c = backdrop.colors, baseY = h * .78, prop = backdrop.props?.[0] || 'stones';
    for (let i = 0; i < backdrop.propCount; i += 1) {
      const x = w * (i % 2 === 0 ? .08 + rand() * .22 : .70 + rand() * .22), tall = h * (.28 + rand() * .32), wide = w * (.035 + rand() * .04), y = baseY + rand() * h * .05;
      if (prop === 'arches') { ctx.strokeStyle = rgba(c.accent,.18); ctx.lineWidth = Math.max(3,w*.012); ctx.beginPath(); ctx.moveTo(x-wide,y); ctx.lineTo(x-wide,y-tall*.55); ctx.quadraticCurveTo(x,y-tall,x+wide,y-tall*.55); ctx.lineTo(x+wide,y); ctx.stroke(); }
      else if (prop === 'chains') { ctx.strokeStyle = rgba(c.accent,.18); ctx.lineWidth = Math.max(2,w*.006); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x + Math.sin(i) * wide, y - tall * .1); ctx.stroke(); }
      else if (prop === 'crystals') poly(ctx, [[x,y-tall],[x+wide,y-tall*.38],[x,y],[x-wide,y-tall*.38]], rgba(c.accent,.18));
      else if (prop === 'reeds') { ctx.strokeStyle = rgba(c.accent,.18); ctx.lineWidth = Math.max(1,w*.004); for (let r=0;r<4;r+=1){ ctx.beginPath(); ctx.moveTo(x+(r-1.5)*wide*.32,y); ctx.quadraticCurveTo(x+(rand()-.5)*wide,y-tall*.52,x+(rand()-.5)*wide*1.5,y-tall); ctx.stroke(); } }
      else if (prop === 'banners') { ctx.strokeStyle = rgba(c.accent,.16); ctx.lineWidth = Math.max(2,w*.005); ctx.beginPath(); ctx.moveTo(x,y-tall); ctx.lineTo(x,y); ctx.stroke(); poly(ctx, [[x,y-tall],[x+wide*1.2,y-tall*.9],[x+wide*.7,y-tall*.55],[x,y-tall*.62]], rgba(c.accent,.14)); }
      else if (prop === 'rafters') { ctx.strokeStyle = rgba(c.accent,.16); ctx.lineWidth = Math.max(3,w*.009); ctx.beginPath(); ctx.moveTo(x-wide*2,h*.12+rand()*h*.18); ctx.lineTo(x+wide*3,h*.28+rand()*h*.22); ctx.stroke(); }
      else if (prop === 'void') { ctx.fillStyle = rgba(c.accent,.34); ctx.beginPath(); ctx.arc(x,y-tall*(.45+rand()*.4),Math.max(1.5,w*.004),0,Math.PI*2); ctx.fill(); }
      else poly(ctx, [[x-wide,y],[x-wide*.7,y-tall],[x+wide*.65,y-tall*.88],[x+wide,y]], rgba(c.accent,.12));
      poly(ctx, [[x-wide*1.4,y],[x-wide,y-tall*.18],[x+wide,y-tall*.14],[x+wide*1.3,y]], rgba(c.shadow,.58));
    }
  }

  function renderMonsterBackdrop(canvas, backdrop){
    if (!canvas || typeof canvas.getContext !== 'function' || !backdrop) return false;
    const ctx = canvas.getContext('2d'); if (!ctx) return false;
    const box = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const cssW = Math.max(1, Math.floor(canvas.clientWidth || box?.width || 320)), cssH = Math.max(1, Math.floor(canvas.clientHeight || box?.height || 150));
    const dpr = Math.max(1, Math.min(2, num(root.devicePixelRatio, 1, 1, 4)));
    canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr); canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    const c = backdrop.colors, rand = randFrom(backdrop.seed || 1);
    ctx.save(); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
    const sky = ctx.createLinearGradient(0,0,0,cssH); sky.addColorStop(0,c.sky); sky.addColorStop(.66,c.shadow); sky.addColorStop(1,c.floor); ctx.fillStyle = sky; ctx.fillRect(0,0,cssW,cssH);
    const glow = ctx.createRadialGradient(cssW*.5,cssH*.58,0,cssW*.5,cssH*.58,Math.max(cssW,cssH)*.55); glow.addColorStop(0,rgba(c.accent,backdrop.intensity===3?.26:backdrop.intensity===2?.20:.14)); glow.addColorStop(.56,'rgba(0,0,0,0)'); glow.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0,0,cssW,cssH);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0,cssH*.72,cssW,cssH*.28); drawProps(ctx, cssW, cssH, backdrop, rand);
    for (let i=0, count=backdrop.depthBand==='fresh'?3:backdrop.depthBand==='pressured'?4:5; i<count; i+=1) { ctx.globalAlpha = .18 + rand()*.12; ctx.fillStyle = c.fog; const y = cssH*(.28+rand()*.46), bandH = cssH*(.08+rand()*.08); ctx.beginPath(); ctx.moveTo(0,y); for(let x=0;x<=cssW;x+=Math.max(24,cssW/9)) ctx.lineTo(x, y + Math.sin((x/cssW)*Math.PI*2 + rand()*2)*bandH*.35 + (rand()-.5)*bandH); ctx.lineTo(cssW,y+bandH); ctx.lineTo(0,y+bandH*1.15); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1; const floor = ctx.createLinearGradient(0,cssH*.77,0,cssH); floor.addColorStop(0,rgba(c.accent,.10)); floor.addColorStop(.18,c.floor); floor.addColorStop(1,c.shadow); poly(ctx, [[0,cssH],[0,cssH*.77],[cssW*.44,cssH*.73],[cssW*.56,cssH*.73],[cssW,cssH*.77],[cssW,cssH]], floor);
    ctx.strokeStyle = rgba(c.accent, backdrop.intensity===3?.26:backdrop.intensity===2?.20:.14); ctx.lineWidth = Math.max(1,cssW*.004); ctx.strokeRect(.5,.5,cssW-1,cssH-1); ctx.restore(); return true;
  }

  function ensureStyle(){
    if (!root.document || root.document.getElementById('dd-monster-backdrop-canvas-style')) return;
    const style = root.document.createElement('style'); style.id = 'dd-monster-backdrop-canvas-style';
    style.textContent = '.combat-monster-stage{isolation:isolate}.monster-backdrop-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.92}.combat-monster-stage>.monster-backdrop-canvas~*,.combat-monster-stage>.stage-atmosphere-grain,.combat-monster-stage>.stage-depth-veil,.combat-monster-stage>.stage-motes,.combat-monster-stage>.stage-drift,.combat-monster-stage>.monster-aura,.combat-monster-stage>.monster-silhouette,.combat-monster-stage>.stage-floor{position:relative;z-index:1}@media(max-width:380px){.monster-backdrop-canvas{opacity:.78}}';
    root.document.head.appendChild(style);
  }

  function attachMonsterBackdropCanvas(){
    if (!root.document) return 0; ensureStyle();
    const state = stateRef(), monster = state?.run?.monster || null, stages = root.document.querySelectorAll ? root.document.querySelectorAll('.combat-monster-stage') : [];
    let rendered = 0;
    stages.forEach(stage => {
      let canvas = stage.querySelector?.('canvas.monster-backdrop-canvas');
      if (!canvas) { canvas = root.document.createElement('canvas'); canvas.className = 'monster-backdrop-canvas'; canvas.setAttribute('aria-hidden','true'); stage.insertBefore(canvas, stage.firstChild || null); }
      const backdrop = generateMonsterBackdrop(monster, state, { depth: state?.run?.floor || state?.player?.returnDepth || 1 });
      const key = [backdrop.contractId, backdrop.kind, backdrop.depth, backdrop.depthBand, backdrop.tier, backdrop.seed, backdrop.intensity].join('|');
      if (canvas.dataset.backdropKey !== key || canvas.width === 0) { canvas.dataset.backdropKey = key; canvas.dataset.backdropKind = backdrop.kind; canvas.dataset.visualOnly = 'true'; renderMonsterBackdrop(canvas, backdrop); rendered += 1; }
    });
    return rendered;
  }

  function schedule(){ root.requestAnimationFrame ? root.requestAnimationFrame(attachMonsterBackdropCanvas) : root.setTimeout(attachMonsterBackdropCanvas, 0); }
  function wrap(name){ const original = root[name] || globalThis[name]; if (typeof original !== 'function' || original.__ddMonsterBackdropWrapped) return; const wrapped = function(){ const result = original.apply(this, arguments); schedule(); return result; }; wrapped.__ddMonsterBackdropWrapped = true; try { root[name] = wrapped; globalThis[name] = wrapped; } catch (_) {} }
  function install(){ if (!root.document) return; ensureStyle(); wrap('renderRun'); wrap('render'); schedule(); const panel = root.document.getElementById?.('combatPanel'), Observer = root.MutationObserver || globalThis.MutationObserver; if (panel && Observer && !panel.__ddMonsterBackdropObserved) { panel.__ddMonsterBackdropObserved = true; new Observer(schedule).observe(panel, { childList:true, subtree:true }); } }

  root.generateMonsterBackdrop = generateMonsterBackdrop;
  root.renderMonsterBackdrop = renderMonsterBackdrop;
  root.attachMonsterBackdropCanvas = attachMonsterBackdropCanvas;
  root.DDMonsterBackdropCanvas = Object.freeze({ buildTag:BUILD_TAG, visualOnly:true, generateMonsterBackdrop, renderMonsterBackdrop, attachMonsterBackdropCanvas, themeKeys:Object.freeze(Object.keys(THEMES)) });
  if (root.document) { root.document.readyState === 'loading' ? root.document.addEventListener('DOMContentLoaded', install) : install(); root.addEventListener?.('load', install); root.addEventListener?.('resize', schedule, { passive:true }); root.setTimeout?.(install, 100); root.setTimeout?.(schedule, 400); }
})(typeof window !== 'undefined' ? window : globalThis);
