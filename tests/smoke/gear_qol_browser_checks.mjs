import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

export async function verifyGearQolBrowser({ client, evaluate, record }) {
  const read = expression => evaluate(client, expression);
  const pause = () => new Promise(resolve => setTimeout(resolve, 250));
  await read(`(() => {
    S = createBaseState();
    const kept = generateGear('weapon', 5);
    kept.id = 'qol-kept'; kept.name = 'Saved Blade';
    S.player.equipment = {weapon:kept};
    window.__qolId = DungeonDexNamedLoadouts.create(S, 'Travel Kit').loadout.id;
    const old = generateGear('weapon', 3); old.id = 'qol-old'; old.name = 'Old Blade';
    const loose = generateGear('armor', 3); loose.id = 'qol-loose'; loose.name = 'Loose Armor';
    S.player.equipment = {weapon:old};
    S.player.inventory = [kept, loose];
    S.screen = 'gear'; render();
    window.__qolConfirm = window.confirm;
    window.confirm = text => { window.__qolConfirmation = text; return true; };
    return true;
  })()`);
  const controls = await read(`(() => {
    const kept = document.querySelector('[data-gear-detail-id="qol-kept"]');
    return {badge:kept.innerText.includes('In loadout'), noSale:!kept.querySelector('[data-sell]'),
      lock:!!document.querySelector('[data-gear-flag="locked"]'), junk:!!document.querySelector('[data-gear-flag="junk"]'),
      scope:document.getElementById('inventoryPanel').innerText.includes('including items hidden by filters')};
  })()`);
  assert.ok(Object.values(controls).every(Boolean), JSON.stringify(controls));
  record('Gear exposes loadout protection, lock/junk controls and bulk-sale scope', true);
  await read(`document.querySelector('[data-gear-id="qol-loose"][data-gear-flag="locked"]').click(); true`);
  assert.equal(await read(`S.player.inventory.find(i=>i.id==='qol-loose').locked`), true);
  await pause();
  await read(`document.querySelector('[data-gear-id="qol-loose"][data-gear-flag="locked"]').click(); true`);
  await pause();
  await read(`document.querySelector('[data-gear-id="qol-loose"][data-gear-flag="junk"]').click(); true`);
  await read(`(() => { const input=document.getElementById('searchFilter'); input.value='does not exist'; input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  assert.equal(await read(`document.getElementById('inventoryPanel').innerText.includes('No items match these filters')`), true);
  await read(`document.querySelector('#inventoryPanel [data-clear-gear-filters]').click(); true`);
  assert.equal(await read(`S.filters.search === '' && document.activeElement.id === 'searchFilter'`), true);
  await pause();
  await read(`document.getElementById('sellJunkGearBtn').click(); true`);
  assert.equal(await read(`S.player.inventory.length === 1 && S.player.inventory[0].id === 'qol-kept' && /including items hidden by filters/.test(window.__qolConfirmation)`), true);
  record('Gear click flow toggles protection, clears filters and sells only eligible junk', true);
  await read(`document.querySelector('[data-named-loadout-action="switch"]').click(); true`);
  assert.equal(await read(`S.player.equipment.weapon.id === 'qol-kept' && S.player.inventory[0].id === 'qol-old' && /Old Blade/.test(window.__qolConfirmation)`), true);
  record('Switch Loadout previews displaced gear and applies through the public control', true);

  for (const width of [390, 430, 768]) {
    await client.send('Emulation.setDeviceMetricsOverride', {width, height:844, deviceScaleFactor:1, mobile:true});
    await client.send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:5});
    const geometry = await read(`(() => {
      S.screen='gear'; render();
      const panel=document.getElementById('inventoryPanel'); panel.scrollIntoView({block:'start'});
      const buttons=[...panel.querySelectorAll('button')];
      return {page:document.documentElement.scrollWidth <= innerWidth+1, panel:panel.scrollWidth <= panel.clientWidth+1,
        targets:buttons.every(b=>b.getBoundingClientRect().height>=43)};
    })()`);
    assert.ok(Object.values(geometry).every(Boolean), JSON.stringify({width,...geometry}));
    record(`Gear QoL ${width}px: no horizontal clipping and touch-sized controls`, true);
    if (width === 390) {
      const shot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      const file=path.join(tmpdir(),'dungeondex-qol-gear-review.png');
      await writeFile(file,Buffer.from(shot.data,'base64'));
      console.log('QoL visual capture: '+file);
    }
  }
  await read(`(() => {
    S.screen='archive'; render();
    window.__qolDownload = downloadSaveText;
    downloadSaveText = (raw,name) => { window.__qolExport = {raw,name}; };
    document.getElementById('exportSaveBtn').click();
    return true;
  })()`);
  assert.equal(await read(`JSON.parse(window.__qolExport.raw).player.equipment.weapon.id`),'qol-kept');
  const imported = await read(`(async () => {
    const candidate=JSON.parse(window.__qolExport.raw); candidate.player.gold=4321;
    const file=new File([JSON.stringify(candidate)],'transfer.json',{type:'application/json'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=document.getElementById('importSaveInput'); input.files=transfer.files;
    await input.onchange();
    const good=S.player.gold===4321 && JSON.parse(localStorage.getItem(STORAGE_KEY+'_before_import')).player.equipment.weapon.id==='qol-kept';
    const invalid=new DataTransfer(); invalid.items.add(new File(['{}'],'invalid.json'));
    const next=document.getElementById('importSaveInput'); next.files=invalid.files; await next.onchange();
    return {good,unchanged:S.player.gold===4321,message:document.querySelector('#settingsPanel [role="status"]').innerText};
  })()`);
  assert.ok(imported.good && imported.unchanged && imported.message.includes('Import failed'), JSON.stringify(imported));
  record('Save export/import controls transfer progress and reject an invalid file without replacing it',true);
  await read(`(() => {
    const panel=document.getElementById('settingsPanel'); panel.scrollIntoView({block:'start'});
    return true;
  })()`);
  const shot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const file=path.join(tmpdir(),'dungeondex-qol-save-review.png');
  await writeFile(file,Buffer.from(shot.data,'base64'));
  console.log('QoL visual capture: '+file);
  await read(`(() => { window.confirm=window.__qolConfirm; downloadSaveText=window.__qolDownload; return true; })()`);
}
