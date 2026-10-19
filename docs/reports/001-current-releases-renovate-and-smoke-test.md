---
summary: The template's lockfile installs current @_linked releases, Renovate keeps it current, and a PR check (`Build & Test`) runs unit tests, the build and a Playwright smoke test in two layouts (template and Create Now's generated-project layout) against a real Fuseki.
---

# Current releases, Renovate and the PR check with a smoke test

## What was built

- **Dependencies.** Every `@_linked/*` minimum raised to the npm release current at the time
  and the committed `package-lock.json` refreshed, one deduped copy of `@_linked/core`.
  Later storage work raised them again; the current ranges are in `package.json`
  (`core ^2.34.0`, `server ^3.2.0`, `cli ^1.49.0`, ...).
- **`renovate.json`**: the three-line stub extending `local>linked-fw/renovate-config`
  (all `@_linked/**` in one Monday PR, weekly `lockFileMaintenance`, both automerged on a
  green check), as cli/core/server have.
- **`.github/workflows/pr.yml`**: job `Build & Test` (the check name the fleet's branch
  protection and Renovate automerge wait on): `npm ci` from the lockfile, list the installed
  `@_linked/*` versions, `npm test`, `npm run build`, install Chromium, `npm run test:e2e`
  against a `secoresearch/fuseki:6.2.0` service container (the image core's Fuseki tests
  use). The npm named in `packageManager` is installed first. It runs only in
  `linked-fw/app-template` (`if: github.repository == ...`), so generated apps inherit the
  file without spending CI. It triggers on PRs to `main` and `blank`, pushes to `blank`, and
  `workflow_dispatch` (see [003](003-blank-branch-sync.md)).
- **`e2e/` smoke test** (`npm run test:e2e`, Playwright): boots `npm start` (Vite dev server)
  on a throwaway dataset with `LINKED_DATASET_ENSURE=1`, then in Chromium lists, adds, edits
  and deletes a person and fails on any 4xx/5xx or console error. Teardown drops only the
  datasets the run created.

## Why

The lockfile pinned `cli` 1.47.0, `core` 2.28.1, `server` 2.24.8, `schema` 1.5.0. Create Now
clones a generated repo and runs `npm install`, which follows the lockfile, so every new
project missed the cli fix that keeps linked packages out of Vite's pre-bundler (it renamed
`Person` to `Person3`), schema's explicit shape names and server's dev loading of unbuilt
workspace backends. The People screen failed with 400 "Invalid query" / "Cannot resolve
shape .../schema/Person3".

The bug only reproduces when the app has source workspaces, so the smoke test runs in two
Playwright projects: `template` (the repo as it is) and `project` (a scratch copy built by
`e2e/project-app.mjs`: `linked create-package smoke --kind both --location packages`, then
`npm install` from the committed lockfile, as Create Now lays a project out). On the old
lockfile `template` passed and `project` failed with the 400; a template-only test would
have stayed green. A PR workflow was added because the repo had none, so nothing gated
Renovate's automerge. The shared `linked-fw/.github` `pr.yml` is not used: it runs
`linked build`, which refuses an app (`is a linkedApp, not a linkedPackage`).

## Files

| File | Responsibility |
|---|---|
| `.github/workflows/pr.yml` | `Build & Test`: install, unit tests, build, smoke test on Fuseki; uploads Playwright traces on failure |
| `renovate.json` | extends the shared Renovate config |
| `playwright.config.ts` | projects `template`, `project` (both `people.spec.ts`) and `data-server-boot`; global teardown |
| `e2e/people.spec.ts` | the People add/edit/delete smoke test |
| `e2e/project-app.mjs` | builds the generated-project scratch layout |
| `e2e/teardown.ts` | drops the run's datasets |
| `readme.md` | Renovate, lockfile and smoke test sections |

## Usage

```sh
npm test            # unit tests (node --test test/*.test.ts)
npm run test:e2e    # needs Fuseki at FUSEKI_BASE_URL (default http://localhost:3030); E2E_PORT to move the app port
```

## Known limits

- `main`'s branch protection requires no status check, so Renovate's automerge does not
  strictly wait for `Build & Test`; making it required is a repo-settings change.
- `npm run lint` fails on `main` (`eslint: latest` resolves to 9 with the legacy
  `.eslintrc.json`) and `npm run prettier` reports unformatted files; neither runs in CI.
- No changesets: the template is not published.

## Follow-ups

- Make `Build & Test` a required check on `main` (repo settings; not recorded elsewhere).
- Fix lint/prettier (not recorded elsewhere).
- The `linked-fw/renovate-config` README listed app-template as "Deliberately out"; that
  note is out of date (that repo).

## PRs

- https://github.com/linked-fw/app-template/pull/22
