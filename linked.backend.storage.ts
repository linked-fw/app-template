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
import { withAccess } from '@_linked/server-utils/utils/QueryAccess';
import { getSuperShapesClasses } from '@_linked/core/utils/ShapeClass';
import { Person } from '@_linked/schema/shapes/Person';
import { shouldEnsureDataset } from './src/utils/datasetEnsure';
import { allowsAnonymousExampleWrites, exampleAccess } from './src/utils/exampleAccess';

// Resolve ${VAR} placeholders against the runtime environment, then
// instantiate each store class declared in the JSON.
const config = parseDatasetsConfig(datasetsConfig, process.env);
const stores = await loadStores(config);

// Auto-create the dataset on first boot — unless the host provisions it
// (LINKED_DATASET_ENSURE=0, see src/utils/datasetEnsure.ts). Then only check,
// and say so loudly when it is missing rather than create an empty one.
//
// The ensure is awaited: the server writes its shape descriptions to this
// store right after loading this file, and a write to a dataset that does
// not exist yet fails (FusekiStore throws FusekiQueryError: 405).
const appData = stores.appData as FusekiStore;
if (shouldEnsureDataset(process.env.LINKED_DATASET_ENSURE)) {
  try {
    await appData.ensureDatasetExists();
  } catch (err) {
    console.warn('dataset ensure failed:', err);
  }
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

// Who may query this store from the client (see src/utils/exampleAccess.ts).
// Without a rule every write, and once rpcExposure is 'enforce' every read,
// needs a signed-in session, which this template has no way to create. This
// rule opens exactly the home page example: anonymous reads of Person, and
// anonymous writes of Person only under NODE_ENV=development. Everything else
// still needs a session. Remove it with the example.
const exampleShapes = new Set(
  [Person, ...getSuperShapesClasses(Person)]
    .map((shape) => shape.shape?.id)
    .filter((id): id is string => !!id),
);
withAccess(
  appData,
  exampleAccess(exampleShapes, allowsAnonymousExampleWrites(process.env.NODE_ENV)),
);

// Shape → alias. Single alias → default for every shape. For multi-alias
// add per-shape pins, e.g.:
//   LinkedStorage.setDatasetForShapes(stores.appData, [Person]);
LinkedStorage.setDefaultDataset(appData);

// File storage (binary assets). Separate from RDF dataset routing.
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
