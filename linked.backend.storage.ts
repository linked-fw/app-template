// Backend storage config.
//
// Reads linked.backend.datasets.json, dynamically imports the `appData`
// alias's store class via its npm path, and instantiates it with the entry's
// `config` verbatim. See the mirror at src/linked.frontend.storage.ts.
//
// Whatever store `appData` names is used; there is no mode switch here:
// - FusekiStore (the committed default): the app talks to Fuseki on the `.env`
//   dataset, and creates that dataset on first boot.
// - RemoteDataset with a `url` (what a host such as Create Now sets): every
//   query goes to the data server at DATA_SERVER_URL with DATA_SERVER_TOKEN,
//   and the boot stops with a message when it does not answer or refuses the
//   token (src/utils/storageErrors.ts).
// File storage (binary assets) is in its own file, so `linked build-app` can
// load it without the datasets this file builds.
import './linked.backend.files';
import datasetsConfig from './linked.backend.datasets.json' with { type: 'json' };
import { parseDatasetsConfig } from '@_linked/core/utils/parseDatasetsConfig';
import { loadStores } from '@_linked/core/utils/loadStores';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import type { IDataset } from '@_linked/core/interfaces/IDataset';
import { RemoteDataset } from '@_linked/server/shapes/quadstores/RemoteDataset';
import { shouldEnsureDataset } from './src/utils/datasetEnsure';
import { dataServerMessage } from './src/utils/storageErrors';
import { appDataLogLine } from './src/utils/storageLog';

// Resolve ${VAR} placeholders against the runtime environment.
const config = parseDatasetsConfig(datasetsConfig, process.env);
const stores = await loadStores(config);
const appData = stores.appData as IDataset & {
  ensureDatasetExists?: () => Promise<unknown>;
  datasetExists?: () => Promise<boolean>;
};

// setDefaultDataset calls init() without awaiting it, so a boot that must fail
// loudly awaits it here first (init() is memoized once it succeeds). A
// RemoteDataset with a url pings its data server here; when nothing answers or
// the token is refused, the boot stops with the message, not a stack trace.
if (appData.init) {
  try {
    await appData.init();
  } catch (err) {
    const message = dataServerMessage(err);
    if (!message) throw err;
    console.error(message);
    process.exit(1);
  }
}
// One line: the store, where it is, and the dataset it reads and writes. A
// RemoteDataset names the dataset when its data server's ping says which one
// (Create Now's gateway does, and whether the branch has forked its own); a
// FusekiStore names it from its endpoint. See src/utils/storageLog.ts.
const remote = appData instanceof RemoteDataset ? appData : undefined;
console.log(
  appDataLogLine({
    store: appData.constructor.name,
    url: remote?.url,
    ping: remote?.info,
    endpoint: config.datasets.appData?.config?.endpoint,
  }),
);

// A store that manages its own dataset (FusekiStore) gets it created on first
// boot, unless the host provisions it (LINKED_DATASET_ENSURE=0, see
// src/utils/datasetEnsure.ts). Then only check, and say so loudly when it is
// missing rather than create an empty one.
//
// The ensure is awaited: the server writes its shape descriptions to this
// store right after loading this file, and a write to a dataset that does
// not exist yet fails (FusekiStore throws FusekiQueryError: 405).
if (shouldEnsureDataset(process.env.LINKED_DATASET_ENSURE)) {
  if (appData.ensureDatasetExists) {
    try {
      await appData.ensureDatasetExists();
    } catch (err) {
      console.warn('dataset ensure failed:', err);
    }
  }
} else if (appData.datasetExists) {
  appData
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

// Who may query this store from the client: the server's default rule, a
// signed-in session for every write (and for every read once rpcExposure is
// 'enforce'). Attach your own rules with `withAccess` from
// '@_linked/server-utils/utils/QueryAccess'.

// Shape → alias. Single alias → default for every shape. For multi-alias
// add per-shape pins, e.g.:
//   LinkedStorage.setDatasetForShapes(stores.appData, [MyShape]);
LinkedStorage.setDefaultDataset(appData);
