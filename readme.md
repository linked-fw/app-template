# Linked App

A standalone [Linked](https://linked.cm) app generated with `@_linked/cli`. This is the **blank** variant: no example shapes or screens, one home page that renders the app's name (`APP_NAME`). Requires **Node 22.22.2+ or 24.15+** (the range npm 12 supports).

## What is Linked

Linked is a TypeScript framework for building apps on top of a graph database (RDF / SPARQL). You write your domain as **shape classes**, query them with a **typed DSL**, and render with **linked React components** that subscribe to the query results.

```ts
// 1. A shape — domain class + SHACL metadata, generated from TypeScript decorators
@linkedShape
export class Person extends Shape {
  static targetClass = schema.Person;

  @literalProperty({ path: schema.givenName })  givenName: string;
  @literalProperty({ path: schema.familyName }) familyName: string;
}

// 2. A query — TypeScript-embedded, type-inferred, executed against any IDataset
const people = await Person.select((p) => [p.givenName, p.familyName]);

// 3. A linked component — re-renders when its query result changes
const PersonCard = linkedComponent(
  Person.select((p) => [p.givenName, p.familyName]),
  ({ givenName, familyName }) => <span>{givenName} {familyName}</span>,
);
```

The `main` branch of [linked-fw/app-template](https://github.com/linked-fw/app-template) demonstrates the full chain end-to-end with `@_linked/schema`'s shipped `Person` shape.

- **[@_linked/core](https://github.com/linked-fw/core)** — query DSL, Shape classes, storage routing.
- **[@_linked/react](https://github.com/linked-fw/react)** — `linkedComponent`, `linkedSetComponent`.

## Install + run

This app installs with **npm** (`packageManager: npm@12.2.0`):

```bash
npm install
npm start
```

The home page (`src/pages/Home.tsx`) renders `APP_NAME` from `.env`. A host that starts the app, such as Create Now, sets it to the project's name.

The template commits its `package-lock.json`, so a fresh clone installs the exact versions the template was tested with. Renovate keeps it current: `renovate.json` extends the shared `linked-fw/renovate-config`, which moves every `@_linked/*` dependency in one weekly PR and refreshes the lockfile within its ranges (`lockFileMaintenance`), each automerged once the PR check passes. Keep committing it in your app. `npm run build` (`linked build-app`) refuses a working tree with uncommitted changes, because the release it builds is named after the commit. An untracked lockfile would make every fresh build fail that check, and the commit would not say which dependencies were built.

`allowScripts` in `package.json` keeps that install quiet. It records npm 12's install-script decisions. The four dependencies with install scripts (`esbuild`, `unrs-resolver`, `fsevents`, `@parcel/watcher`) are denied by name: each only rebuilds or re-downloads a native binary that npm already installs as a prebuilt optional dependency. If you add a dependency whose install script is needed, approve it with `npm install-scripts approve <pkg>`.

## Storage

This app talks to an Apache Jena Fuseki SPARQL endpoint. Start a local Fuseki container:

```bash
docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
```

In direct mode (see below) the app auto-creates its dataset on first boot. A host that provisions the
dataset itself sets `LINKED_DATASET_ENSURE=0` (Create Now does): the app then
only checks that the dataset exists and logs an error if it does not, so a lost
dataset is reported instead of silently re-created empty. Unset means on.

**Storage config lives in four files**, per the spec in [`@_linked/cli` docs](https://www.npmjs.com/package/@_linked/cli):

| File | Purpose |
|---|---|
| `linked.backend.datasets.json` | Backend Layer 2 — alias → store class + config. Committed; `appData` is `FusekiStore` by default. |
| `linked.backend.storage.ts` | Backend Layer 1 — shape → alias routing. Parses the JSON, instantiates stores via `loadStores`, calls `LinkedStorage.setDefaultDataset(...)` / `setDatasetForShapes(...)`. |
| `linked.backend.files.ts` | Backend file storage (binary assets): registers the file stores on `LinkedFileStorage`. The storage file imports it; `linked build-app` and `linked publish-app` load only this file to find where a release is published, so a build needs no Fuseki or data server. Keep dataset code out of it. |
| `src/linked.frontend.{storage.ts,datasets.json}` | Frontend mirror — same JSON shape, public values only; storage TS imports store classes explicitly and constructs one per alias. |

Defaults shipped:

- `FUSEKI_BASE_URL` — `http://localhost:3030`
- `FUSEKI_DATASET`  — `app-main` (in `.env.example`; set it per app)
- `FUSEKI_USER` / `FUSEKI_PASSWORD` — `admin` / `admin` (matches the `stain/jena-fuseki` Docker image default)
- `FUSEKI_DB_TYPE`  — `tdb2` (persistent). Set to `mem` for in-memory.

All of these are referenced as `${VAR:-default}` placeholders in `linked.backend.datasets.json`, so you can either edit the JSON directly or set env vars.

### Fuseki or a data server

`linked.backend.storage.ts` loads the `appData` alias of
`linked.backend.datasets.json`, whatever store it names, and routes every shape
to it. There is no mode switch in code: the store in that file decides.

| `appData` store | Data goes to | Config |
|---|---|---|
| `@_linked/fuseki/shapes/FusekiStore` (committed default) | Fuseki, on the `.env` dataset (`FUSEKI_DATASET`), created on first boot | `endpoint`, `credentials` from `FUSEKI_*` |
| `@_linked/server/shapes/quadstores/RemoteDataset` with a `url` | a data server, such as Create Now, which decides the dataset from the token | `url` from `DATA_SERVER_URL`, `token` from `DATA_SERVER_TOKEN` |

Every boot logs one line naming the store and the dataset it reads and writes
(`src/utils/storageLog.ts`), so you see where your data goes and when a branch
has forked its own:

```
[storage] appData: FusekiStore at http://localhost:3030 → dataset acme-shop-change-1-data
[storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-data (branch change-1, still on main's data)
[storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-change-1-data (branch change-1, forked)
```

A `RemoteDataset` names the dataset only when the data server's `ping` says
which one it serves (Create Now's gateway does); against a server that answers
the generic `{ok: true}`, the line is `[storage] appData: RemoteDataset at <url>`.

An app whose data lives behind a data server sets the entry to:

```json
"appData": {
  "store": "@_linked/server/shapes/quadstores/RemoteDataset",
  "config": { "url": "${DATA_SERVER_URL:-}", "token": "${DATA_SERVER_TOKEN:-}" }
}
```

and puts `DATA_SERVER_URL` / `DATA_SERVER_TOKEN` in `.env`. The boot pings the
data server first and stops (exit 1) with a message rather than carrying on
without data:

- nothing answers at the url, or `DATA_SERVER_URL` is empty: `Could not reach
  the data server at <url>` (or `No data server is set: DATA_SERVER_URL is
  empty in .env`);
- the server refuses the token: `The data server at <url> refused this app's
  token`.

Both messages show the `FusekiStore` entry to switch back to direct mode. With
a store that manages its own dataset (`FusekiStore`), the boot creates it when
absent, unless `LINKED_DATASET_ENSURE=0`.

## Shapes, ontologies and components live in packages

The app is a `linkedApp`, not a linked package: it has no `src/package.ts` and
registers no shapes, ontologies or linked components of its own. Put them in
packages inside this repo, which the app depends on through an npm workspace:

- `packages/<name>-ont` — one ontology, nothing else;
- `packages/<name>-assets` — shapes, linked components and backend providers.

Scaffold them with the CLI, from the app root:

```bash
npx linked create-ont-package <name> --location packages    # packages/<name>-ont
npx linked create-asset-package <name> --location packages  # packages/<name>-assets
npx linked create-package <name> --kind both --location packages
```

Each wires the package into the app (adding `packages/*` to `workspaces` if it
is missing). `--kind both` creates the pair, with the asset package depending on
the ontology package. `create-package` without `--kind` asks which kind on a
terminal; without a terminal it exits 1 and names the flag.

A package's shape IRIs are `<root>shape/<name>-assets/<Shape>` and its ontology
terms `<root>ont/<name>/<Term>`. By default that root is `https://linked.cm/` and
the package declares none. To give packages created in this app a different
root, pass `--base-uri <uri>` or set `LINKED_BASE_URI` (in the shell, `.env.local`
or `.env`); the package then records it as `baseUri` in its `src/package.ts`.

## Who may query the data

The client runs queries through the server's generic query endpoints (`/call/@_linked/server/*Query`). This app attaches no rule of its own, so the server's default applies: a signed-in session for every write, and for every read once `rpcExposure` is `'enforce'`. To open part of the store to anonymous callers, attach a rule to the store in `linked.backend.storage.ts` with `withAccess` (from `@_linked/server-utils/utils/QueryAccess`).

## Raw SPARQL

`POST /api/select-raw` runs raw SPARQL against the default store. A raw query
cannot be checked for what it reads, so the server's `rawQueries` setting
decides who may run one: `'session'` (the default) allows any signed-in
session, `'off'` refuses every raw query. Set it in `linked.config.js`
(`server: { rawQueries: 'off' }`) or with `LINKED_RAW_QUERIES`.

Run the tests with `npm test`.

`npm run test:e2e` is a browser smoke test of the home page (Playwright,
`e2e/`). It starts `npm start` against Fuseki at `FUSEKI_BASE_URL` (default
`http://localhost:3030`, admin/admin) on ports 4517 and 4518 (`E2E_PORT` moves
them), each on a throwaway dataset it drops afterwards, with a generated
`APP_NAME`, and checks the home page renders that name twice: in this app as it
is, and in a scratch copy laid out the way Create Now generates a project, with
an ontology and an asset package in `packages/`. Vite pre-bundles the client
differently once an app has source workspaces. Install Chromium once with
`npx playwright install chromium`. The template's PR check runs both suites.

## Build for production

Production runs the **compiled** app — `linked serve-app` — which never starts
Vite or a file watcher. `npm run build` (`linked build-app`) must have run
first: `serve-app` refuses to boot unless `lib/App.js`, `lib/routes.js`,
`lib/backend.js` and `public/bundles/.vite/manifest.json` all exist, and exits
with `Compiled app artifact is missing: … Run linked build-app before linked
serve-app.` otherwise.

```bash
npm run build        # linked build-app — compiles backend + client bundles
npm run server:prod  # linked serve-app — serves the compiled build
```

`npm start` (`linked start`) is the **development** entry: it boots Vite with
HMR and must not be used to deploy.

### Deploying with pm2

Two pm2 process files ship with the template; both run the compiled entry, so
build before (re)starting either:

```bash
npm run build
pm2 start pm2.config.js          # production  → npm run server:prod
pm2 start pm2-staging.config.js  # staging     → npm run server:staging
```

## Working on a framework package locally

The app is already set up for `linked localize`: `packages-local/*` is a workspace glob and
the install hooks keep the committed `package-lock.json` unchanged. With nothing localized
none of this does anything.

```bash
npx linked localize @_linked/react   # clone into packages-local/, link, build
npx linked localize --list           # checkouts and drift
npx linked delocalize                # park them; the app uses npm again
```

Use `npm install`, not `npm ci`, while checkouts are present. Details:
[docs/localize.md](https://github.com/linked-fw/cli/blob/main/docs/localize.md).

## The blank variant

The `blank` branch is this template without the People example: no example
shapes, components or pages, and no example access rule. Its one home page
renders the app's name (`APP_NAME`). Every piece of tooling is the same as on
`main`: storage config, scripts, build config, Renovate, the PR check and the
`packages/` layout. Create Now creates new projects from it, and you can start
an app from it directly:

```bash
git clone --branch blank --single-branch https://github.com/linked-fw/app-template.git my-app
```

`.github/workflows/sync-blank.yml` keeps it current: on every push to `main` it
merges `main` into `blank` with a merge commit and pushes it (never a force
push), which starts the PR check on `blank`. The push uses the linked-fw release
app's token; a merge that changes a file under `.github/workflows/` needs that
app to hold `workflows: write`.

When the merge conflicts, the job fails, names the conflicted files in its
summary, and pushes nothing. The expected case is `main` changing a file that
`blank` deletes (a modify/delete conflict, e.g. a fix to
`src/components/PersonOverview.tsx`). Resolve it by hand, keeping `blank`'s
removals:

```bash
git fetch origin
git switch blank && git pull --ff-only
git merge origin/main
git rm <each file blank deletes>   # modify/delete: keep it deleted
# a content conflict: keep main's change unless it brings the example back
git commit
git push origin blank              # a normal push; the PR check runs on blank
```

Changes on `main` to files `blank` keeps unchanged, or changes away from the
lines `blank` edits, merge without a conflict.

## Learn more

- [@_linked/core](https://www.npmjs.com/package/@_linked/core) — query DSL, Shape classes, storage routing. See `parseDatasetsConfig` + `loadStores` for the dataset-config helpers.
- [@_linked/react](https://www.npmjs.com/package/@_linked/react) — `linkedComponent`, `linkedSetComponent`.
- [@_linked/schema](https://www.npmjs.com/package/@_linked/schema) — shipped Shape classes (Person, Place, Organization, …).
- [@_linked/css](https://www.npmjs.com/package/@_linked/css) — design tokens, Tailwind v4 theme primitives, `@utility` mixins. See `src/theme.css` for the wiring.
