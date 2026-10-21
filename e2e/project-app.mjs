// Builds the app the way Create Now generates a project from this template, in
// a scratch directory: a copy of the repo with an ontology and an asset package
// in packages/ (wired as npm workspace members by `linked create-package`), then
// `npm install`, which follows the committed lockfile for everything else. The
// ontology package's Turtle gains one class axiom (e2e/smoke-ontology.mjs).
//
// Those source workspaces matter: they switch `createViteConfig` from the
// standalone setup to the workspace one, which is where Vite's pre-bundler used
// to rename shape classes. The plain template never takes that path.
//
// Usage: node e2e/project-app.mjs <target-dir>
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { copyRepo, repo, setAppData } from './scratch-app.mjs';
import { addSmokeAxiom } from './smoke-ontology.mjs';

const target = process.argv[2] && resolve(process.argv[2]);
if (!target) {
  console.error('usage: node e2e/project-app.mjs <target-dir>');
  process.exit(2);
}

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

copyRepo(target);
// The project boots on Fuseki whatever the repo commits (a Create Now app
// commits a RemoteDataset on its gateway), so no data server is needed.
setAppData(target, 'fuseki');

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
// A class axiom in the ontology package's Turtle, for e2e/ontology.spec.ts.
addSmokeAxiom(target);
run('npm', ['install', '--no-audit', '--no-fund'], target);
