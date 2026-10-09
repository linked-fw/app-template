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
});
