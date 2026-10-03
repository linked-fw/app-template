// `linkedComponent` / `linkedSetComponent` are React-only and come from
// `@_linked/react/package`; everything else comes from core's `linkedPackage`,
// called directly because it is the one that takes the package's `baseUri`.
import { linkedPackage as coreLinkedPackage } from '@_linked/core/utils/Package';
import { linkedComponent, linkedSetComponent } from '@_linked/react/package';
import { resolveBaseUri } from './utils/baseUri';

// The root of this package's IRIs, from LINKED_BASE_URI (see utils/baseUri.ts).
// In the browser bundle this reference is replaced at build time.
const baseUri = resolveBaseUri(process.env.LINKED_BASE_URI);

function linkedPackage(name: string) {
  return coreLinkedPackage(name, baseUri ? { baseUri } : undefined);
}

export { linkedComponent, linkedSetComponent };
// `linked create-app` rewrites the id in this call to the new app's name.
export const {
  linkedShape,
  linkedUtil,
  linkedOntology,
  registerPackageExport,
  packageExports,
  packageName,
} = linkedPackage('app');
