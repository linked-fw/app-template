import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECT_ALIAS,
  GATEWAY_ALIAS,
  isStartedByHost,
  selectStorageAlias,
} from '../src/utils/storageMode.ts';

const both = { datasets: { appData: {}, gateway: {} } };
const directOnly = { datasets: { appData: {} } };
const gatewayOnly = { datasets: { gateway: {} } };

test('no CN_EG_GATEWAY means direct mode: npm start by hand uses appData', () => {
  for (const env of [
    {},
    { CN_EG_GATEWAY: '' },
    { CN_EG_GATEWAY: '  ' },
    { FUSEKI_DATASET: 'x' },
  ]) {
    assert.equal(isStartedByHost(env), false, JSON.stringify(env));
    assert.equal(
      selectStorageAlias(env, both),
      DIRECT_ALIAS,
      JSON.stringify(env),
    );
  }
});

test('CN_EG_GATEWAY set means a host started the app: gateway alias', () => {
  const env = {
    CN_EG_GATEWAY: 'http://localhost:4040/gateway',
    CN_APP_SERVICE_SECRET: 's',
  };
  assert.equal(isStartedByHost(env), true);
  assert.equal(selectStorageAlias(env, both), GATEWAY_ALIAS);
});

test('the mode never falls back to the other alias', () => {
  assert.throws(
    () =>
      selectStorageAlias(
        { CN_EG_GATEWAY: 'http://localhost:4040/gateway' },
        directOnly,
      ),
    /no "gateway" entry.*found: "appData".*never falls back/,
  );
  assert.throws(
    () => selectStorageAlias({}, gatewayOnly),
    /no "appData" entry.*found: "gateway"/,
  );
  assert.throws(() => selectStorageAlias({}, { datasets: {} }), /found: none/);
});
