import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { World } from '../../src/engine';
import { snapshot } from '../../src/snapshots';

const legacy = () => {
  const w = new World(96,{ink:45,rest:3,threshold:5,crowd:3,cap:64,scale:4});w.start('islands',21);for(let i=0;i<80;i++)w.step();
  return {name:'slow lava',world:snapshot(w),pattern:'islands',seed:'21',palette:'ember',flat:{trails:0,bloom:0,contrast:0,ageColor:false},volume:{depth:48,relief:.12,glow:1,light:35,solid:false,autoRotate:false},camera:[.75,.7,2.1],speed:24,locks:['ink','rest'],view:false};
};
const panel = (page: any, name: string) => page.locator(`[data-panel="${name}"]`).click();

test('studio controls preserve the original rules and research',async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.locator('#art-title')).toContainText('Slow Lava');await expect(page.locator('#play')).toHaveText('Run');
  await page.locator('#step').click();await expect(page.locator('#tick')).toContainText('161');
  await panel(page,'workshop');await page.getByRole('button',{name:'Middle memory Extinction'}).click();await page.locator('#play').click();
  await expect(page.locator('#param-ink')).toHaveValue('12');await page.locator('#pattern').selectOption('blank');
  await expect(page.locator('#density')).toHaveText('0.0%');await panel(page,'compose');await page.locator('#center').click();
  await expect(page.locator('#balance')).toContainText('A 100%');await panel(page,'workshop');await page.locator('#erase-memory').click();
  await expect(page.locator('#status')).toContainText('Pulses and recovery states were preserved');
  await page.locator('#wrap').check();await expect(page.locator('#edge-label')).toHaveText('WRAPPING EDGES');
  await page.locator('#param-ink').fill('30');await expect(page.locator('#value-ink')).toHaveText('30');
  await page.getByRole('link',{name:'Read the field notes'}).click();await expect(page.getByRole('heading',{name:'The six-cell spring.',exact:true})).toBeVisible();
  for(const path of ['research-notes.md','cycle-certificate.json','deposit-sweep.json','spring-hunt.json'])expect((await request.get('/archive/'+path)).ok()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('main controls and canvas fit desktop, phone, and landscape phone',async({page})=>{
  await page.goto('/');
  for(const [width,height] of [[1440,900],[390,844],[375,667],[320,568],[844,390]]){
    await page.setViewportSize({width,height});await panel(page,'look');
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    const canvas=await page.locator('#world').boundingBox(),inspector=await page.locator('.inspector').boundingBox();
    expect(canvas!.width).toBeGreaterThan(70);expect(canvas!.height).toBeGreaterThan(35);
    expect(canvas!.x+canvas!.width<=inspector!.x+1 || canvas!.y+canvas!.height<=inspector!.y+1).toBe(true);
    for(const id of ['softness','surface-depth','afterglow','pace']){
      const b=(await page.locator('#'+id).boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(height);expect(b.x+b.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({path:`test-results/studio-${width}x${height}.png`});
  }
  await page.setViewportSize({width:390,height:844});await panel(page,'compose');await page.locator('#format').selectOption('portrait');
  await expect.poll(async()=>{const b=(await page.locator('#world').boundingBox())!;return Math.abs(b.width/b.height-9/16)<.02;}).toBe(true);
  await page.locator('#quiet-space').selectOption('left');await page.locator('#detail-zoom').fill('240');
  await page.locator('#world').click();await expect(page.locator('#undo')).toBeEnabled();
});

test('old discoveries restore without losing rules, and new art settings round trip',async({page})=>{
  const old=legacy();await page.addInitScript(d=>localStorage.setItem('palimpsest-discoveries-v1',JSON.stringify([d])),old);
  await page.goto('/');await panel(page,'library');await page.locator('#saved').selectOption('0');await page.locator('#restore-world').click();
  await expect(page.locator('#art-title')).toHaveText('slow lava');await expect(page.locator('#param-ink')).toHaveValue('45');await expect(page.locator('#play')).toHaveText('Run');
  await expect(page.locator('#tick')).toContainText('80');await expect(page.locator('#lock-ink')).toBeChecked();
  await panel(page,'look');await page.locator('[data-surface="satin"]').click();await page.locator('#softness').fill('42');
  await panel(page,'compose');await page.locator('#format').selectOption('portrait');await page.locator('#quiet-space').selectOption('right');
  await page.locator('#open-save').click();await page.locator('#discovery-name').fill('New silk');await page.locator('#save-world').click();
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('palimpsest-discoveries-v1')!));
  expect(data[0]).toEqual(old);expect(data[1].world).toEqual(old.world);expect(data[1].art).toMatchObject({surface:'satin',softness:42,format:'portrait',quiet:'right'});
  await page.locator('[data-material="tide"]').click();await panel(page,'library');await page.locator('#saved').selectOption('1');await page.locator('#restore-world').click();
  await expect(page.locator('#softness')).toHaveValue('42');await expect(page.locator('#format')).toHaveValue('portrait');await expect(page.locator('#quiet-space')).toHaveValue('right');
  const before=await page.evaluate(()=>localStorage.getItem('palimpsest-discoveries-v1'));
  await page.locator('#import-collection').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('[{"name":"broken"}]')});
  await expect(page.locator('#collection-empty')).toContainText('Could not import');expect(await page.evaluate(()=>localStorage.getItem('palimpsest-discoveries-v1'))).toBe(before);
});

