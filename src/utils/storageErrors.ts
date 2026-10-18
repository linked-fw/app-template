/**
 * What to tell the developer when `appData` is a `RemoteDataset` that cannot be
 * used at boot: nothing answers at its url, or the server refused the token.
 *
 * Only a `RemoteDataset` raises these errors, so an app whose `appData` is a
 * `FusekiStore` never shows them.
 */
import {
  RemoteDatasetError,
  RemoteDatasetUnauthorizedError,
  RemoteDatasetUnreachableError,
} from '@_linked/server/shapes/quadstores/RemoteDataset';

/**
 * Whether `err` is a `cls`. By class first; then by the class name the error
 * sets on itself (`name`), because under `linked start` (dev) the store comes
 * from a second copy of the same module: Vite bundles `@_linked/server` for
 * the SSR runner, which loads this file, while `loadStores` imports the store
 * through Node. A built app has one copy and matches by class.
 */
function isError<T extends RemoteDatasetError>(
  err: unknown,
  cls: abstract new (...args: never[]) => T,
): err is T {
  return (
    err instanceof cls ||
    (err instanceof Error &&
      err.name === cls.name &&
      typeof (err as { url?: unknown }).url === 'string')
  );
}

const DIRECT_MODE = [
  '  "store": "@_linked/fuseki/shapes/FusekiStore",',
  '  "config": { "endpoint": "${FUSEKI_BASE_URL}/${FUSEKI_DATASET}", "credentials": { "type": "basic", "username": "${FUSEKI_USER}", "password": "${FUSEKI_PASSWORD}" } }',
  "Direct mode does not fork branches or apply Create Now's access rules.",
];

/**
 * The boot message for `err`, or undefined when `err` is not a data server
 * error the boot reports (the caller rethrows those as they are).
 */
export function dataServerMessage(err: unknown): string | undefined {
  if (isError(err, RemoteDatasetUnreachableError)) {
    return [
      err.url
        ? `Could not reach the data server at ${err.url}`
        : 'No data server is set: DATA_SERVER_URL is empty in .env',
      '(linked.backend.datasets.json → datasets.appData).',
      'Start Create Now locally, or point appData at Fuseki directly:',
      ...DIRECT_MODE,
    ].join('\n');
  }
  if (isError(err, RemoteDatasetUnauthorizedError)) {
    return [
      `The data server at ${err.url} refused this app's token`,
      '(DATA_SERVER_TOKEN in .env, used by linked.backend.storage.ts → datasets.appData).',
      'Start this app once from Create Now, which writes a fresh token into .env, or clone the',
      'branch again. To run without Create Now, point appData at Fuseki directly:',
      ...DIRECT_MODE,
    ].join('\n');
  }
  return undefined;
}
