// Vite config for new linked apps. Uses the shared createViteConfig
// helper from @_linked/cli/vite-config so future Vite upgrades propagate
// to every linked app via a cli bump.
//
// Run with:
//   npm start          (Vite dev server)
//   npm run build      (production build: Vite client bundle + tsc backend)
import {createViteConfig} from '@_linked/cli/vite-config';

export default createViteConfig({
  port: 4040,
  cssMode: 'tailwind',
  // Client-only defines. LINKED_BASE_URI is the root of this app's shape IRIs
  // (src/utils/baseUri.ts); the server reads it from its own environment, so the
  // bundle has to carry the value it was built with.
  define: {
    'process.env.LINKED_BASE_URI': process.env.LINKED_BASE_URI
      ? JSON.stringify(process.env.LINKED_BASE_URI)
      : 'undefined',
  },
});
