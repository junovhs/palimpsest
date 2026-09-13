import { test, expect } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';

async function load(page:any,id:string){await page.locator('#browse-presets').click();await page.locator(`[data-preset="${id}"]`).click();}

test('all twenty presets have distinct, nonblank rendered previews',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:1440,height:960});await page.goto('/');await page.locator('#browse-presets').click();
  await expect(page.locator('[data-preset]')).toHaveCount(20);
  await expect.poll(()=>page.locator('[data-preset="afterimage"] canvas').evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4!==3&&v>0)),{timeout:30000}).toBe(true);
  const result=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll<HTMLButtonElement>('[data-preset]')];const contact=document.createElement('canvas');contact.width=1200;contact.height=850;const ctx=contact.getContext('2d')!;ctx.fillStyle='#f3f1ea';ctx.fillRect(0,0,1200,850);
    const stats=cards.map((b,i)=>{const c=b.querySelector('canvas')!,pixels=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let min=765,max=0;const colors=new Set<string>();for(let j=0;j<pixels.length;j+=16){const sum=pixels[j]+pixels[j+1]+pixels[j+2];min=Math.min(min,sum);max=Math.max(max,sum);colors.add(`${pixels[j]},${pixels[j+1]},${pixels[j+2]}`);}const x=i%5*240,y=Math.floor(i/5)*212;ctx.drawImage(c,x,y,240,150);ctx.fillStyle='#302f2b';ctx.font='16px sans-serif';ctx.fillText(b.querySelector('strong')!.textContent!,x+10,y+174);return {id:b.dataset.preset,range:max-min,colors:colors.size,image:c.toDataURL()};});return {stats,contact:contact.toDataURL()};
  });
  for(const s of result.stats){expect(s.range,s.id).toBeGreaterThan(35);expect(s.colors,s.id).toBeGreaterThan(4);}
  expect(new Set(result.stats.map(s=>s.image)).size).toBe(20);
  await writeFile('test-results/synth-contact-sheet.png',Buffer.from(result.contact.split(',')[1],'base64'));
  await page.locator('#preset-search').fill('ink');await expect(page.locator('[data-preset]:visible')).toHaveCount(1);await page.locator('#preset-search').fill('');await page.locator('#preset-family').selectOption('Particles');await expect(page.locator('[data-preset]:visible')).toHaveCount(2);
});

test('blueprint supports image wiring, modulation, bypass, and rejects invalid wires',async({page})=>{
  await page.goto('/');await page.locator('#open-blueprint').click();
  await page.locator('#module-kind').selectOption('noise');await page.locator('#module-add').click();
  await page.locator('#module-kind').selectOption('warp');await page.locator('#module-add').click();
  await page.locator('#module-kind').selectOption('lfo');await page.locator('#module-add').click();
  await page.getByRole('button',{name:'LFO signal output',exact:true}).click();await page.getByRole('button',{name:'Modulate Displace Amount',exact:true}).click();
  await expect(page.locator('#patch-wires .signal-wire')).toHaveCount(1);
  await page.getByRole('button',{name:'Displace image output',exact:true}).click();await page.getByRole('button',{name:'Displace input 1',exact:true}).click();await expect(page.locator('#patch-status')).toContainText('cycle');
  await page.locator('#patch-cancel-wire').click();await page.getByRole('button',{name:'LFO signal output',exact:true}).click();await page.getByRole('button',{name:'Displace input 1',exact:true}).click();await expect(page.locator('#patch-status')).toContainText('image');
  await page.locator('#patch-cancel-wire').click();await page.getByRole('button',{name:'Select Displace',exact:true}).click();await page.locator('#node-bypass').click();await expect(page.locator('#node-bypass')).toHaveAttribute('aria-pressed','true');await page.locator('#node-bypass').click();
  await page.locator('[data-depth="amount"]').fill('0.35');await page.locator('#patch-save').click();await page.locator('#discovery-name').fill('My blueprint');await page.locator('#save-world').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('palimpsest-discoveries-v1')!).at(-1));expect(saved.art.patch.nodes.find((n:any)=>n.kind==='warp').mods.amount.depth).toBe(.35);
  await page.locator('#saved').selectOption('0');await page.locator('#restore-world').click();await page.locator('[data-panel="look"]').click();await page.locator('#open-blueprint').click();await expect(page.locator('.patch-node')).toHaveCount(4);await expect(page.locator('.signal-wire')).toHaveCount(1);
});

