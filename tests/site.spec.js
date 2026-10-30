const { test, expect } = require('@playwright/test');

const pages = [
  '/', '/about.html', '/contact.html', '/privacy.html', '/how-to-play.html',
  '/game-racing.html', '/game-solitaire.html', '/game-chess.html',
  '/game-pong.html', '/game-connect.html', '/game-mines.html',
  '/game-flap.html', '/game-2048.html', '/game-bricks.html',
  '/game-snake.html', '/game-memory.html', '/game-ttt.html',
  '/game-rps.html', '/game-reaction.html', '/game-whack.html',
  '/game-space.html', '/game-runner.html', '/game-ludo.html'
];

for (const path of pages) {
  test(`page loads: ${path}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `No HTTP response for ${path}`).not.toBeNull();
    expect(response.status(), `${path} returned ${response.status()}`).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`page-${path.replace(/[^a-z0-9]/gi, '_')}.png`), fullPage: true });
    // Some third-party scripts may error; report them without masking a functional pass.
    if (errors.length) await testInfo.attach('javascript-errors', { body: errors.join('\n'), contentType: 'text/plain' });
  });
}

test('homepage game catalog and links', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#games')).toBeVisible();
  await expect(page.locator('a[href*="privacy"]')).toHaveCount(await page.locator('a[href*="privacy"]').count());
  expect(await page.locator('a[href*="privacy"]').count()).toBeGreaterThan(0);
  expect(await page.locator('a[href*="contact"]').count()).toBeGreaterThan(0);
  expect(await page.locator('a[href*="how-to-play"]').count()).toBeGreaterThan(0);
  await expect(page.locator('body')).toContainText(/games|arcade/i);
});

test('mobile page does not overflow horizontally', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only test');
  for (const path of ['/', '/how-to-play.html', '/game-runner.html', '/game-ludo.html']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content, `Horizontal overflow on ${path}: ${JSON.stringify(widths)}`).toBeLessThanOrEqual(widths.viewport + 3);
  }
});

test('sitemap and robots are readable', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok(), 'robots.txt missing').toBeTruthy();
  expect(await robots.text()).toMatch(/user-agent|sitemap/i);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok(), 'sitemap.xml missing').toBeTruthy();
  expect(await sitemap.text()).toContain('<urlset');
});

test('logo asset is available', async ({ request }) => {
  const r = await request.get('/assets/logo.svg');
  expect(r.ok()).toBeTruthy();
  expect(await r.text()).toContain('<svg');
});
