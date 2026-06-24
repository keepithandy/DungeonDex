'use strict';

// DungeonDex v1.21.0 - Monster Backdrop Canvas Completion.
// Complete deterministic, visual-only canvas scene system for combat monster stages.
(function(root){
  const BUILD_TAG = 'monster_backdrop_canvas_complete_v1';
  if (!root || root.DDMonsterBackdropCanvas?.buildTag === BUILD_TAG) return;

  const THEMES = Object.freeze({
    lowfire:['Lowfire Crypt','#120c08','#251711','rgba(255,145,63,.14)','#f0a24d','#050302','pillars','crypt'],
    veyruhn:['Bellforge Works','#130908','#2a1510','rgba(255,82,38,.14)','#ff7d44','#070302','chains','forge'],
    mireglass:['Mireglass Hollow','#07120d','#122018','rgba(107,219,150,.13)','#76d99a','#030805','reeds','mire'],
    'red-chapel':['Red Chapel','#160809','#241012','rgba(255,80,74,.13)','#ff746c','#070203','arches','chapel'],
    'salt-forge':['Salt Forge','#12100a','#24200f','rgba(255,225,150,.12)','#ffe196','#060504','crystals','salt'],
    'sunken-court':['Sunken Court','#07101a','#111b26','rgba(109,184,255,.13)','#72b8ff','#02050a','banners','court'],
    rookery:['Ash Rookery','#0b0b0d','#19171a','rgba(214,194,156,.11)','#d8c39a','#030304','rafters','rafters'],
    noctis:['Noctis Vault','#06050d','#12101d','rgba(176,122,255,.13)','#b77cff','#020106','void','vault'],
    generic:['Hollow Stair','#0d0b0a','#171310','rgba(255,190,105,.11)','#f0a24d','#030202','stones','stair']
  });
  const THEME_KEYS = Object.freeze(Object.keys(THEMES));
  const IDX = Object.freeze({ label:0, sky:1, floor:2, fog:3, accent:4, shadow:5, prop:6, horizon:7 });

  function stateRef(){ /* global S */ return typeof S !== 'undefined' ? S : (root.S || {}); }
  function num(v, fb, min, max){ const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fb; }
  function token(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function has(key, terms){ return terms.some(term => key.includes(term)); }
  function hash(v){ let h = 2166136261; const s = String(v || 'dungeondex'); for (let i=0;i<s.length;i+=1){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function randFrom(seed){ let s = seed >>> 0; return function(){ s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rgba(hex, a){ const x = String(hex || '#fff').replace('#','').padEnd(6,'0').slice(0,6), n = parseInt(x,16); return `rgba(${(n>>16)&255}, ${(n>>8)&255}, ${n&255}, ${a})`; }
  function depthBand(d){ d = Math.floor(num(d,1,1,999999)); return d >= 120 ? 'abyssal' : d >= 80 ? 'grave' : d >= 40 ? 'deep' : d >= 15 ? 'pressured' : 'fresh'; }

  function currentDistrict(state, depth){
    try { /* global getLoreDepthProgress, getLoreFloorDistrict */
      if (typeof getLoreDepthProgress === 'function' && typeof getLoreFloorDistrict === 'function') return getLoreFloorDistrict(getLoreDepthProgress(depth)?.floorNumber || 1);
    } catch (_) {}
    return null;
  }

  function fallbackKind(state, monster, district, depth){
    const d = Math.floor(num(depth ?? state?.run?.floor ?? state?.player?.returnDepth, 1, 1, 999999));
    const dk = token([district?.id, district?.tone, district?.name, state?.run?.zone].filter(Boolean).join(' '));
    const mk = token([monster?.id, monster?.name, monster?.family, monster?.type, monster?.tier].filter(Boolean).join(' '));
    if (d <= 4 || has(dk, ['lowsteps','lowfire','ashgate']) || has(mk, ['ashwake','burn','ghoul','husk','beast'])) return 'lowfire';
    if (has(dk, ['saltforge','salt','hunger','kiln','mineral']) || has(mk, ['blacksalt','starved','construct','guardbreak','rage'])) return 'salt-forge';
    if (has(dk, ['veyruhn','bellforge','debtworks','cinderbone','forge','furnace'])) return 'veyruhn';
    if (has(dk, ['mireglass','mire','sootveil','swamp']) || has(mk, ['mireborn','venom','spitter','frostbit','mireglass'])) return 'mireglass';
    if (has(dk, ['redchapel','chapel','blacktithe','ritual']) || has(mk, ['bloodlit','cultist','gravesworn','revenant','bleed'])) return 'red-chapel';
    if (has(dk, ['sunkencourt','sunken','redwake','catacomb','drowned']) || has(mk, ['sunken','knight','warden','chill','drain'])) return 'sunken-court';
    if (has(dk, ['rookery','rafter']) || has(mk, ['harpy','silkbound','rookery','feather','wing'])) return 'rookery';
    if (has(dk, ['noctis','atelier','lanternless','lowflame','vault']) || has(mk, ['shade','watcher','dreadmarked','lanterneyed','seer','hex'])) return 'noctis';
    return d <= 10 ? 'lowfire' : d <= 25 ? 'veyruhn' : d <= 38 ? 'mireglass' : d <= 50 ? 'salt-forge' : d <= 62 ? 'red-chapel' : d <= 78 ? 'sunken-court' : d <= 100 ? 'noctis' : 'generic';
  }

  function resolveKind(state, monster, district, depth){
    try { /* global combatBackdropKind */
      if (typeof combatBackdropKind === 'function') { const k = combatBackdropKind(state, district, depth, monster); if (THEMES[k]) return k; }
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
    const band = depthBand(depth);
    const intensity = tierKey === 'boss' ? 3 : tierKey === 'elite' ? 2 : 1;
    const quality = opts.quality === 'tiny' || band === 'fresh' ? 'lean' : 'full';
    const seed = hash(['DungeonDexBackdrop', BUILD_TAG, kind, band, depth, tierKey, activeMonster?.id, activeMonster?.name, activeMonster?.family].filter(Boolean).join('|'));
    return Object.freeze({
      contractId:'monster_backdrop_canvas_complete_v1', renderer:'canvas', visualOnly:true, lockedVisualOnly:true, gameplayAffecting:false, complete:true,
      kind, themeLabel:theme[IDX.label], horizon:theme[IDX.horizon], depth, depthBand:band, tier, intensity, seed, quality,
      propCount:Math.max(4, Math.min(11, 4 + intensity + Math.floor(depth / 24))), fogBands:Math.max(3, Math.min(7, 2 + intensity + (band === 'fresh' ? 1 : band === 'pressured' ? 2 : 3))),
      moteCount:quality === 'lean' ? 8 + intensity * 4 : 18 + intensity * 8,
      props:Object.freeze([theme[IDX.prop], 'fog', tierKey === 'boss' ? 'boss-frame' : tierKey === 'elite' ? 'elite-glow' : 'stage-frame', band === 'abyssal' ? 'deep-pressure' : 'depth-tone']),
      colors:Object.freeze({ sky:theme[IDX.sky], floor:theme[IDX.floor], fog:theme[IDX.fog], accent:theme[IDX.accent], shadow:theme[IDX.shadow] })
    });
  }

  function monsterBackdropCatalog(){ return Object.freeze(THEME_KEYS.map(k => Object.freeze({ kind:k, label:THEMES[k][IDX.label], prop:THEMES[k][IDX.prop], horizon:THEMES[k][IDX.horizon], visualOnly:true }))); }
  function poly(ctx, pts, fill){ if (!pts.length) return; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for(let i=1;i<pts.length;i+=1) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function line(ctx, pts, stroke, width){ if (!pts.length) return; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for(let i=1;i<pts.length;i+=1) ctx.lineTo(pts[i][0], pts[i][1]); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }

  function drawHorizon(ctx, w, h, b, rand){
    const c=b.colors, y=h*.68, fill=rgba(c.shadow,.68);
    if (b.horizon === 'crypt' || b.horizon === 'chapel') for(let i=0;i<5;i+=1){ const x=w*(.12+i*.19)+(rand()-.5)*w*.04,t=h*(.22+rand()*.16); ctx.strokeStyle=rgba(c.accent,b.horizon==='chapel'?.16:.11); ctx.lineWidth=Math.max(2,w*.007); ctx.beginPath(); ctx.moveTo(x-w*.045,y); ctx.lineTo(x-w*.045,y-t*.55); ctx.quadraticCurveTo(x,y-t,x+w*.045,y-t*.55); ctx.lineTo(x+w*.045,y); ctx.stroke(); }
    else if (b.horizon === 'forge') for(let i=0;i<4;i+=1){ const x=w*(.16+i*.22); poly(ctx,[[x-w*.035,y],[x-w*.02,y-h*.2],[x+w*.02,y-h*.22],[x+w*.035,y]],fill); ctx.fillStyle=rgba(c.accent,.12); ctx.fillRect(x-w*.018,y-h*.24,w*.036,h*.018); }
    else if (b.horizon === 'mire') for(let i=0;i<7;i+=1){ const x=w*(i/6)+(rand()-.5)*w*.06; line(ctx,[[x,y],[x+(rand()-.5)*w*.03,y-h*(.10+rand()*.12)]],rgba(c.accent,.16),Math.max(1,w*.004)); }
    else if (b.horizon === 'salt') for(let i=0;i<8;i+=1){ const x=w*(.08+rand()*.84),t=h*(.08+rand()*.22); poly(ctx,[[x,y-t],[x+w*.025,y-t*.35],[x+w*.006,y],[x-w*.025,y-t*.3]],rgba(c.accent,.13)); }
    else if (b.horizon === 'court') for(let i=0;i<5;i+=1){ const x=w*(.10+i*.20); poly(ctx,[[x-w*.018,y],[x-w*.012,y-h*.22],[x+w*.012,y-h*.22],[x+w*.018,y]],fill); poly(ctx,[[x,y-h*.2],[x+w*.05,y-h*.18],[x+w*.034,y-h*.08],[x,y-h*.1]],rgba(c.accent,.10)); }
    else if (b.horizon === 'rafters') for(let i=0;i<5;i+=1){ const y2=h*(.16+i*.06); line(ctx,[[w*.04,y2],[w*.96,y2+h*(.08+rand()*.05)]],rgba(c.accent,.12),Math.max(2,w*.008)); }
    else if (b.horizon === 'vault') for(let i=0;i<9;i+=1){ ctx.fillStyle=rgba(c.accent,.22); ctx.beginPath(); ctx.arc(w*(.08+rand()*.84),h*(.12+rand()*.45),Math.max(1.2,w*(.0025+rand()*.003)),0,Math.PI*2); ctx.fill(); }
    else for(let i=0;i<6;i+=1){ const x=w*(.05+rand()*.9); poly(ctx,[[x-w*.03,y],[x-w*.02,y-h*(.08+rand()*.12)],[x+w*.02,y-h*(.08+rand()*.12)],[x+w*.03,y]],rgba(c.accent,.09)); }
  }

  function drawProps(ctx, w, h, b, rand){
    const c=b.colors, baseY=h*.78, prop=b.props?.[0] || 'stones';
    for(let i=0;i<b.propCount;i+=1){ const x=w*(i%2===0?.08+rand()*.22:.70+rand()*.22), t=h*(.28+rand()*.32), wide=w*(.035+rand()*.04), y=baseY+rand()*h*.05;
      if(prop==='arches' || prop==='pillars'){ ctx.strokeStyle=rgba(c.accent,prop==='arches'?.18:.13); ctx.lineWidth=Math.max(3,w*.012); ctx.beginPath(); ctx.moveTo(x-wide,y); ctx.lineTo(x-wide,y-t*.55); if(prop==='arches') ctx.quadraticCurveTo(x,y-t,x+wide,y-t*.55); else ctx.lineTo(x+wide,y-t*.55); ctx.lineTo(x+wide,y); ctx.stroke(); }
      else if(prop==='chains') line(ctx,[[x,0],[x+Math.sin(i)*wide,y-t*.1]],rgba(c.accent,.18),Math.max(2,w*.006));
      else if(prop==='crystals') poly(ctx,[[x,y-t],[x+wide,y-t*.38],[x,y],[x-wide,y-t*.38]],rgba(c.accent,.18));
      else if(prop==='reeds') for(let r=0;r<4;r+=1){ ctx.strokeStyle=rgba(c.accent,.18); ctx.lineWidth=Math.max(1,w*.004); ctx.beginPath(); ctx.moveTo(x+(r-1.5)*wide*.32,y); ctx.quadraticCurveTo(x+(rand()-.5)*wide,y-t*.52,x+(rand()-.5)*wide*1.5,y-t); ctx.stroke(); }
      else if(prop==='banners'){ line(ctx,[[x,y-t],[x,y]],rgba(c.accent,.16),Math.max(2,w*.005)); poly(ctx,[[x,y-t],[x+wide*1.2,y-t*.9],[x+wide*.7,y-t*.55],[x,y-t*.62]],rgba(c.accent,.14)); }
      else if(prop==='rafters') line(ctx,[[x-wide*2,h*.12+rand()*h*.18],[x+wide*3,h*.28+rand()*h*.22]],rgba(c.accent,.16),Math.max(3,w*.009));
      else if(prop==='void'){ ctx.fillStyle=rgba(c.accent,.34); ctx.beginPath(); ctx.arc(x,y-t*(.45+rand()*.4),Math.max(1.5,w*.004),0,Math.PI*2); ctx.fill(); }
      else poly(ctx,[[x-wide,y],[x-wide*.7,y-t],[x+wide*.65,y-t*.88],[x+wide,y]],rgba(c.accent,.12));
      poly(ctx,[[x-wide*1.4,y],[x-wide,y-t*.18],[x+wide,y-t*.14],[x+wide*1.3,y]],rgba(c.shadow,.58));
    }
  }

  function drawMotes(ctx,w,h,b,rand){ const c=b.colors; ctx.save(); ctx.globalAlpha=b.quality==='lean'?.30:.42; for(let i=0;i<b.moteCount;i+=1){ ctx.fillStyle=rgba(c.accent,.10+rand()*.24); ctx.beginPath(); ctx.arc(w*(.04+rand()*.92),h*(.10+rand()*.58),Math.max(1,w*(.002+rand()*.0035)),0,Math.PI*2); ctx.fill(); } ctx.restore(); }
  function drawTierFrame(ctx,w,h,b){ const c=b.colors,a=b.intensity===3?.28:b.intensity===2?.20:.13; ctx.save(); ctx.strokeStyle=rgba(c.accent,a); ctx.lineWidth=Math.max(1,w*.004); ctx.strokeRect(.5,.5,w-1,h-1); if(b.intensity>=2){ const side=w*.045, f=rgba(c.accent,b.intensity===3?.16:.10); poly(ctx,[[0,0],[side,0],[0,h*.26]],f); poly(ctx,[[w,0],[w-side,0],[w,h*.26]],f); } if(b.intensity===3){ ctx.strokeStyle=rgba(c.accent,.24); ctx.lineWidth=Math.max(2,w*.006); for(let i=0;i<3;i+=1){ const x=w*(.20+i*.30); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+(i-1)*w*.02,h*.42); ctx.stroke(); } poly(ctx,[[w*.43,h*.10],[w*.50,h*.04],[w*.57,h*.10],[w*.54,h*.135],[w*.46,h*.135]],rgba(c.accent,.18)); } ctx.restore(); }

  function renderMonsterBackdrop(canvas, backdrop){
    if (!canvas || typeof canvas.getContext !== 'function' || !backdrop) return false;
    const ctx=canvas.getContext('2d'); if(!ctx) return false;
    const box=canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const cssW=Math.max(1,Math.floor(canvas.clientWidth || box?.width || 320)), cssH=Math.max(1,Math.floor(canvas.clientHeight || box?.height || 150)), dpr=Math.max(1,Math.min(2,num(root.devicePixelRatio,1,1,4)));
    canvas.width=Math.floor(cssW*dpr); canvas.height=Math.floor(cssH*dpr); canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
    const c=backdrop.colors, rand=randFrom(backdrop.seed || 1); ctx.save(); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
    const sky=ctx.createLinearGradient(0,0,0,cssH); sky.addColorStop(0,c.sky); sky.addColorStop(.66,c.shadow); sky.addColorStop(1,c.floor); ctx.fillStyle=sky; ctx.fillRect(0,0,cssW,cssH);
    const glow=ctx.createRadialGradient(cssW*.5,cssH*.58,0,cssW*.5,cssH*.58,Math.max(cssW,cssH)*.58); glow.addColorStop(0,rgba(c.accent,backdrop.intensity===3?.28:backdrop.intensity===2?.22:.15)); glow.addColorStop(.56,'rgba(0,0,0,0)'); glow.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=glow; ctx.fillRect(0,0,cssW,cssH);
    drawHorizon(ctx,cssW,cssH,backdrop,rand); ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(0,cssH*.72,cssW,cssH*.28); drawProps(ctx,cssW,cssH,backdrop,rand);
    for(let i=0;i<backdrop.fogBands;i+=1){ ctx.globalAlpha=.16+rand()*.13; ctx.fillStyle=c.fog; const y=cssH*(.26+rand()*.48), bh=cssH*(.07+rand()*.09); ctx.beginPath(); ctx.moveTo(0,y); for(let x=0;x<=cssW;x+=Math.max(24,cssW/9)) ctx.lineTo(x,y+Math.sin((x/cssW)*Math.PI*2+rand()*2)*bh*.35+(rand()-.5)*bh); ctx.lineTo(cssW,y+bh); ctx.lineTo(0,y+bh*1.15); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha=1; const floor=ctx.createLinearGradient(0,cssH*.77,0,cssH); floor.addColorStop(0,rgba(c.accent,.10)); floor.addColorStop(.18,c.floor); floor.addColorStop(1,c.shadow); poly(ctx,[[0,cssH],[0,cssH*.77],[cssW*.44,cssH*.73],[cssW*.56,cssH*.73],[cssW,cssH*.77],[cssW,cssH]],floor);
    drawMotes(ctx,cssW,cssH,backdrop,rand); drawTierFrame(ctx,cssW,cssH,backdrop); ctx.restore(); canvas.dataset.renderSize=`${cssW}x${cssH}@${dpr}`; return true;
  }

  function backdropClass(k){ return `dd-backdrop-kind-${String(k || 'generic').replace(/[^a-z0-9-]+/g, '-')}`; }
  function ensureStyle(){ if(!root.document || root.document.getElementById('dd-monster-backdrop-canvas-style')) return; const style=root.document.createElement('style'); style.id='dd-monster-backdrop-canvas-style'; style.textContent='.combat-monster-stage{isolation:isolate}.monster-backdrop-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.94}.combat-monster-stage.dd-backdrop-ready>.monster-backdrop-canvas~*,.combat-monster-stage>.stage-atmosphere-grain,.combat-monster-stage>.stage-depth-veil,.combat-monster-stage>.stage-motes,.combat-monster-stage>.stage-drift,.combat-monster-stage>.monster-aura,.combat-monster-stage>.monster-silhouette,.combat-monster-stage>.stage-floor{position:relative;z-index:1}.combat-monster-stage.dd-backdrop-kind-noctis .monster-backdrop-canvas,.combat-monster-stage.dd-backdrop-kind-red-chapel .monster-backdrop-canvas{opacity:.98}@media(max-width:380px){.monster-backdrop-canvas{opacity:.80}}@media(prefers-reduced-motion:reduce){.monster-backdrop-canvas{opacity:.88}}'; root.document.head.appendChild(style); }
  let scheduled = false;
  function stageSizeKey(stage){ const box=stage?.getBoundingClientRect ? stage.getBoundingClientRect() : null, w=Math.max(1,Math.floor(stage?.clientWidth || box?.width || 320)), h=Math.max(1,Math.floor(stage?.clientHeight || box?.height || 150)), dpr=Math.max(1,Math.min(2,num(root.devicePixelRatio,1,1,4))); return `${w}x${h}@${dpr}`; }
  function attachMonsterBackdropCanvas(){ if(!root.document) return 0; ensureStyle(); const state=stateRef(), monster=state?.run?.monster || null, stages=root.document.querySelectorAll ? root.document.querySelectorAll('.combat-monster-stage') : []; let rendered=0; stages.forEach(stage => { let canvas=stage.querySelector?.('canvas.monster-backdrop-canvas'); if(!canvas){ canvas=root.document.createElement('canvas'); canvas.className='monster-backdrop-canvas'; canvas.setAttribute('aria-hidden','true'); stage.insertBefore(canvas, stage.firstChild || null); } const sizeKey=stageSizeKey(stage), backdrop=generateMonsterBackdrop(monster,state,{ depth:state?.run?.floor || state?.player?.returnDepth || 1, quality:sizeKey.startsWith('1x') ? 'tiny' : undefined }), key=[backdrop.contractId,backdrop.kind,backdrop.depth,backdrop.depthBand,backdrop.tier,backdrop.seed,backdrop.intensity,backdrop.quality,sizeKey].join('|'); if(canvas.dataset.backdropKey!==key || canvas.dataset.renderSize!==sizeKey || canvas.width===0){ canvas.dataset.backdropKey=key; canvas.dataset.backdropKind=backdrop.kind; canvas.dataset.visualOnly='true'; if(renderMonsterBackdrop(canvas,backdrop)){ stage.classList.add('dd-backdrop-ready'); THEME_KEYS.forEach(kind => stage.classList.remove(backdropClass(kind))); stage.classList.add(backdropClass(backdrop.kind)); rendered += 1; } } }); return rendered; }
  function schedule(){ if(scheduled) return; scheduled=true; const run=function(){ scheduled=false; attachMonsterBackdropCanvas(); }; root.requestAnimationFrame ? root.requestAnimationFrame(run) : root.setTimeout(run,0); }
  function wrap(name){ const original=root[name] || globalThis[name]; if(typeof original !== 'function' || original.__ddMonsterBackdropWrapped) return; const wrapped=function(){ const result=original.apply(this,arguments); schedule(); return result; }; wrapped.__ddMonsterBackdropWrapped=true; try { root[name]=wrapped; globalThis[name]=wrapped; } catch (_) {} }
  function installResizeObserver(){ const Observer=root.ResizeObserver || globalThis.ResizeObserver; if(!Observer || !root.document?.querySelectorAll) return; root.document.querySelectorAll('.combat-monster-stage').forEach(stage => { if(stage.__ddMonsterBackdropResizeObserved) return; stage.__ddMonsterBackdropResizeObserved=true; try { new Observer(schedule).observe(stage); } catch (_) {} }); }
  function monsterBackdropDiagnostics(){ const stages=root.document?.querySelectorAll ? Array.from(root.document.querySelectorAll('.combat-monster-stage')) : []; return Object.freeze({ buildTag:BUILD_TAG, visualOnly:true, stageCount:stages.length, canvasCount:stages.filter(stage => !!stage.querySelector?.('canvas.monster-backdrop-canvas')).length, themeKeys:THEME_KEYS.slice(), complete:true }); }
  function install(){ if(!root.document) return; ensureStyle(); wrap('renderRun'); wrap('render'); schedule(); installResizeObserver(); const panel=root.document.getElementById?.('combatPanel'), Observer=root.MutationObserver || globalThis.MutationObserver; if(panel && Observer && !panel.__ddMonsterBackdropObserved){ panel.__ddMonsterBackdropObserved=true; try { new Observer(function(){ schedule(); installResizeObserver(); }).observe(panel,{childList:true,subtree:true}); } catch (_) {} } }

  root.generateMonsterBackdrop=generateMonsterBackdrop;
  root.renderMonsterBackdrop=renderMonsterBackdrop;
  root.attachMonsterBackdropCanvas=attachMonsterBackdropCanvas;
  root.monsterBackdropCatalog=monsterBackdropCatalog;
  root.monsterBackdropDiagnostics=monsterBackdropDiagnostics;
  root.DDMonsterBackdropCanvas=Object.freeze({ buildTag:BUILD_TAG, visualOnly:true, complete:true, generateMonsterBackdrop, renderMonsterBackdrop, attachMonsterBackdropCanvas, monsterBackdropCatalog, monsterBackdropDiagnostics, themeKeys:THEME_KEYS });
  if(root.document){ root.document.readyState === 'loading' ? root.document.addEventListener('DOMContentLoaded', install) : install(); root.addEventListener?.('load', install); root.addEventListener?.('resize', schedule, { passive:true }); root.setTimeout?.(install,100); root.setTimeout?.(schedule,400); }
})(typeof window !== 'undefined' ? window : globalThis);
