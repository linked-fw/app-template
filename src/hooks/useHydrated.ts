// useHydrated — false during server rendering and the first client render,
// true once React has hydrated the page. Effects never run on the server, so
// the server HTML always carries the `false` state.
//
// Use it to disable controls that only work once React is attached, e.g. a
// form's submit button: clicked before hydration, the browser would do a
// native form submit (GET /?), reload the page and lose what was typed.
import { useEffect, useState } from 'react';

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
