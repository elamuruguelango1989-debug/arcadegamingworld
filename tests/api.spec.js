const { test, expect } = require('@playwright/test');

// Read-only API checks: never POST fake leaderboard scores to production.
for (const endpoint of ['/api/leaderboard', '/api/favorites']) {
  test(`read-only API availability: ${endpoint}`, async ({ request }, testInfo) => {
    const response = await request.get(endpoint, { failOnStatusCode: false, timeout: 20000 });
    const body = (await response.text()).slice(0, 2500);
    await testInfo.attach('api-response', { body: `GET ${endpoint}\nHTTP ${response.status()}\n${body}`, contentType: 'text/plain' });
    // 400/405 can mean parameters/method needed; 404/5xx indicate route/configuration problems.
    expect(response.status(), `${endpoint} returned ${response.status()}: ${body.slice(0, 250)}`).not.toBe(404);
    expect(response.status()).toBeLessThan(500);
  });
}

test('runner endpoint diagnostic (non-blocking)', async ({ request }, testInfo) => {
  const response = await request.get('/api/runner', { failOnStatusCode: false });
  await testInfo.attach('runner-endpoint-status', { body: `GET /api/runner -> ${response.status()}\nNote: GET may be unsupported even when POST is configured.`, contentType: 'text/plain' });
});
