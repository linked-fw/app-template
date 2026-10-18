// An app whose `appData` is a RemoteDataset (as a host such as Create Now
// writes it) boots against DATA_SERVER_URL with DATA_SERVER_TOKEN, and stops
// with a message when the data server cannot be used.
//
// No browser. Each test boots a scratch copy of this repo (its
// linked.backend.datasets.json switched by e2e/remote-mode.mjs, node_modules
// linked from the repo) and reads its exit code and output. The data server
// is a small node:http stub, so no Create Now is needed.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.E2E_PORT || 4517) + 2;
const origin = `http://localhost:${port}`;
const scratch = join(tmpdir(), `app-template-e2e-remote-${port}`);

const skip = new Set([
  'node_modules',
  '.git',
  '.env',
  'packages-local',
  '.packages-local.parked',
  'test-results',
  'playwright-report',
  'build',
  'lib',
  'data',
]);

test.beforeAll(() => {
  if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
  cpSync(repo, scratch, {
    recursive: true,
    filter: (src) => {
      const rel = relative(repo, src);
      return rel === '' || !skip.has(rel.split(sep)[0]);
    },
  });
  symlinkSync(join(repo, 'node_modules'), join(scratch, 'node_modules'), 'dir');
  const res = spawnSync('node', [join(repo, 'e2e', 'remote-mode.mjs'), scratch], {
    encoding: 'utf8',
  });
  expect(res.status, res.stderr).toBe(0);
});

test.afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** A data server stub: `ping` answers `pingStatus`, queries answer []/null. */
async function dataServer(pingStatus: 200 | 401): Promise<Server> {
  const server = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const method = req.url?.match(/^\/call\/@_linked\/server\/(\w+)$/)?.[1];
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST' || !method) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
      } else if (method === 'ping' && pingStatus === 401) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'unknown token', code: 'invalid-credential' }));
      } else if (method === 'ping') {
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.end(JSON.stringify(method === 'selectQuery' ? [] : null));
      }
    });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return server;
}

function stubUrl(server: Server) {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function start(dataServerUrl: string) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(port),
    SITE_ROOT: origin,
    DATA_ROOT: `${origin}/data`,
    DATA_SERVER_URL: dataServerUrl,
    DATA_SERVER_TOKEN: 'test-token',
  };
  delete env.E2E_DATASET;
  const child = spawn('npm', ['start'], {
    cwd: scratch,
    env,
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  const run = { child, output: '' };
  child.stdout?.on('data', (chunk) => (run.output += chunk));
  child.stderr?.on('data', (chunk) => (run.output += chunk));
  return run;
}

function exited(child: ChildProcess) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise<number | null>((done) => child.on('exit', (code) => done(code)));
}

function stop(child: ChildProcess) {
  if (child.exitCode !== null || !child.pid) return;
  try {
    // The whole group: npm, linked start and its server.
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

test.describe.configure({ timeout: 180_000 });

test('an unreachable data server stops the boot with its url', async () => {
  // Port 1 answers nothing, on every machine.
  const url = 'http://127.0.0.1:1/gateway';
  const run = start(url);
  const code = await exited(run.child);
  expect(code, run.output).not.toBe(0);
  expect(run.output).toContain(`Could not reach the data server at ${url}`);
  expect(run.output).toContain('point appData at Fuseki directly');
});

test('a refused token stops the boot with the token message', async () => {
  const server = await dataServer(401);
  try {
    const url = stubUrl(server);
    const run = start(url);
    const code = await exited(run.child);
    expect(code, run.output).not.toBe(0);
    expect(run.output).toContain(`The data server at ${url} refused this app's token`);
    expect(run.output).toContain('DATA_SERVER_TOKEN in .env');
  } finally {
    server.close();
  }
});

test('an answering data server: the app boots and serves /', async () => {
  const server = await dataServer(200);
  const url = stubUrl(server);
  const run = start(url);
  try {
    const deadline = Date.now() + 150_000;
    let status = 0;
    while (Date.now() < deadline && run.child.exitCode === null) {
      status = await fetch(`${origin}/`).then((r) => r.status, () => 0);
      if (status === 200) break;
      await new Promise((done) => setTimeout(done, 1000));
    }
    expect(status, run.output).toBe(200);
    expect(run.output).toContain(`[storage] appData: RemoteDataset at ${url}`);
  } finally {
    stop(run.child);
    await exited(run.child);
    server.close();
  }
});

test('an empty DATA_SERVER_URL says no data server is set', async () => {
  const run = start('');
  const code = await exited(run.child);
  expect(code, run.output).not.toBe(0);
  expect(run.output).toContain('No data server is set: DATA_SERVER_URL is empty in .env');
});
