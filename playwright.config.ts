// Smoke test for the People example: boots `linked start` (the Vite dev server,
// with its pre-bundled client dependencies) against a real Fuseki and drives the
// screen in Chromium, in two layouts:
//
// - `template`: this repository as it is;
// - `project`: the app as Create Now generates it, with an ontology and an asset
//   package in packages/ (see e2e/project-app.mjs), built in a scratch directory.
//
// A third project, `gateway-boot`, boots the app once more with a dead gateway
// endpoint and checks it stops (e2e/gateway-boot.spec.ts); no browser.
//
// Run with `npm run test:e2e`. Needs Fuseki at FUSEKI_BASE_URL (default
// http://localhost:3030, admin/admin) and Chromium (`npx playwright install
// chromium`). Each layout uses its own throwaway dataset, created on boot
// (LINKED_DATASET_ENSURE=1) and dropped again in e2e/teardown.ts.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// The config is evaluated again in every worker, so the generated names go
// into the environment the workers inherit.
if (!process.env.E2E_DATASET) {
  process.env.E2E_DATASET = `app-template-e2e-${Date.now()}`;
  process.env.E2E_DATASET_GENERATED = '1';
}
const dataset = process.env.E2E_DATASET;

const port = Number(process.env.E2E_PORT || 4517);
// One scratch project per port, replaced on every run (see e2e/teardown.ts). It
// sits outside this repository so nothing resolves from this node_modules.
const projectDir = join(tmpdir(), `app-template-e2e-project-${port + 1}`);
const templateOrigin = `http://localhost:${port}`;
const projectOrigin = `http://localhost:${port + 1}`;

function appEnv(origin: string, appPort: number, appDataset: string) {
  return {
    NODE_ENV: 'development',
    PORT: String(appPort),
    SITE_ROOT: origin,
    DATA_ROOT: `${origin}/data`,
    FUSEKI_DATASET: appDataset,
    LINKED_DATASET_ENSURE: '1',
  };
}

// E2E_REUSE_SERVER=1 drives apps that are already running on those ports.
const reuseExistingServer = process.env.E2E_REUSE_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  globalTeardown: './e2e/teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'template',
      testMatch: 'people.spec.ts',
      use: { baseURL: templateOrigin },
    },
    {
      name: 'project',
      testMatch: 'people.spec.ts',
      use: { baseURL: projectOrigin },
    },
    { name: 'gateway-boot', testMatch: 'gateway-boot.spec.ts' },
  ],
  webServer: [
    {
      name: 'template',
      command: 'npm start',
      url: `${templateOrigin}/`,
      reuseExistingServer,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: appEnv(templateOrigin, port, dataset),
    },
    {
      name: 'project',
      command: `node e2e/project-app.mjs "${projectDir}" && cd "${projectDir}" && npm start`,
      url: `${projectOrigin}/`,
      reuseExistingServer,
      timeout: 600_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: appEnv(projectOrigin, port + 1, `${dataset}-project`),
    },
  ],
});
