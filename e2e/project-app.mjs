// Builds the app the way Create Now generates a project from this template, in
// a scratch directory: a copy of the repo with an ontology and an asset package
// in packages/ (wired as npm workspace members by `linked create-package`), then
// `npm install`, which follows the committed lockfile for everything else.
//
// Those source workspaces matter: they switch `createViteConfig` from the
// standalone setup to the workspace one, which is where Vite's pre-bundler used
// to rename shape classes. The plain template never takes that path.
//
// Usage: node e2e/project-app.mjs <target-dir>
import { cpSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] && resolve(process.argv[2]);
if (!target) {
  console.error('usage: node e2e/project-app.mjs <target-dir>');
  process.exit(2);
}

// Top-level entries that are local state, not part of the repo.
const skip = new Set([
  'node_modules',
  '.git',
  'packages-local',
  '.packages-local.parked',
  'test-results',
  'playwright-report',
  'build',
  'lib',
]);

function run(cmd, args, cwd) {
  console.log(`[project-app] ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    console.error(
      `[project-app] ${cmd} exited with ${res.status ?? res.signal}`,
    );
    process.exit(1);
  }
}

if (existsSync(target)) rmSync(target, { recursive: true, force: true });
cpSync(repo, target, {
  recursive: true,
  filter: (src) => {
    const rel = relative(repo, src);
    return rel === '' || !skip.has(rel.split(sep)[0]);
  },
});

// The CLI from this repo's install: it is the version the lockfile pins, and
// the copy has no node_modules yet.
run(
  join(repo, 'node_modules', '.bin', 'linked'),
  [
    'create-package',
    'smoke',
    '--kind',
    'both',
    '--location',
    'packages',
    '--skip-install',
    '--base-uri',
    'https://smoke.example/',
  ],
  target,
);
run('npm', ['install', '--no-audit', '--no-fund'], target);
