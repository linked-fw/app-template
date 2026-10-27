// Scratch copies of this repo for the e2e run, each with the `main` store it
// tests written into its linked.backend.datasets.json. The suite never relies
// on the store the repo commits: a template clone commits a FusekiStore, but an
// app Create Now generates commits a RemoteDataset on its gateway, and the e2e
// must pass in both without a data server running.
//
// As a command (the `template` web server in playwright.config.ts):
//   node e2e/scratch-app.mjs <dir> <fuseki|remote>
// copies the repo to <dir>, links its node_modules and sets `main`.
import {
  cpSync,
  existsSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Top-level entries that are local state, not part of the repo. `.env` too: a
// host writes its own there (Create Now's names its gateway), and the e2e sets
// every variable it needs in the environment; `npm start` copies .env.example.
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

/** The `main` entries the e2e boots with. */
export const appDataEntries = {
  // The template's committed default: Fuseki at FUSEKI_BASE_URL/FUSEKI_DATASET.
  fuseki: {
    store: '@_linked/fuseki/shapes/FusekiStore',
    config: {
      endpoint:
        '${FUSEKI_BASE_URL:-http://localhost:3030}/${FUSEKI_DATASET:-app-main}',
      credentials: {
        type: 'basic',
        username: '${FUSEKI_USER:-admin}',
        password: '${FUSEKI_PASSWORD:-admin}',
      },
    },
  },
  // What a host such as Create Now writes: a data server at DATA_SERVER_URL.
  remote: {
    store: '@_linked/server/shapes/quadstores/RemoteDataset',
    config: { url: '${DATA_SERVER_URL:-}', token: '${DATA_SERVER_TOKEN_MAIN:-}' },
  },
};

/** Replaces <dir> with a copy of the repo; `linkNodeModules` links the repo's install into it. */
export function copyRepo(dir, { linkNodeModules = false } = {}) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  cpSync(repo, dir, {
    recursive: true,
    filter: (src) => {
      const rel = relative(repo, src);
      return rel === '' || !skip.has(rel.split(sep)[0]);
    },
  });
  if (linkNodeModules)
    symlinkSync(join(repo, 'node_modules'), join(dir, 'node_modules'), 'dir');
}

/** Sets `main` in <dir>/linked.backend.datasets.json; every other key is kept. */
export function setAppData(dir, mode) {
  const entry = appDataEntries[mode];
  if (!entry)
    throw new Error(`unknown mode "${mode}" (fuseki or remote)`);
  const file = join(dir, 'linked.backend.datasets.json');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  config.datasets = { ...config.datasets, main: entry };
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  console.log(
    `[scratch-app] ${file}: main is a ${entry.store.split('/').pop()}`,
  );
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [dir, mode] = process.argv.slice(2);
  if (!dir || !appDataEntries[mode]) {
    console.error('usage: node e2e/scratch-app.mjs <dir> <fuseki|remote>');
    process.exit(2);
  }
  copyRepo(resolve(dir), { linkNodeModules: true });
  setAppData(resolve(dir), mode);
}
