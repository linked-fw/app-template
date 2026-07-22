import { AppContextProvider } from '@_linked/server-utils/components/AppContext';
import { initFrontend } from '@_linked/server-utils/utils/Frontend';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { preloadMatchedRoute } from './utils/preloadRoutes';

//import the storage & file configuration for the frontend
import './linked.frontend.storage';

//to avoid errors with react-refresh-webpack-plugin
window['$RefreshReg$'] = () => {};
window['$RefreshSig$'] = () => () => {};

// OD-8 interim (editor-preview build only): install the visual-builder editor
// runtime — plan-node stamping + the in-iframe select/hover bridge — BEFORE any
// linked component renders. Compiled out of stock builds (define-gated).
declare const __LINKED_EDITOR_BUILD__: boolean | undefined;
const editorReady =
  typeof __LINKED_EDITOR_BUILD__ !== 'undefined' && __LINKED_EDITOR_BUILD__
    ? import('@create-now/editor')
    : Promise.resolve();

initFrontend().then(async () => {
  await editorReady;
  // Preload matched route before hydration to avoid Suspense mismatch
  await preloadMatchedRoute();

  hydrateRoot(
    document.getElementById('root'), // Target the #root div for hydration
    <React.StrictMode>
      <BrowserRouter>
        <AppContextProvider
          assets={window['assetManifest']}
          requestLD={document.getElementById('request-ld')?.innerText}
          requestObject={JSON.parse(document.getElementById('request-json')?.innerText || '{}')}
        >
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
