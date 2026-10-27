/**
 * What to tell the developer when a slot (an alias of
 * `linked.backend.datasets.json`, `main` by default) is a `RemoteDataset`
 * that cannot be used at boot: nothing answers at its url, or the server refused
 * the slot's token.
 *
 * Only a `RemoteDataset` raises these errors, so an app whose slots are
 * `FusekiStore`s never shows them.
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
 * The `.env` variable holding the token of `slot`, the slot upper-cased. A slot is lowercase
 * snake_case: `main` → `DATA_SERVER_TOKEN_MAIN`, `nft_meta_data` → `DATA_SERVER_TOKEN_NFT_META_DATA`.
 */
export function tokenVariable(slot: string): string {
  return `DATA_SERVER_TOKEN_${slot.toUpperCase()}`;
}

/**
 * The boot message for `err` from the store of `slot`, or undefined when `err`
 * is not a data server error the boot reports (the caller rethrows those as
 * they are).
 */
export function dataServerMessage(err: unknown, slot = 'main'): string | undefined {
  if (err instanceof RemoteDatasetUnreachableError) {
    return [
      err.url
        ? `Could not reach the data server at ${err.url}`
        : 'No data server is set: DATA_SERVER_URL is empty in .env',
      `(linked.backend.datasets.json → datasets.${slot}).`,
      `Start Create Now locally, or point datasets.${slot} at Fuseki directly:`,
      ...DIRECT_MODE,
    ].join('\n');
  }
  if (err instanceof RemoteDatasetUnauthorizedError) {
    return [
      `The data server at ${err.url} refused this app's token`,
      `(${tokenVariable(slot)} in .env, used by linked.backend.storage.ts → datasets.${slot}).`,
      'Start this app once from Create Now, which writes a fresh token into .env, or clone the',
      `branch again. To run without Create Now, point datasets.${slot} at Fuseki directly:`,
      ...DIRECT_MODE,
    ].join('\n');
  }
  return undefined;
}
