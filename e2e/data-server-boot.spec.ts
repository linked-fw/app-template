// An app whose `main` is a RemoteDataset (as a host such as Create Now
// writes it) boots against DATA_SERVER_URL with DATA_SERVER_TOKEN_MAIN, and stops
// with a message when the data server cannot be used. Every boot logs one
// `[storage] main: …` line naming the store and the dataset it uses.
//
// No browser. Each test boots a scratch copy of this repo (node_modules linked
// from the repo) and reads its exit code and output. Each copy has the `main`
// it tests written into its linked.backend.datasets.json (e2e/scratch-app.mjs):
// a RemoteDataset for the data server cases, a FusekiStore for the last one,
// whichever of the two the repo commits. The data server is a small node:http stub,
// so no Create Now is needed.
import { spawn, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { copyRepo, setAppData } from './scratch-app.mjs';

const port = Number(process.env.E2E_PORT || 4517) + 2;
const origin = `http://localhost:${port}`;
const scratch = join(tmpdir(), `app-template-e2e-remote-${port}`);
const fusekiScratch = join(tmpdir(), `app-template-e2e-fuseki-${port}`);

test.beforeAll(() => {
  copyRepo(scratch, { linkNodeModules: true });
  setAppData(scratch, 'remote');
  copyRepo(fusekiScratch, { linkNodeModules: true });
  setAppData(fusekiScratch, 'fuseki');
});

test.afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(fusekiScratch, { recursive: true, force: true });
});

/**
 * A data server stub: `ping` answers `pingStatus` with `pingBody` (the generic
 * `{ok: true}` by default), queries answer []/null.
 */
async function dataServer(
  pingStatus: 200 | 401,
  pingBody: Record<string, unknown> = { ok: true },
): Promise<Server> {
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
        res.end(
          JSON.stringify({
            error: 'unknown token',
            code: 'invalid-credential',
          }),
        );
      } else if (method === 'ping') {
        res.end(JSON.stringify(pingBody));
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

function start(
  dataServerUrl: string,
  extra: Record<string, string> = {},
  cwd = scratch,
) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(port),
    SITE_ROOT: origin,
    DATA_ROOT: `${origin}/data`,
    DATA_SERVER_URL: dataServerUrl,
    DATA_SERVER_TOKEN_MAIN: 'test-token',
    ...extra,
  };
  delete env.E2E_DATASET;
  const child = spawn('npm', ['start'], {
    cwd,
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
  return new Promise<number | null>((done) =>
    child.on('exit', (code) => done(code)),
  );
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

/** The `[storage] main: …` line of a boot, once it is logged (undefined if the app exits first). */
async function storageLine(run: ReturnType<typeof start>, timeoutMs = 150_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const line = run.output
      .split('\n')
      .find((l) => l.includes('[storage] main: '));
    if (line) return line.slice(line.indexOf('[storage] main: ')).trimEnd();
    if (run.child.exitCode !== null || Date.now() > deadline) return undefined;
    await new Promise((done) => setTimeout(done, 250));
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
  expect(run.output).toContain('point datasets.main at Fuseki directly');
});

test('a refused token stops the boot with the token message', async () => {
  const server = await dataServer(401);
  try {
    const url = stubUrl(server);
    const run = start(url);
    const code = await exited(run.child);
    expect(code, run.output).not.toBe(0);
    expect(run.output).toContain(
      `The data server at ${url} refused this app's token`,
    );
    expect(run.output).toContain('DATA_SERVER_TOKEN_MAIN in .env');
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
      status = await fetch(`${origin}/`).then(
        (r) => r.status,
        () => 0,
      );
      if (status === 200) break;
      await new Promise((done) => setTimeout(done, 1000));
    }
    expect(status, run.output).toBe(200);
    // The generic ping answers {ok: true}: the line names the server only.
    expect(await storageLine(run), run.output).toBe(
      `[storage] main: RemoteDataset at ${url}`,
    );
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
  expect(run.output).toContain(
    'No data server is set: DATA_SERVER_URL is empty in .env',
  );
});

test('a gateway that names the dataset: the line says which, and whether the branch forked', async () => {
  for (const [ping, expected] of [
    [
      {
        ok: true,
        projectId: 'p',
        branchName: 'change-1',
        dataset: 'acme-shop-data',
        forked: false,
      },
      "→ dataset acme-shop-data (branch change-1, still on main's data)",
    ],
    [
      {
        ok: true,
        projectId: 'p',
        branchName: 'change-1',
        dataset: 'acme-shop-change-1-data',
        forked: true,
      },
      '→ dataset acme-shop-change-1-data (branch change-1, forked)',
    ],
  ] as const) {
    const server = await dataServer(200, ping);
    const url = stubUrl(server);
    const run = start(url);
    try {
      expect(await storageLine(run), run.output).toBe(
        `[storage] main: RemoteDataset at ${url} ${expected}`,
      );
    } finally {
      stop(run.child);
      await exited(run.child);
      server.close();
    }
  }
});

test('FusekiStore: the line names the Fuseki base and the dataset', async () => {
  const base = (process.env.FUSEKI_BASE_URL || 'http://localhost:3030').replace(
    /\/+$/,
    '',
  );
  // LINKED_DATASET_ENSURE=0: this boot only logs, it creates no dataset; it is
  // stopped once the line is out.
  const run = start(
    '',
    {
      FUSEKI_BASE_URL: base,
      FUSEKI_DATASET: 'acme-shop-change-1-data',
      LINKED_DATASET_ENSURE: '0',
    },
    fusekiScratch,
  );
  try {
    expect(await storageLine(run), run.output).toBe(
      `[storage] main: FusekiStore at ${base} → dataset acme-shop-change-1-data`,
    );
  } finally {
    stop(run.child);
    await exited(run.child);
  }
});