test('curated variations undo both the composition and its metadata',async({page})=>{
  await page.goto('/');await page.locator('[data-material="tide"]').click();
  const seed=await page.locator('#seed').inputValue();await page.locator('#vary').click();expect(await page.locator('#seed').inputValue()).not.toBe(seed);
  await page.locator('#undo').click();await expect(page.locator('#seed')).toHaveValue(seed);await expect(page.locator('#palette')).toHaveValue('signal');
  await page.locator('#undo').click();await expect(page.locator('#palette')).toHaveValue('ember');await expect(page.locator('#pace')).toHaveValue('8');
});

test('4K PNG export has the chosen composition dimensions and preserves the world',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await panel(page,'compose');await page.locator('#format').selectOption('portrait');
  const before=await page.locator('#world').getAttribute('aria-label');await page.locator('#open-export').click();await page.locator('#export-quality').selectOption('3840');
  const downloaded=page.waitForEvent('download');await page.locator('#render-export').click();const file=await downloaded;
  await file.saveAs('test-results/studio-4k.png');
  const buffer=await readFile((await file.path())!);expect(buffer.readUInt32BE(16)).toBe(2160);expect(buffer.readUInt32BE(20)).toBe(3840);expect(buffer.length).toBeGreaterThan(50000);
  await expect(page.locator('#export-status')).toContainText('Ready.');expect(await page.locator('#world').getAttribute('aria-label')).toBe(before);await expect(page.locator('#play')).toHaveText('Run');
});

test('motion export produces an encoded video and restores transport',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await page.locator('#open-export').click();await page.locator('#export-kind').selectOption('video');
  const downloaded=page.waitForEvent('download',{timeout:45000});await page.locator('#render-export').click();const file=await downloaded;
  const buffer=await readFile((await file.path())!);expect(buffer.length).toBeGreaterThan(10000);expect(buffer.subarray(0,4).toString('hex')).toBe('1a45dfa3');
  await expect(page.locator('#export-status')).toContainText('Ready.');await expect(page.locator('#play')).toHaveText('Run');
});

test('volume and verified patterns remain available in the workshop',async({page})=>{
  await page.goto('/');await panel(page,'workshop');
  await page.getByText('Original rendering & volume',{exact:true}).click();await page.locator('#size').selectOption('96');
  await expect(page.locator('#grid-label')).toHaveText('96 × 96');
  for(const pattern of ['spring5','spring8','spring6b']){
    await page.locator('#pattern').selectOption(pattern);await expect(page.locator('#preset')).toHaveValue('cathedral');await expect(page.locator('#memory')).toBeChecked();
  }
  await page.locator('#view-3d').click();await expect(page.locator('#volume')).toBeVisible();await page.locator('#depth').fill('120');await expect(page.locator('#value-depth')).toHaveText('120');
  await page.locator('#step').click();await page.locator('#view-2d').click();await expect(page.locator('#world')).toBeVisible();
});


test('original Canvas fallback still composes and exports without WebGL',async({page})=>{
  await page.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:any[]){return type==='webgl'||type==='webgl2'?null:(get as any).call(this,type,...args);} as any;
  });
  await page.goto('/');await expect(page.locator('#status')).toContainText('Showing the original renderer');
  await panel(page,'compose');await page.locator('#quiet-space').selectOption('left');await page.locator('#format').selectOption('square');
  await page.locator('#open-export').click();const download=page.waitForEvent('download');await page.locator('#render-export').click();const file=await download;
  const buffer=await readFile((await file.path())!);expect(buffer.readUInt32BE(16)).toBe(1920);expect(buffer.readUInt32BE(20)).toBe(1920);
});

test('optional browser-agent tools still operate on the same simulation',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).__tools={};Object.defineProperty(document,'modelContext',{value:{registerTool(tool:any){(window as any).__tools[tool.name]=tool;}}});
  });
  await page.goto('/');const result=await page.evaluate(()=>{
    const tools=(window as any).__tools;const state=tools.start_palimpsest_experiment.execute({deposit:12});
    let rejected=false;try{tools.start_palimpsest_experiment.execute({deposit:999});}catch{rejected=true;}
    return {state,rejected};
  });expect(result.state.parameters.ink).toBe(12);expect(result.rejected).toBe(true);
});

test('painting while paused updates the organic surface and look changes preserve its field',async({page})=>{
  await page.goto('/');await panel(page,'workshop');await page.locator('#pattern').selectOption('blank');await panel(page,'compose');
  const pixels=()=>page.locator('#world').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  const empty=await pixels();await page.locator('#center').click();const painted=await pixels();expect(painted).not.toBe(empty);
  await panel(page,'look');await page.locator('#softness').fill('20');expect(await pixels()).not.toBe(painted);
  await page.locator('#softness').fill('65');expect(await pixels()).toBe(painted);
});
