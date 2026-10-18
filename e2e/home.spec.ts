// The blank app end to end: the home page renders the app's name (APP_NAME)
// in a real browser against the dev server, and the client bundle hydrates
// without a failed request or a console error.
//
// The client code runs from Vite's pre-bundled dependency chunks, which unit
// tests and the server-side render never load, so only a browser run checks
// that the bundle boots in both layouts.
import { expect, test } from '@playwright/test';

const failures: string[] = [];

test.afterEach(() => {
  if (failures.length)
    console.log(`Failed requests and errors:\n${failures.join('\n')}`);
});

test('Home: renders the app name', async ({ page, baseURL }) => {
  failures.length = 0;
  page.on('response', (res) => {
    if (res.url().startsWith(baseURL!) && res.status() >= 400) {
      failures.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => failures.push(`pageerror: ${err.message}`));

  const appName = process.env.E2E_APP_NAME!;
  await page.goto('/');
  await expect(page.getByTestId('app-name')).toHaveText(appName);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(appName);

  // The page has hydrated: the client bundle loaded and ran.
  await page.waitForLoadState('networkidle');

  expect(failures, failures.join('\n')).toEqual([]);
});
