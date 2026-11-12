// The People example end to end: list, add, edit and delete a Person in a
// real browser against the dev server.
//
// This runs the client code from Vite's pre-bundled dependency chunks, which is
// where a shape class can be renamed by esbuild (`Person` -> `Person3`): the
// server then refuses every Person query with 400 "Invalid query" / "Cannot
// resolve shape .../schema/Person3". Unit tests and the server-side render never
// load those chunks, so only a browser run catches it.
import { expect, test } from '@playwright/test';

const failures: string[] = [];

// A failed step stops the test before the final check, so the failed requests
// and console errors are printed here, where they explain it.
test.afterEach(() => {
  if (failures.length)
    console.log(`Failed requests and errors:\n${failures.join('\n')}`);
});

test('People: add, edit and delete a person', async ({ page, baseURL }) => {
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

  const given = `Smoke${Date.now()}`;
  const family = 'Tester';

  await page.goto('/');
  const overview = page.getByTestId('person-overview');
  await expect(overview.getByRole('heading', { name: 'People' })).toBeVisible();

  // Add is disabled until React has hydrated, i.e. until the client bundle runs.
  const add = overview.getByRole('button', { name: 'Add' });
  await expect(add).toBeEnabled({ timeout: 30_000 });
  await overview.getByPlaceholder('First name').fill(given);
  await overview.getByPlaceholder('Last name').fill(family);
  await add.click();

  const list = page.getByTestId('person-list');
  const row = list.locator('li', { hasText: given });
  await expect(row).toContainText(given);
  await expect(row).toContainText(family);

  // The write reached the store: a fresh load lists it too.
  await page.reload();
  await expect(row).toBeVisible();
  await expect(add).toBeEnabled({ timeout: 30_000 });

  await row.getByRole('button', { name: 'Edit' }).click();
  // In edit mode the names sit in inputs, so the row no longer matches by text.
  const editor = list.getByTestId('person-edit');
  await expect(editor.getByLabel('First name')).toHaveValue(given);
  await editor.getByLabel('Last name').fill('Edited');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(row).toContainText('Edited');

  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(list.locator('li', { hasText: given })).toHaveCount(0);

  expect(failures, failures.join('\n')).toEqual([]);
});
