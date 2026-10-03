/**
 * The root this app's package, shape and component IRIs are minted under, read
 * from `LINKED_BASE_URI`. A shape `Foo` in this package gets the IRI
 * `<baseUri>shape/app/Foo`.
 *
 * Unset or empty means the framework default (`https://linked.cm/`), which every
 * app built from this template shares. A host that runs many apps should give
 * each owner its own root, so one app cannot claim the shape IRIs of another.
 *
 * The browser bundle inlines the value at build time (see `vite.config.ts`) and
 * the server reads it at startup, so build and run the app with the same value:
 * a shape whose IRI differs between client and server is a different shape.
 */
export function resolveBaseUri(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/.test(trimmed)) {
    throw new Error(
      `LINKED_BASE_URI must be an absolute http(s) URI without a query or fragment, got ${JSON.stringify(value)}`,
    );
  }
  // IRIs are built by appending `shape/...` to the root, so it must end in `/`.
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}
