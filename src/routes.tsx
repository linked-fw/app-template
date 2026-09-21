import type { RoutesConfig } from '@_linked/server/types/RouteConfig';
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from './components/Spinner';
import PageNotFound from './pages/PageNotFound';
import { lazyWithPreload } from './utils/lazyWithPreload';

// Create preloadable lazy components for direct-entry routes.
// `preloadChunks` below names the page module by its source basename
// (e.g. 'Home' -> src/pages/Home.tsx), which is how the Vite manifest is keyed.
const HomePage = lazyWithPreload(() => import('./pages/Home'));

const SigninPage = lazyWithPreload(() => import('./pages/Signin'));

// Export preloadable components for server-side preloading
export const PRELOADABLE_ROUTES = {
  home: HomePage,
  signin: SigninPage,
};


export const ROUTES: RoutesConfig = {
  home: {
    path: '/',
    component: HomePage.Component,
    label: 'Home',
    preloadChunks: ['Home'],
  },
  page1: {
    path: '/page1',
    component: lazy(() => import('./pages/Page1')),
    label: 'Components',
    preloadChunks: ['Page1'],
    // To make this route sign-in-protected, install `@_linked/auth`, wire up
    // a `<ProvideAuth>` provider in App.tsx, import RequireAuth here, and
    // set `requireAuth: true` on this route.
  },
  signin: {
    path: '/signin',
    component: SigninPage.Component,
    label: 'Sign In',
    excludeFromMenu: true,
    preloadChunks: ['Signin'],
  },
};

export default function AppRoutes() {
  return (
    <Routes>
      {Object.keys(ROUTES).map((routeName) => {
        const route = ROUTES[routeName];
        const Component = route.component;

        // define a render function that determines what to render based on the component and route.render
        const renderRoute = () =>
          // if a Component is defined, render it using JSX syntax (<Component />)
          // if not, check if a route.render function is defined and call that render function if available.
          // if neither Component nor route.render is defined, return null
          Component ? <Component /> : route.render ? route.render() : null;

        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <Suspense fallback={<Spinner />}>{renderRoute()}</Suspense>
            }
          />
        );
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}
