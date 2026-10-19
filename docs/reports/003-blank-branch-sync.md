---
summary: The `blank` branch (the template without the People example, which Create Now creates projects from) is kept in step with `main` by `sync-blank.yml`, a merge (never a force push) on every push to main, pushed with the release app's token so the PR check runs on `blank`; conflicts fail the job and are resolved by hand.
---

# The blank branch and its sync with main

## What was built

- **Branch `blank`**: `main` without the People example (Person usage, components, the
  Components and Sign In pages, the example access rule and their tests); the home page
  renders `APP_NAME` and `e2e/home.spec.ts` checks it in both Playwright layouts. Everything
  else (storage, scripts, build config, Renovate, the PR check, these docs) comes from `main`.
- **`.github/workflows/sync-blank.yml`** (job `Merge main into blank`): on every push to `main`
  (and `workflow_dispatch`), checks out `blank`, exits 0 when `blank` already contains main,
  else `git merge --no-ff` with message `Merge main (<sha7>) into blank` by the Actions bot
  identity and pushes. On a conflict it writes the conflicted files and the manual steps to the
  job summary, adds one `::error file=...` annotation per file, aborts and pushes nothing.
  Runs only in `linked-fw/app-template`; `concurrency: sync-blank`, not cancelled.
- **`pr.yml`** also runs on PRs to `blank`, pushes to `blank` (the sync's merges) and
  `workflow_dispatch`.
- `readme.md` section "The blank variant": cloning it
  (`git clone --branch blank --single-branch ...`), how the sync works, resolving a conflict.

## Why

Create Now creates projects from a template without example code, and keeping a second copy by
hand drifts. A merge keeps `blank`'s deletions and edits and never rewrites its history. The
push uses the linked-fw release app (`RELEASE_APP_ID` / `RELEASE_APP_PRIVATE_KEY`, as
`linked-fw/.github`'s `publish.yml` does) rather than `GITHUB_TOKEN`, because a
`GITHUB_TOKEN` push starts no workflow and the PR check would never run on `blank`.

## Usage: resolving a conflict

The expected manual case is `main` changing a file `blank` deletes (modify/delete), or
editing lines next to the ones `blank` removes (it happened with #34's import lines):

```sh
git fetch origin && git switch blank && git pull --ff-only
git merge origin/main
git rm <each file blank deletes>   # keep it deleted
git commit && git push origin blank
```

New files on `main` (such as `docs/`) merge without a conflict, so docs need no separate
copy on `blank`.

## Files

| File | Responsibility |
|---|---|
| `.github/workflows/sync-blank.yml` | merge main into blank on every push to main |
| `.github/workflows/pr.yml` | the PR check, also on `blank` |
| `readme.md` | "The blank variant" |

## Known limits

- The sync pushes with the release app, which has `workflows: write` (granted 2026-10-19), so a
  sync that brings a workflow change (e.g. a Renovate action bump) goes through like any other.
- Conflicts are manual; the sync runs of 2026-10-19 for #34 and #35 failed and were resolved by
  hand, and `blank` contains `main` since.

## Follow-ups

- None.

## PRs

- https://github.com/linked-fw/app-template/pull/25
