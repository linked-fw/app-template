// Gateway mode fails loudly: with CN_EG_GATEWAY set (a host started the app)
// and nothing answering there, `npm start` must exit non-zero with
// GatewayUnreachableError, never carry on against the local Fuseki.
//
// No browser and no dev server: the test boots the app itself with a dead
// endpoint and reads its exit code and output. The webServer apps the config
// starts are not used here.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('gateway mode: an unreachable gateway stops the boot', async () => {
  test.setTimeout(180_000);
  const port = Number(process.env.E2E_PORT || 4517) + 2;
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(port),
    SITE_ROOT: `http://localhost:${port}`,
    DATA_ROOT: `http://localhost:${port}/data`,
    // Port 1 answers nothing, on every machine.
    CN_EG_GATEWAY: 'http://127.0.0.1:1/gateway',
    CN_APP_SERVICE_SECRET: 'x',
  };
  delete env.E2E_DATASET;

  const child = spawn('npm', ['start'], {
    cwd: repo,
    env,
    shell: process.platform === 'win32',
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const exitCode = await new Promise<number | null>((done) =>
    child.on('exit', (code) => done(code)),
  );

  expect(exitCode, output).not.toBe(0);
  expect(output).toContain('GatewayUnreachableError');
  expect(output).toContain('http://127.0.0.1:1/gateway');
  expect(output).toContain('does not fall back to Fuseki');
});
