# ${name}

A standalone [Linked](https://linked.cm) app generated with `@_linked/cli`. Requires **Node ≥ 20.6**.

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

The home page in this app demonstrates the full chain end-to-end with `@_linked/schema`'s shipped `Person` shape.

- **[@_linked/core](https://github.com/linked-cm/core)** — query DSL, Shape classes, storage routing.
- **[@_linked/react](https://github.com/Semantu/linked-react)** — `linkedComponent`, `linkedSetComponent`.

## Install + run

This app installs with **npm** (`packageManager: npm@11.19.1`):

```bash
npm install
npm start
```

The home page demonstrates the `@_linked` query DSL with a small Person CRUD — see `src/components/PersonOverview.tsx` and `src/components/PersonPreview.tsx`.

> No lockfile is committed: the template tracks the published `@_linked/*` packages by caret range, and `npm install` resolves and writes your app's own `package-lock.json` on first install. Commit that lockfile in your app.

## Storage

This app talks to an Apache Jena Fuseki SPARQL endpoint. Start a local Fuseki container:

```bash
docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
```

The app auto-creates its dataset on first boot.

**Storage config lives in three files**, per the spec in [`@_linked/cli` docs](https://www.npmjs.com/package/@_linked/cli):

| File | Purpose |
|---|---|
| `linked.backend.datasets.json` | Backend Layer 2 — alias → store class + config. Gitignored. Copy of `linked.backend.datasets.example.json`. |
| `linked.backend.storage.ts` | Backend Layer 1 — shape → alias routing. Parses the JSON, instantiates stores via `loadStores`, calls `LinkedStorage.setDefaultDataset(...)` / `setDatasetForShapes(...)`. |
| `src/linked.frontend.{storage.ts,datasets.json}` | Frontend mirror — same JSON shape, public values only; storage TS imports store classes explicitly and constructs one per alias. |

Defaults shipped:

- `FUSEKI_BASE_URL` — `http://localhost:3030`
- `FUSEKI_DATASET`  — `${hyphen_name}-main`
- `FUSEKI_USER` / `FUSEKI_PASSWORD` — `admin` / `admin` (matches the `stain/jena-fuseki` Docker image default)
- `FUSEKI_DB_TYPE`  — `tdb2` (persistent). Set to `mem` for in-memory.

All of these are referenced as `${VAR:-default}` placeholders in `linked.backend.datasets.json`, so you can either edit the JSON directly or set env vars.

## Raw SPARQL and Create Now

The server refuses raw SPARQL (`POST /api/select-raw`) unless an app registers a
raw query authorizer, because a raw query cannot be checked for what it reads.
This template registers one (`src/backend/serviceTokenAuthorizer.ts`) that
accepts only requests signed by Create Now for this app and this query:

| Header | Value |
|---|---|
| `x-cn-service-timestamp` | unix time in ms; refused when more than 5 minutes from the app's clock |
| `x-cn-service-token` | hex `HMAC-SHA256(CN_APP_SERVICE_SECRET, "<APP_ID>:<timestamp>:<sha256hex(query)>")` |

| Env var | Meaning |
|---|---|
| `APP_ID` | the id Create Now signs for this app |

`query` is the exact SPARQL text the app receives in the request body's
`query` field, so a token only authorizes the query it was signed for.
| `CN_APP_SERVICE_SECRET` | the secret shared with Create Now |

Create Now sets both when it hosts the app. With either unset, every raw query
is refused. Replace or extend the authorizer if your app has other raw-query
callers.

Run the tests with `npm test` (Node 22.6 or later).

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

## Learn more

- [@_linked/core](https://www.npmjs.com/package/@_linked/core) — query DSL, Shape classes, storage routing. See `parseDatasetsConfig` + `loadStores` for the dataset-config helpers.
- [@_linked/react](https://www.npmjs.com/package/@_linked/react) — `linkedComponent`, `linkedSetComponent`.
- [@_linked/schema](https://www.npmjs.com/package/@_linked/schema) — shipped Shape classes (Person, Place, Organization, …).
- [@_linked/css](https://www.npmjs.com/package/@_linked/css) — design tokens, Tailwind v4 theme primitives, `@utility` mixins. See `src/theme.css` for the wiring.
