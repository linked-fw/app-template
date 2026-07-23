//import all ShapeProviders here or define a generic BackendProvider, see https://linked.cm

// Registers the app's shapes in the backend module graph (see the barrel's
// doc-comment — required for the boot shape-sync to see them).
import './shapes.backend';
import { BackendProvider } from '@_linked/server-utils/utils/BackendProvider';

export class Backend extends BackendProvider {
  constructor(server, linkedServer) {
    super(server, linkedServer);
  }
}
