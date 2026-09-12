import { test, expect } from '@playwright/test';

test('lab controls, notes, and downloadable evidence work', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A world that remembers.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeVisible();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#tick')).toContainText('1');
  await page.getByRole('button', { name: 'Middle memory Extinction' }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(page.locator('#param-ink')).toHaveValue('12');
  await page.locator('#pattern').selectOption('blank');
  await expect(page.locator('#density')).toHaveText('0.0%');
  await page.getByRole('button', { name: 'Paint at center' }).click();
  await expect(page.locator('#balance')).toContainText('A 100%');
  await page.getByRole('button', { name: 'Erase ground memory' }).click();
  await expect(page.locator('#status')).toContainText('Pulses and recovery states were preserved');
  await page.locator('#wrap').check();
  await expect(page.locator('#edge-label')).toHaveText('WRAPPING EDGES');
  await page.locator('#preset').selectOption('estuary');
  await page.getByRole('button', { name: 'New islands' }).click();
  await expect(page.locator('#pattern')).toHaveValue('islands');
  await page.locator('#rule-editor').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.locator('#param-ink').fill('30');
  await expect(page.locator('#value-ink')).toHaveText('30');
  await page.getByRole('link', { name: 'Field notes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The six-cell spring.', exact: true })).toBeVisible();
  await expect(page.getByText('A/B clock · period 26', { exact: true })).toBeVisible();
  for (const path of ['/archive/research-notes.md', '/archive/cycle-certificate.json', '/archive/deposit-sweep.json', '/archive/six-cell-spring.gif', '/archive/search.json']) {
    const result = await request.get(path); expect(result.ok()).toBeTruthy();
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/notes-desktop.png' });
});

test('desktop and phone layouts fit, and canvas painting works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 }); await page.goto('/');
  await page.getByRole('button', { name: 'Strong memory 26-tick clock' }).click();
  await page.waitForTimeout(1800); await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.screenshot({ path: 'test-results/lab-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 430, height: 932 });
  const size = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewport: innerWidth, inner: innerHeight }));
  expect(size.page).toBeLessThanOrEqual(size.viewport); expect(size.height).toBeLessThanOrEqual(size.inner);
  // Phone shell: controls live in sheets opened from the dock, and the world stays visible above them.
  await expect(page.locator('.dock')).toBeVisible();
  await expect(page.locator('#pattern')).toBeHidden();
  await page.locator('#dock-rules').click();
  await expect(page.locator('#pattern')).toBeVisible();
  await page.locator('#pattern').selectOption('blank');
  await page.locator('#sheet-close').click();
  await expect(page.locator('#pattern')).toBeHidden();
  await page.locator('#dock-look').click();
  await expect(page.locator('#size')).toBeVisible();
  await page.waitForTimeout(300);
  const box = (await page.locator('#world').boundingBox())!, sheet = (await page.locator('.controls').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + 1);
  await page.locator('#dock-look').click();
  const canvas = page.locator('#world'); await canvas.click({ position: { x: 60, y: 60 } });
  await expect(page.locator('#balance')).toContainText('A 100%');
  await page.locator('#dock-rules').click(); await page.locator('#brush').selectOption('b'); await page.locator('#sheet-close').click();
  await canvas.click({ position: { x: 160, y: 160 } });
  await expect(page.locator('#balance')).not.toContainText('B 0%');
  await expect(page.locator('#strip-density')).not.toHaveText('0.0%');
  await page.screenshot({ path: 'test-results/lab-mobile.png', fullPage: true });
  await page.goto('/#notes');
  await expect(page.getByRole('heading', { name: 'The six-cell spring.', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('optional browser-agent tools use the same state and reject invalid inputs', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__tools = {};
    Object.defineProperty(document, 'modelContext', { value: { registerTool(tool: any) { (window as any).__tools[tool.name] = tool; } } });
  });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const tools = (window as any).__tools;
    const before = tools.read_palimpsest_world.execute({});
    const started = tools.start_palimpsest_experiment.execute({ deposit: 12 });
    let rejected = false;
    try { tools.start_palimpsest_experiment.execute({ deposit: 999 }); } catch { rejected = true; }
    const after = tools.read_palimpsest_world.execute({});
    return { names: Object.keys(tools), before, started, after, rejected, annotation: tools.read_palimpsest_world.annotations, schema: tools.start_palimpsest_experiment.inputSchema };
  });
  expect(result.names).toHaveLength(2); expect(result.rejected).toBeTruthy();
  expect(result.annotation.readOnlyHint).toBeTruthy(); expect(result.schema.required).toEqual(['deposit']);
  expect(result.started.parameters.ink).toBe(12); expect(result.after.parameters.ink).toBe(12);
  await expect(page.locator('#param-ink')).toHaveValue('12');
});

test('world size, presets, palette, and the 3D volume view work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('#size').selectOption('256');
  await expect(page.locator('#grid-label')).toHaveText('256 × 256');
  expect(await page.locator('#world').getAttribute('width')).toBe('256');
  await page.locator('#pattern').selectOption('blank');
  await page.getByRole('button', { name: 'Paint at center' }).click();
  await expect(page.locator('#balance')).toContainText('A 100%');
  await page.locator('#preset').selectOption('loom');
  await expect(page.locator('#value-ink')).toHaveText('0');
  await expect(page.locator('#value-rest')).toHaveText('1');
  await page.locator('#palette').selectOption('ember');
  await page.locator('#size').selectOption('96');
  await page.locator('#preset').selectOption('cathedral'); await page.locator('#pattern').selectOption('spring');
  await page.getByRole('button', { name: 'Volume' }).click();
  await expect(page.locator('#volume')).toBeVisible();
  await expect(page.locator('#world')).toBeHidden();
  await expect(page.locator('#volume-controls')).toBeVisible();
  await page.locator('#depth').fill('120'); await expect(page.locator('#value-depth')).toHaveText('120');
  await page.locator('#solid').check();
  for (let i = 0; i < 20; i++) await page.locator('#step').dispatchEvent('click');
  await expect(page.locator('#tick')).toContainText('20');
  const drawn = await page.evaluate(() => new Promise<boolean>(resolve => requestAnimationFrame(() => {
    const canvas = document.getElementById('volume') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2')!; const px = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let bright = 0; for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 150) bright++;
    resolve(canvas.width > 100 && bright > 50);
  })));
  expect(drawn).toBeTruthy();
  await page.getByRole('button', { name: 'Flat' }).click();
  await expect(page.locator('#world')).toBeVisible();
  expect(errors).toEqual([]);
});
