import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Uses the public-runtime harness's private Chromium profile and local server.
// Fixtures model a returning well-equipped delver; no real player storage is used.
export async function verifyReliquaryBrowser({ client, evaluate, waitFor, record }) {
  const read = expression => evaluate(client, expression);
  const pause = () => new Promise(resolve => setTimeout(resolve, 240));
  const setup = await read(`(() => {
    S = createBaseState();
    S.player.safeExtractDepth = 30;
    S.player.returnDepth = 30;
    S.player.depth = 40;
    S.player.gold = 1000;
    S.player.equipment.weapon = generateGear('weapon', 150, { forcedRarity:'mythic' });
    S.player.equipment.armor = generateGear('armor', 150, { forcedRarity:'mythic' });
    S.player.equipment.armor.upgradeLevel = 2;
    const reliquaryGear = generateGear('charm', 11, { source:'normal', depthRaw:31 });
    S.player.inventory.push(reliquaryGear);
    window.__reliquaryThemedGearId = reliquaryGear.id;
    delete S.player.namedLoadouts;
    save(S); S = load(); render();
    return { legacy: Array.isArray(S.player.namedLoadouts) && S.player.namedLoadouts.length === 0,
      town: document.querySelector('.screen.active')?.id, depth: S.player.returnDepth,
      themed: (() => { const item = S.player.inventory.find(entry => entry.id === window.__reliquaryThemedGearId); return item && item.maker === 'Drowned Reliquary' && item.tags.includes('drowned-reliquary'); })() };
  })()`);
  assert.ok(setup.legacy && setup.town === 'screen-town' && setup.depth === 30 && setup.themed, JSON.stringify(setup));
  record('Reliquary legacy save and themed gear reload into normal Town entry', true);
  const contractBriefing = await read(`(() => {
    const offers = S.town.eliteBoardContracts;
    S.town.eliteBoardContracts = [{ id:'lowfire_bounty', targetFloor:11 }];
    render();
    const inBand = document.getElementById('questPanel')?.innerText || '';
    S.town.eliteBoardContracts = [{ id:'lowfire_bounty', targetFloor:15 }];
    render();
    const outside = document.getElementById('questPanel')?.innerText || '';
    S.town.eliteBoardContracts = offers;
    render();
    return { inBand, outside };
  })()`);
  assert.match(contractBriefing.inBand, /The mark waits among the sealed bells\. Follow the writ's listed location\./);
  assert.doesNotMatch(contractBriefing.outside, /The mark waits among the sealed bells\./);
  record('Only existing contracts naturally targeting D31-D40 receive the Reliquary briefing', true);
  await read(`document.getElementById('tab-gear').click(); true`);
  await read(`(() => {
    const input = document.getElementById('namedLoadoutName');
    input.value = 'Reliquary Delver'; input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
    document.querySelector('[data-named-loadout-action="duplicate"]').click();
    return true;
  })()`);
  const before = await read(`(() => {
    document.querySelector('[data-named-loadout-direction="up"]:not([disabled])').click();
    window.__reliquaryLoadouts = JSON.stringify(S.player.namedLoadouts);
    window.__reliquaryEquipment = JSON.stringify(S.player.equipment);
    return { count: S.player.namedLoadouts.length, focus: document.activeElement?.dataset.namedLoadoutAction };
  })()`);
  assert.equal(before.count, 2);
  assert.equal(before.focus, 'move');
  record('Reliquary preparation supports Enter-to-save, duplicate, reorder and focus recovery', true);
  await pause();
  await read(`document.getElementById('tab-town').click(); true`);
  await read(`(() => { window.__reliquaryRandom = Math.random; Math.random = () => 0.1; document.getElementById('startRunBtn').click(); return true; })()`);
  await waitFor(client, `S.run.active && S.run.floor === 30 && document.querySelector('.screen.active')?.id === 'screen-run'`, 'normal D30 entry');

  async function advanceTo(depth) {
    for (let action = 0; action < 160; action += 1) {
      const current = await read(`({ active:S.run.active, floor:S.run.floor })`);
      assert.ok(current.active, `run ended before D${depth}: ${JSON.stringify(current)}`);
      if (current.floor >= depth) return;
      await pause();
      await read(`(() => {
        const button = S.run.event
          ? document.querySelector('[data-run-event="leave"]') || document.querySelector('[data-run-event]')
          : document.querySelector('[data-action="attack"]');
        if (!button || button.disabled) throw new Error('Missing active combat/event control');
        button.click(); return true;
      })()`);
    }
    throw new Error('Combat did not advance to D' + depth);
  }
  await advanceTo(31);
  const band = await read(`({ floor:S.run.floor, title:document.getElementById('combatPanel')?.innerText,
    theme:document.querySelector('.combat-monster-stage')?.className,
    zone:S.run.zone, monster:S.run.monster?.name })`);
  assert.equal(band.floor, 31);
  assert.equal(band.zone, 'The Drowned Reliquary');
  assert.match(band.theme, /combat-backdrop--drowned-reliquary/);
  assert.match(band.monster, /Bell-Drowned Warden|Siltbound Reliquary Lurker|Reliquary Chain Herald|Blackwater Bell Seer/);
  assert.match(await read('document.getElementById("runStatus").innerText'), /Beyond the Reliquary/);
  record('Normal D30 combat advances into the rendered D31 Reliquary', true, band.monster);

  for (const profile of [{width:390,height:844,touch:true},{width:430,height:932,touch:true},{width:768,height:1024,touch:true},{width:360,height:844,touch:false}]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width:profile.width, height:profile.height, deviceScaleFactor:1, mobile:profile.touch });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled:profile.touch, maxTouchPoints:profile.touch ? 5 : 1 });
    await client.send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
    await read('render(); true'); await pause();
    const geometry = await read(`(() => {
      const buttons = Array.from(document.querySelectorAll('#screen-run [data-action]'));
      const rects = buttons.map(b => { const r=b.getBoundingClientRect(); return {name:b.getAttribute('aria-label'), x:r.x, right:r.right, width:r.width, height:r.height}; });
      return { coarse:matchMedia('(pointer: coarse)').matches, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
        width:innerWidth, overflow:document.documentElement.scrollWidth > innerWidth + 1, rects,
        cue:document.querySelector('.enemy-hp')?.innerText || '' };
    })()`);
    assert.equal(geometry.coarse, profile.touch, 'actual pointer profile');
    assert.equal(geometry.reduced, true);
    assert.equal(geometry.overflow, false, JSON.stringify(geometry));
    assert.equal(geometry.rects.length, 4);
    assert.ok(geometry.rects.every(r => r.name && r.height >= 44 && r.width >= 44 && r.x >= 0 && r.right <= geometry.width + 1), JSON.stringify(geometry));
    assert.match(geometry.cue, /HP[\s\S]*PWR[\s\S]*GRD/);
    if (process.env.DD_RELIQUARY_CAPTURE_DIR) {
      await mkdir(process.env.DD_RELIQUARY_CAPTURE_DIR, { recursive:true });
      const shot = await client.send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
      await writeFile(path.join(process.env.DD_RELIQUARY_CAPTURE_DIR, `reliquary-${profile.width}-${profile.touch ? 'touch' : 'mouse'}.png`), Buffer.from(shot.data,'base64'));
    }
    record(`Reliquary ${profile.width}x${profile.height} ${profile.touch ? 'touch' : 'fine pointer'}: visible cues, 44px controls, no horizontal overflow`, true);
  }

  const activeReload = await read(`(() => {
    S.run.zone = 'The Final Lowflame'; // Historical saved presentation; no migration should be needed.
    save(S);
    const pending = JSON.stringify(S.run.pendingRewards);
    const monster = JSON.stringify(S.run.monster);
    S = load(); render();
    const oldMonster = JSON.parse(monster);
    const monsterChanges = Object.keys({...oldMonster,...S.run.monster}).filter(key => JSON.stringify(oldMonster[key]) !== JSON.stringify(S.run.monster[key]));
    const retained = ['id','name','family','type','tier','hp','maxHp','power','guard','speed','rewardGold','rewardXp','rewardShard','lore'];
    return { pending:pending === JSON.stringify(S.run.pendingRewards), monster:retained.every(key => oldMonster[key] === S.run.monster[key]), monsterChanges,
      loadouts:window.__reliquaryLoadouts === JSON.stringify(S.player.namedLoadouts),
      equipment:window.__reliquaryEquipment === JSON.stringify(S.player.equipment),
      theme:document.querySelector('.combat-monster-stage')?.className };
  })()`);
  assert.ok(activeReload.pending && activeReload.monster && activeReload.loadouts && activeReload.equipment, JSON.stringify(activeReload));
  assert.match(activeReload.theme, /combat-backdrop--drowned-reliquary/);
  record('Active Reliquary reload preserves pending rewards, monster, duplicated loadouts, IDs and upgrades', true);
  await advanceTo(40);
  assert.match(await read('document.getElementById("runStatus").innerText'), /Beyond the Reliquary/);
  assert.equal(await read('!!document.querySelector(".run-flow-summary.is-boss-floor")'), false);
  await read(`(() => {
    window.__reliquaryActiveState = S;
    const preview = createBaseState();
    preview.screen = 'run'; preview.run.active = true; preview.run.floor = 45; preview.run.zone = zoneName(45);
    preview.run.monster = generateMonster(45, preview);
    S = preview; render();
    return true;
  })()`);
  await pause();
  const d45Conclusion = await read(`(() => {
    const status = document.getElementById('runStatus');
    const label = status?.querySelector('.run-flow-secondary strong');
    const detail = status?.querySelector('.run-flow-secondary small');
    return { label:label?.textContent || '', detail:detail?.textContent || '', detailMarkup:status?.textContent || '', visible:!!label && getComputedStyle(label).display !== 'none' && getComputedStyle(label).visibility !== 'hidden', active:S.run.active, floor:S.run.floor, screen:S.screen, event:!!S.run.event };
  })()`);
  await read(`S = window.__reliquaryActiveState; delete window.__reliquaryActiveState; render(); true`);
  assert.equal(d45Conclusion.label, 'Gravetoll Bell', JSON.stringify(d45Conclusion));
  assert.ok(d45Conclusion.visible, JSON.stringify(d45Conclusion));
  assert.match(d45Conclusion.detailMarkup, /Beyond the flooded doors, the Gravetoll Bell calls in what the drowned could not collect\./, JSON.stringify(d45Conclusion));
  record('The existing D45 boss presentation concludes the Reliquary story without a new boss slot', true);
  const haul = await read(`({ gold:S.run.pendingRewards.gold, loot:S.run.pendingRewards.loot.map(i=>i.id), banked:S.player.gold })`);
  assert.ok(haul.gold > 0 && haul.loot.length > 0, JSON.stringify(haul));
  await pause();
  await read(`document.querySelector('[data-action="extract"]').click(); true`);
  await waitFor(client, `!S.run.active && S.screen === 'town'`, 'normal Reliquary extraction');
  const returned = await read(`(() => {
    save(S); S = load(); render();
    return { returnDepth:S.player.returnDepth, safe:S.player.safeExtractDepth, gold:S.player.gold,
      inventory:S.player.inventory.map(i=>i.id), pending:S.run.pendingRewards,
      loadouts:window.__reliquaryLoadouts === JSON.stringify(S.player.namedLoadouts),
      equipment:window.__reliquaryEquipment === JSON.stringify(S.player.equipment),
      themed:S.player.inventory.some(item => item.id === window.__reliquaryThemedGearId && item.maker === 'Drowned Reliquary' && item.tags.includes('drowned-reliquary')) };
  })()`);
  assert.equal(returned.returnDepth,40); assert.ok(returned.safe >= 40);
  assert.ok(returned.gold >= haul.banked + haul.gold);
  assert.ok(haul.loot.every(id => returned.inventory.includes(id)));
  assert.equal(returned.pending.loot.length,0);
  assert.ok(returned.loadouts && returned.equipment && returned.themed);
  record('D31-D40 combat/loot extracts through the normal bank, return and reload path', true);
  const receipt = await read(`(() => {
    const panel = document.getElementById('townReturnReceipt');
    return { text:panel?.innerText || '', review:!!panel?.querySelector('[data-town-route="gear"]'), history:!!panel?.querySelector('[data-town-route="archive"]') };
  })()`);
  assert.ok(/Extraction secured/.test(receipt.text) && /Banked/.test(receipt.text) && receipt.review && receipt.history, JSON.stringify(receipt));
  await read(`document.querySelector('#townReturnReceipt [data-town-route="archive"]')?.click(); true`);
  assert.equal(await read(`document.querySelector('.screen.active')?.id`), 'screen-archive');
  await read(`document.querySelector('#tab-town')?.click(); true`);
  record('Town latest-return receipt reports the banked haul and routes to the existing Gear or Journal views', true);
  await read(`document.getElementById('tab-gear').click(); true`);
  const applied = await read(`(() => {
    const weapon = S.player.equipment.weapon.id;
    const armor = S.player.equipment.armor;
    S.player.inventory.push(armor); S.player.equipment.armor = null;
    render(); document.querySelector('[data-named-loadout-action="apply"]').click();
    return { weapon:S.player.equipment.weapon.id === weapon, armor:S.player.equipment.armor?.id === armor.id,
      upgrade:S.player.equipment.armor?.upgradeLevel, focus:document.activeElement?.dataset.namedLoadoutAction,
      notice:document.querySelector('.named-loadout-notice')?.innerText,
      themedVisible:(document.getElementById('inventoryPanel')?.innerText || '').includes('Drowned Reliquary') };
  })()`);
  assert.ok(applied.weapon && applied.armor && applied.upgrade === 2 && applied.focus === 'apply' && applied.themedVisible, JSON.stringify(applied));
  assert.match(applied.notice,/1 equipped/);
  record('Post-return Apply Safe Items restores only the empty slot and retains upgrades/focus',true);
  await read('Math.random = window.__reliquaryRandom; true');
}
