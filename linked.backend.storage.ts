// Backend storage config.
//
// Reads linked.backend.datasets.json, picks the alias for the mode this
// process runs in (see src/utils/storageMode.ts), dynamically imports that
// alias's store class via its npm path, and instantiates it with the entry's
// `config` verbatim. See the mirror at src/linked.frontend.storage.ts.
//
// Two modes, never a fallback between them:
// - gateway: CN_EG_GATEWAY is set (a host started this app and injected it,
//   with CN_APP_SERVICE_SECRET). Every query goes to the host's gateway; the
//   boot fails when the gateway does not answer.
// - direct:  `npm start` by hand. FusekiStore on the `.env` dataset.
import datasetsConfig from './linked.backend.datasets.json' with { type: 'json' };
import { parseDatasetsConfig } from '@_linked/core/utils/parseDatasetsConfig';
import { loadStores } from '@_linked/core/utils/loadStores';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import type { IDataset } from '@_linked/core/interfaces/IDataset';
import type { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import type { GatewayStore } from '@_linked/server/shapes/quadstores/GatewayStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';
import { shouldEnsureDataset } from './src/utils/datasetEnsure';
import { GATEWAY_ALIAS, selectStorageAlias } from './src/utils/storageMode';

// Resolve ${VAR} placeholders against the runtime environment. Both aliases
// resolve (their placeholders all carry a default), but only the selected one
// is instantiated: the other mode's config is empty or points nowhere.
const config = parseDatasetsConfig(datasetsConfig, process.env);
const alias = selectStorageAlias(process.env, config);
const stores = await loadStores({ datasets: { [alias]: config.datasets[alias] } });
const appData = stores[alias] as IDataset;

if (alias === GATEWAY_ALIAS) {
  // Gateway mode: check the gateway answers for this credential before the
  // server writes its shape descriptions through it. setDefaultDataset calls
  // init() without awaiting it, so a boot that must fail loudly awaits it
  // here: an unreachable gateway or a refused credential throws
  // GatewayUnreachableError and the process stops.
  const gateway = appData as GatewayStore;
  let health;
  try {
    health = await gateway.init();
  } catch (err) {
    console.error(
      `[storage] CN_EG_GATEWAY is set, so this app was started by a host and stores its data through ` +
        `${gateway.endpoint}, but the gateway did not answer. The app does not fall back to Fuseki; ` +
        'it stops here. Start the host, or unset CN_EG_GATEWAY to run on the .env dataset.',
    );
    throw err;
  }
  console.log(
    `[storage] gateway mode: ${gateway.endpoint} ` +
      `(project ${health.projectId}, branch ${health.branchName}, dataset ${health.dataset})`,
  );
} else {
  // Direct mode: auto-create the dataset on first boot — unless the host
  // provisions it (LINKED_DATASET_ENSURE=0, see src/utils/datasetEnsure.ts).
  // Then only check, and say so loudly when it is missing rather than create
  // an empty one.
  //
  // The ensure is awaited: the server writes its shape descriptions to this
  // store right after loading this file, and a write to a dataset that does
  // not exist yet fails (FusekiStore throws FusekiQueryError: 405).
  const fuseki = appData as FusekiStore;
  if (shouldEnsureDataset(process.env.LINKED_DATASET_ENSURE)) {
    try {
      await fuseki.ensureDatasetExists();
    } catch (err) {
      console.warn('dataset ensure failed:', err);
    }
  } else {
    fuseki
      .datasetExists()
      .then((exists) => {
        if (!exists) {
          console.error(
            `[storage] the app dataset "${process.env.FUSEKI_DATASET}" does not exist (or could not be listed), ` +
              'and LINKED_DATASET_ENSURE=0 leaves creating it to the host. Reads will fail until it is provisioned.',
          );
        }
      })
      .catch((err) => console.warn('dataset check failed:', err));
  }
}

// Who may query this store from the client: the server's default rule, a
// signed-in session for every write (and for every read once rpcExposure is
// 'enforce'). Attach your own rules with `withAccess` from
// '@_linked/server-utils/utils/QueryAccess'.

// Shape → alias. Single alias → default for every shape. For multi-alias
// add per-shape pins, e.g.:
//   LinkedStorage.setDatasetForShapes(stores.appData, [MyShape]);
LinkedStorage.setDefaultDataset(appData);

// File storage (binary assets). Separate from RDF dataset routing.
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