test('DAG render order matters, modulation animates, and echo is stable when paused',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {SynthRenderer}=await import('/src/synth-renderer.ts' as string);const {makeNode}=await import('/src/patch.ts' as string);
    const renderer=new SynthRenderer(),canvas=document.createElement('canvas'),source=document.createElement('canvas');canvas.width=256;canvas.height=160;source.width=source.height=1;
    const a=makeNode('noise','noise'),b=makeNode('palette','palette'),c=makeNode('threshold','threshold');b.params.theme=4;b.inputs=['noise'];c.inputs=['palette'];const patch={version:1,nodes:[a,b,c],output:'threshold'};
    renderer.draw(canvas,source,patch,0,.2,21);const first=canvas.toDataURL();c.inputs=['noise'];b.inputs=['threshold'];patch.output='palette';renderer.draw(canvas,source,patch,0,.2,21);const second=canvas.toDataURL();
    const lfo=makeNode('lfo','lfo');lfo.params.rate=1;a.mods.scale={source:'lfo',depth:.3};patch.nodes.push(lfo);renderer.draw(canvas,source,patch,.25,.2,21);const third=canvas.toDataURL();renderer.draw(canvas,source,patch,.75,.2,21);const fourth=canvas.toDataURL();
    const echo=makeNode('echo','echo');echo.inputs=['palette'];patch.nodes.push(echo);patch.output='echo';renderer.draw(canvas,source,patch,1,.2,21);renderer.draw(canvas,source,patch,1.1,.2,21);const paused=canvas.toDataURL();renderer.draw(canvas,source,patch,1.1,.2,21);const repeated=canvas.toDataURL();
    const copy=new SynthRenderer();copy.copyHistory(renderer);copy.draw(canvas,source,patch,1.1,.2,21);const copied=canvas.toDataURL();const errors=[renderer.canvas.getContext('webgl')!.getError(),copy.canvas.getContext('webgl')!.getError()];renderer.dispose();copy.dispose();return {first,second,third,fourth,paused,repeated,copied,errors};
  });
  expect(result.first).not.toBe(result.second);expect(result.third).not.toBe(result.fourth);expect(result.paused).toBe(result.repeated);expect(result.copied).toBe(result.paused);expect(result.errors).toEqual([0,0]);
});

test('presets and blueprint remain usable on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await load(page,'moire');await expect(page.locator('#art-title')).toHaveText('Moiré Study');
  await page.locator('#open-blueprint').click();await expect(page.locator('#module-add')).toBeVisible();await page.locator('#module-kind').selectOption('grain');await page.locator('#module-add').click();await expect(page.locator('#node-settings h3')).toHaveText('Film grain');
  const bounds=await page.locator('#patch-editor').boundingBox();expect(bounds!.width).toBeLessThanOrEqual(390);expect(bounds!.height).toBeLessThanOrEqual(844);
  await page.locator('[data-knob="amount"]').fill('0.12');await page.screenshot({path:'test-results/blueprint-mobile.png'});await page.getByRole('button',{name:'Close blueprint',exact:true}).click();
  await page.locator('#browse-presets').click();await expect(page.locator('#preset-search')).toBeVisible();await page.screenshot({path:'test-results/preset-library-mobile.png'});
});

test('a procedural synth patch exports to PNG and retains its saved phase',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await load(page,'topography');await page.locator('#step').click();
  await page.locator('#open-export').click();const next=page.waitForEvent('download');await page.locator('#render-export').click();const file=await next;const bytes=await readFile((await file.path())!);expect(bytes.readUInt32BE(16)).toBe(1920);expect(bytes.readUInt32BE(20)).toBe(1080);expect(bytes.length).toBeGreaterThan(100000);
  await page.getByRole('button',{name:'Close export',exact:true}).click();await page.locator('#open-save').click();await page.locator('#discovery-name').fill('Contours at rest');await page.locator('#save-world').click();const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('palimpsest-discoveries-v1')!).at(-1));expect(data.art.synthTime).toBe(.125);expect(data.art.patch.nodes).toHaveLength(4);
});

test('moving a module changes its saved position and editor Undo restores it',async({page})=>{
  await page.goto('/');await page.locator('#open-blueprint').click();const header=page.locator('[data-node-select="life"]'),box=(await header.boundingBox())!;
  const before=await page.locator('[data-node="life"]').getAttribute('style');
  await page.mouse.move(box.x+40,box.y+20);await page.mouse.down();await page.mouse.move(box.x+130,box.y+70,{steps:5});await page.mouse.up();
  await expect(page.locator('[data-node="life"]')).not.toHaveAttribute('style',before!);await page.locator('#patch-undo').click();await expect(page.locator('[data-node="life"]')).toHaveAttribute('style',before!);
});
