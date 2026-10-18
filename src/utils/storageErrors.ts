/**
 * What to tell the developer when `appData` is a `RemoteDataset` that cannot be
 * used at boot: nothing answers at its url, or the server refused the token.
 *
 * Only a `RemoteDataset` raises these errors, so an app whose `appData` is a
 * `FusekiStore` never shows them.
 */
import {
  RemoteDatasetUnauthorizedError,
  RemoteDatasetUnreachableError,
} from '@_linked/server/shapes/quadstores/RemoteDataset';

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
  if (err instanceof RemoteDatasetUnreachableError) {
    return [
      err.url
        ? `Could not reach the data server at ${err.url}`
        : 'No data server is set: DATA_SERVER_URL is empty in .env',
      '(linked.backend.datasets.json → datasets.appData).',
      'Start Create Now locally, or point appData at Fuseki directly:',
      ...DIRECT_MODE,
    ].join('\n');
  }
  if (err instanceof RemoteDatasetUnauthorizedError) {
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
