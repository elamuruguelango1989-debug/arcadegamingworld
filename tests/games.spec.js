
const { test, expect } = require('@playwright/test');

const games = [
  ['Neon Highway', 'game-racing.html'],
  ['Solitaire', 'game-solitaire.html'],
  ['Chess', 'game-chess.html'],
  ['Pong', 'game-pong.html'],
  ['Connect Four', 'game-connect.html'],
  ['Minesweeper', 'game-mines.html'],
  ['Sky Hopper', 'game-flap.html'],
  ['2048', 'game-2048.html'],
  ['Brick Breaker', 'game-bricks.html'],
  ['Neon Snake', 'game-snake.html'],
  ['Memory Match', 'game-memory.html'],
  ['Tic Tac Toe', 'game-ttt.html'],
  ['Rock Paper Scissors', 'game-rps.html'],
  ['Reflex Rush', 'game-reaction.html'],
  ['Whack-a-Mole', 'game-whack.html'],
  ['Nebula Strike', 'game-space.html'],
  ['Skyline Sprint', 'game-runner.html'],
  ['Ludo', 'game-ludo.html']
];

for (const [name, file] of games) {
  test(`game smoke: ${name}`, async ({ page }, testInfo) => {
    const errors = [];

    page.on('pageerror', error => errors.push(error.message));

    const response = await page.goto(`/${file}`, {
      waitUntil: 'domcontentloaded'
    });

    expect(response?.status()).toBeLessThan(400);

    if (name === 'Ludo') {
      await expect(page.locator('body')).toContainText(
        /Meet you at home|Roll dice|Ludo/i
      );
    } else {
      await expect(page.locator('body')).toContainText(
        new RegExp(
          name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i'
        )
      );
    }

    const play = page.getByRole('link', {
      name: /play|start|open/i
    }).first();

    if (await play.count()) {
      const href = await play.getAttribute('href');

      if (href && /index\.html|#/.test(href)) {
        await play.click();
        await expect(page.locator('body')).toBeVisible();
      }
    }

    await page.screenshot({
      path: testInfo.outputPath(`${file}-smoke.png`),
      fullPage: true
    });

    if (errors.length) {
      await testInfo.attach('javascript-errors', {
        body: errors.join('\n'),
        contentType: 'text/plain'
      });
    }
  });
}

test('homepage can open a game', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const cards = page.locator('#grid button, #grid a');

  await expect(cards.first()).toBeVisible({
    timeout: 15000
  });

  await cards.first().click();

  const modal = page.locator('#modal');

  await expect.poll(async () => {
    if (await modal.isVisible().catch(() => false)) {
      return 'modal';
    }

    if (/game-[a-z0-9-]+(?:\.html)?(?:[?#]|$)/i.test(page.url())) {
      return 'page';
    }

    return 'waiting';
  }, { timeout: 15000 }).not.toBe('waiting');

  if (await modal.isVisible().catch(() => false)) {
    await expect(page.locator('#gameTitle')).not.toBeEmpty();

    await page.screenshot({
      path: testInfo.outputPath('opened-game-dialog.png')
    });

    await page.getByRole('button', {
      name: 'Close game'
    }).click();

    await expect(modal).not.toBeVisible();
  } else {
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('opened-game-page.png')
    });
  }
});

test('game search filters catalog', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const search = page.getByRole('searchbox', {
    name: /search games/i
  });

  await expect(search).toBeVisible();

  await search.fill('Snake');

  await expect(page.locator('#grid')).toContainText(/snake/i);
});
