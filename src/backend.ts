//import all ShapeProviders here or define a generic BackendProvider, see https://linked.cm

import { BackendProvider } from '@_linked/server-utils/utils/BackendProvider';
import { registerRawQueryAuthorizer } from '@_linked/server-utils/utils/QueryAccess';
import { createServiceTokenAuthorizer } from './backend/serviceTokenAuthorizer';

export class Backend extends BackendProvider {
  constructor(server, linkedServer) {
    super(server, linkedServer);
    // Raw SPARQL is accepted only from Create Now, signed for this app.
    registerRawQueryAuthorizer(createServiceTokenAuthorizer(), {
      owner: 'app:cn-service-token',
    });
  }
}
