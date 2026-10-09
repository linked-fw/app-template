import { AppContextProvider } from '@_linked/server-utils/components/AppContext';
import { initFrontend } from '@_linked/server-utils/utils/Frontend';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { preloadMatchedRoute } from './utils/preloadRoutes';

//import the storage & file configuration for the frontend
import './linked.frontend.storage';

declare global {
  interface Window {
    // Written into the page by the server: the Vite asset manifest for this build.
    assetManifest?: unknown;
  }
}

initFrontend().then(async () => {
  // Preload matched route before hydration to avoid Suspense mismatch
  await preloadMatchedRoute();

  // The server renders the app into #root; hydrate that element.
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('#root element not found: the page was not server-rendered by this app.');
  }

  hydrateRoot(
    root,
    <React.StrictMode>
      <BrowserRouter>
        <AppContextProvider
          assets={window.assetManifest}
          requestLD={document.getElementById('request-ld')?.innerText}
          requestObject={JSON.parse(document.getElementById('request-json')?.innerText || '{}')}
        >
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
