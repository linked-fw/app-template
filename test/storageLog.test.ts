import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appDataLogLine } from '../src/utils/storageLog.ts';

const GATEWAY = 'http://localhost:4040/gateway';

test('FusekiStore: the Fuseki base and the dataset', () => {
  assert.equal(
    appDataLogLine({
      store: 'FusekiStore',
      endpoint: 'http://localhost:3030/acme-shop-change-1-data',
    }),
    '[storage] main: FusekiStore at http://localhost:3030 → dataset acme-shop-change-1-data',
  );
  assert.equal(
    appDataLogLine({ store: 'FusekiStore', endpoint: 'not a url' }),
    '[storage] main: FusekiStore',
  );
});

test('RemoteDataset via a gateway that names the dataset: forked or on main', () => {
  const ping = {
    ok: true,
    projectId: 'p',
    branchName: 'change-1',
    dataset: 'acme-shop-data',
    forked: false,
  };
  assert.equal(
    appDataLogLine({ store: 'RemoteDataset', url: GATEWAY, ping }),
    `[storage] main: RemoteDataset at ${GATEWAY} → dataset acme-shop-data (branch change-1, still on main's data)`,
  );
  assert.equal(
    appDataLogLine({
      store: 'RemoteDataset',
      url: GATEWAY,
      ping: { ...ping, dataset: 'acme-shop-change-1-data', forked: true },
    }),
    `[storage] main: RemoteDataset at ${GATEWAY} → dataset acme-shop-change-1-data (branch change-1, forked)`,
  );
  assert.equal(
    appDataLogLine({
      store: 'RemoteDataset',
      url: GATEWAY,
      ping: { ...ping, branchName: 'main' },
    }),
    `[storage] main: RemoteDataset at ${GATEWAY} → dataset acme-shop-data (branch main)`,
  );
  assert.equal(
    appDataLogLine({
      store: 'RemoteDataset',
      url: GATEWAY,
      ping: { ok: true, dataset: 'd' },
    }),
    `[storage] main: RemoteDataset at ${GATEWAY} → dataset d`,
  );
});

test('RemoteDataset at a server that answers the generic ping only', () => {
  assert.equal(
    appDataLogLine({
      store: 'RemoteDataset',
      url: GATEWAY,
      ping: { ok: true },
    }),
    `[storage] main: RemoteDataset at ${GATEWAY}`,
  );
});

test('any other store: its name', () => {
  assert.equal(
    appDataLogLine({ store: 'MemoryStore' }),
    '[storage] main: MemoryStore',
  );
});
