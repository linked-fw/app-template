// Backend file storage (binary assets), apart from the dataset routing in
// linked.backend.storage.ts, which imports this file.
//
// `linked build-app` and `linked publish-app` load only this file to find
// where a release is published (`LinkedFileStorage.getStore(appAssets)`, which
// falls back to the default store), so a build never builds the dataset stores
// or pings a data server. Keep it free of dataset code. A dedicated bundle
// store: `LinkedFileStorage.setStore(FileStorePurposes.appAssets, store)`.
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';

const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
