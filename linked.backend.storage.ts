// Backend storage config.
//
// Reads linked.backend.datasets.json, dynamically imports each alias's
// store class via its npm path, and instantiates with the entry's `config`
// verbatim. See the mirror at src/linked.frontend.storage.ts.
import datasetsConfig from './linked.backend.datasets.json' with { type: 'json' };
import { parseDatasetsConfig } from '@_linked/core/utils/parseDatasetsConfig';
import { loadStores } from '@_linked/core/utils/loadStores';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import type { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';
import { shouldEnsureDataset } from './src/utils/datasetEnsure';

// Resolve ${VAR} placeholders against the runtime environment, then
// instantiate each store class declared in the JSON.
const config = parseDatasetsConfig(datasetsConfig, process.env);
const stores = await loadStores(config);

// Auto-create the dataset on first boot — unless the host provisions it
// (LINKED_DATASET_ENSURE=0, see src/utils/datasetEnsure.ts). Then only check,
// and say so loudly when it is missing rather than create an empty one.
const appData = stores.appData as FusekiStore;
if (shouldEnsureDataset(process.env.LINKED_DATASET_ENSURE)) {
  appData.ensureDatasetExists().catch((err) =>
    console.warn('dataset ensure failed:', err),
  );
} else {
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

// Shape → alias. Single alias → default for every shape. For multi-alias
// add per-shape pins, e.g.:
//   import { Person } from '@_linked/schema/shapes/Person';
//   LinkedStorage.setDatasetForShapes(stores.appData, [Person]);
LinkedStorage.setDefaultDataset(appData);

// File storage (binary assets). Separate from RDF dataset routing.
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
