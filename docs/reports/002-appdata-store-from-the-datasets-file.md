---
summary: The backend boots `appData` from whatever store the committed `linked.backend.datasets.json` names (FusekiStore by default, a RemoteDataset on a data server when a host such as Create Now switches it), reports an unreachable data server or a refused token with a plain message, logs one line naming the store and dataset (and whether a branch has forked), and keeps file storage in `linked.backend.files.ts` so a build needs no data server.
---

# appData from the datasets file: any store, boot errors, boot log, file storage apart

## What was built

`linked.backend.storage.ts` has no mode switch. It parses the committed
`linked.backend.datasets.json` (`parseDatasetsConfig` with `process.env`), instantiates it with
`loadStores`, and uses the `appData` alias:

1. **`init()` is awaited** when the store has one (`setDefaultDataset` would not await it). A
   `RemoteDataset` with a `url` pings its data server there. `RemoteDatasetUnreachableError`
   (or an empty `DATA_SERVER_URL`) and `RemoteDatasetUnauthorizedError` become a plain boot
   message from `dataServerMessage(err)` (`src/utils/storageErrors.ts`) and `process.exit(1)`;
   the message says where the url/token come from and shows the FusekiStore entry to switch
   back to direct mode. Any other error is rethrown. Errors are matched with `instanceof`.
2. **One boot line** from `appDataLogLine` (`src/utils/storageLog.ts`):
   ```
   [storage] appData: FusekiStore at http://localhost:3030 → dataset acme-shop-change-1-data
   [storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-data (branch change-1, still on main's data)
   [storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-change-1-data (branch change-1, forked)
   [storage] appData: RemoteDataset at https://data.example.com
   ```
   A RemoteDataset names the dataset only when its ping body (`RemoteDataset.info`, server
   3.2.0) carries `dataset` (Create Now's gateway answers `{ok, projectId, branchName,
   dataset, forked}`); a generic linked server answers `{ok: true}`. A FusekiStore names it from
   its configured `endpoint`.
3. **Dataset ensure/check** only when the store has `ensureDatasetExists()` /
   `datasetExists()` (FusekiStore), gated by `LINKED_DATASET_ENSURE` as before
   (`src/utils/datasetEnsure.ts`).
4. `withAccess` (the People example rule) and `LinkedStorage.setDefaultDataset(appData)`.

The committed `appData` entry is `@_linked/fuseki/shapes/FusekiStore` on
`${FUSEKI_BASE_URL:-http://localhost:3030}/${FUSEKI_DATASET:-app-main}` with basic credentials
from `FUSEKI_USER`/`FUSEKI_PASSWORD`. A host points it at
`@_linked/server/shapes/quadstores/RemoteDataset` with
`{ "url": "${DATA_SERVER_URL:-}", "token": "${DATA_SERVER_TOKEN:-}" }` (the file's `_note`
documents both). `.env.example` says which mode reads which variables.

**File storage** (`LocalFileStore` as the default `LinkedFileStorage` store) lives in
`linked.backend.files.ts`, imported at the top of the storage file. `linked build-app` /
`publish-app` (cli, paired change) load only that file to resolve the `appAssets` store, so a
build of a RemoteDataset app no longer pings the data server. An older CLI still imports the
storage file, which imports the files file, so it works with any CLI.

The frontend uses `RemoteDataset` without a `url` (`src/linked.frontend.storage.ts`): the
browser talks to its own backend.

## Why

- A host-started clone must send every query through the host's data server (Create Now's
  gateway, which forks branch data and applies access rules); `npm start` by hand must keep
  working on Fuseki. A first version selected a `gateway` alias (`GatewayStore`) when
  `CN_EG_GATEWAY` was set (#24); it was replaced the next day by committing the datasets
  file and letting the host rewrite `appData` (#26), so the store choice is data, not code,
  and `GatewayStore`, `CN_EG_GATEWAY`, `CN_APP_SERVICE_SECRET` and `storageMode.ts` are gone.
- Errors were briefly matched by class and then by `name` plus a string `url` (#26), because
  under `linked start` the CLI's SSR runner and `loadStores` saw two copies of
  `RemoteDataset`. cli 1.49.0 installs the module loader core 2.34.0's `loadStores` reads, so
  there is one copy in dev and the match is `instanceof` again (#27).
- A build failed with "Could not reach the data server" before Vite ran, because finding the
  `appAssets` store imported the whole storage file (cli backlog 018) (#34).
- A developer on a branch could not see which dataset the app used, or whether the branch had
  forked its data (#35).

## Public surface

Not a published package. Requires `@_linked/server ^3.2.0` (`RemoteDataset`, its errors,
`info`), `@_linked/core ^2.34.0`, `@_linked/cli ^1.49.0` (loader; build loading
`linked.backend.files.*` alone comes with the cli release that paired with #34).

## Files

| File | Responsibility |
|---|---|
| `linked.backend.datasets.json` | committed backend datasets config; `appData` alias |
| `linked.backend.storage.ts` | loads `appData`, awaits `init()`, boot errors, boot line, dataset ensure, access rule, default dataset |
| `linked.backend.files.ts` | file stores only; loaded alone by build/publish |
| `src/utils/storageErrors.ts` | `dataServerMessage(err)`: boot messages for unreachable / refused |
| `src/utils/storageLog.ts` | `appDataLogLine(input)`: the `[storage]` line |
| `src/utils/datasetEnsure.ts` | `shouldEnsureDataset(LINKED_DATASET_ENSURE)` |
| `src/linked.frontend.storage.ts`, `src/linked.frontend.datasets.json` | frontend `RemoteDataset` to the app's own backend |
| `scripts/ensure-env.cjs` | copies `.env.example` to `.env` when missing (the datasets file is committed) |
| `.env.example` | Fuseki vs `DATA_SERVER_*` variables, which mode reads which |
| `readme.md` | storage section, files table, the boot line |

## Tests

- `test/storageErrors.test.ts`: messages for unreachable, empty url, refused token; an error
  that only shares the class name is not a boot message.
- `test/storageLog.test.ts`: the line for FusekiStore, RemoteDataset with and without a
  dataset in the ping, forked and not.
- `e2e/data-server-boot.spec.ts` (Playwright project `data-server-boot`, no browser): boots a
  scratch copy whose `appData` `e2e/remote-mode.mjs` switches to `RemoteDataset`: dead url,
  401 stub, answering stub (boots, serves `/`), empty url; the exact boot line for a FusekiStore
  boot and for stub pings with `forked` false/true and the generic ping.

## Known limits

- A clone made from an older template keeps its old datasets file; the host rewrites
  `appData` itself.
- Direct (FusekiStore) mode does not fork branches or apply Create Now's access rules; the boot
  messages say so.
- A gateway that answers end to end is tested from Create Now's side; here only the boot
  behaviour against stubs is.

## Follow-ups

None open in this repo.

## PRs

- https://github.com/linked-fw/app-template/pull/24 (gateway alias by `CN_EG_GATEWAY`, since replaced)
- https://github.com/linked-fw/app-template/pull/26
- https://github.com/linked-fw/app-template/pull/27
- https://github.com/linked-fw/app-template/pull/34
- https://github.com/linked-fw/app-template/pull/35
- https://github.com/linked-fw/app-template/pull/36
