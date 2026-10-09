//import all ShapeProviders here or define a generic BackendProvider, see https://linked.cm

import { BackendProvider } from '@_linked/server-utils/utils/BackendProvider';

// Add a constructor only if you need to set something up; when you do, keep the
// base signature: `constructor(server: any, linkedServer: any)` and call
// `super(server, linkedServer)` first.
export class Backend extends BackendProvider {}
