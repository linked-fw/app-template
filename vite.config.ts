// Vite config for new linked apps. Uses the shared createViteConfig
// helper from @_linked/cli/vite-config so future Vite upgrades propagate
// to every linked app via a cli bump.
//
// Run with:
//   yarn start          (Vite dev — plan-010 default once stable)
//   yarn start:webpack  (legacy webpack path — migration escape hatch)
import {createViteConfig} from '@_linked/cli/vite-config';
import {defineConfig, mergeConfig} from 'vite';
import {fileURLToPath} from 'node:url';

// ── OD-8 interim: EDITOR-PREVIEW build (plan-014 WP4 Phase 4) ──────────────
// When CN spawns this branch app for the builder canvas with CN_EDITOR_PREVIEW=1
// (inherited via the provisioner's env), the app runs as an EDITOR build:
//  - @_linked/react → the local checkout's BUILT lib (has the element-interceptor
//    seam; the published npm package does not carry it yet — that release rides
//    OD-8/npm publishing).
//  - @create-now/editor → local SOURCE (proprietary runtime: stamping interceptor
//    + in-iframe bridge auto-start).
//  - __LINKED_EDITOR_BUILD__=true → stamping on; index.tsx dynamic-imports the
//    editor at boot (see src/index.tsx).
// DEFAULT (flag unset): completely stock app — no editor code in the graph.
// NOTE: sandbox-local demonstrator of the interim; the durable template change is
// framework-owner territory (016 plan, Phase 4 stamping dependency).
const EDITOR_PREVIEW = process.env.CN_EDITOR_PREVIEW === '1';
const home = process.env.HOME ?? '';
const localReactLib = `${home}/GitHub/semantu/linked-cm/react/lib/esm`;
const linkedCmReactRoot = `${home}/GitHub/semantu/linked-cm/react`;
const editorRoot = `${home}/GitHub/semantu/create-now-editor`;
const appRoot = fileURLToPath(new URL('.', import.meta.url));

const editorPreviewConfig = EDITOR_PREVIEW
  ? {
      resolve: {
        alias: [
          {find: /^@_linked\/react$/, replacement: `${localReactLib}/index.js`},
          {find: /^@_linked\/react\/(.*)$/, replacement: `${localReactLib}/$1`},
          {find: /^@create-now\/editor$/, replacement: `${editorRoot}/src/index.ts`},
        ],
        // one copy of each shared singleton (the local react checkout's
        // node_modules must never win over this app's)
        dedupe: ['@_linked/core', 'react', 'react-dom'],
      },
      optimizeDeps: {
        include: ['@_linked/react', '@_linked/react/utils/ClassNames'],
      },
      server: {fs: {allow: [appRoot, linkedCmReactRoot, editorRoot]}},
      define: {__LINKED_EDITOR_BUILD__: 'true'},
    }
  : {};

const base = createViteConfig({
  port: 4040,
  cssMode: 'tailwind',
});

// The STOCK build must still DEFINE the flag — as false.
//
// `index.tsx` guards the editor import with
// `typeof __LINKED_EDITOR_BUILD__ !== 'undefined' && __LINKED_EDITOR_BUILD__`,
// and the comment above claims that is "compiled out of stock builds". It was
// not: leaving the identifier UNDEFINED means the `typeof` cannot fold at build
// time, so the branch stays live and Rollup must still resolve
// `import('@create-now/editor')` — a package stock apps do not (and must not)
// depend on. Every production build of every generated app therefore failed:
//
//   [vite]: Rollup failed to resolve import "@create-now/editor"
//           from "src/index.tsx"
//
// Defining it as the literal `false` makes the guard fold to `false`, the
// import becomes unreachable, and it is tree-shaken before resolution is ever
// attempted. Found running plan-045's gate 5 (does a builder-emitted app still
// work in a real production build with no editor runtime) — which is exactly
// the class of thing that gate exists to catch before anything depends on it.
const stockConfig = {define: {__LINKED_EDITOR_BUILD__: 'false'}};

export default defineConfig(async (env) => {
  const resolved = typeof base === 'function' ? await (base as any)(env) : base;
  return mergeConfig(resolved, EDITOR_PREVIEW ? editorPreviewConfig : stockConfig);
});
