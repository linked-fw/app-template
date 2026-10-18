import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RemoteDatasetError,
  RemoteDatasetUnauthorizedError,
  RemoteDatasetUnreachableError,
} from '@_linked/server/shapes/quadstores/RemoteDataset';
import { dataServerMessage } from '../src/utils/storageErrors.ts';

const url = 'http://127.0.0.1:1/gateway';

test('an unreachable data server names its url and the way to direct mode', () => {
  const message = dataServerMessage(
    new RemoteDatasetUnreachableError('no answer', url, 0),
  );
  assert.ok(message);
  const lines = message.split('\n');
  assert.equal(lines[0], `Could not reach the data server at ${url}`);
  assert.equal(lines[1], '(linked.backend.datasets.json → datasets.appData).');
  assert.match(message, /"store": "@_linked\/fuseki\/shapes\/FusekiStore"/);
  assert.match(message, /"endpoint": "\$\{FUSEKI_BASE_URL\}\/\$\{FUSEKI_DATASET\}"/);
  assert.equal(
    lines.at(-1),
    "Direct mode does not fork branches or apply Create Now's access rules.",
  );
});

test('an empty url says no data server is set', () => {
  const message = dataServerMessage(
    new RemoteDatasetUnreachableError('empty url', '', 0),
  );
  assert.ok(message);
  assert.equal(
    message.split('\n')[0],
    'No data server is set: DATA_SERVER_URL is empty in .env',
  );
});

test('a refused token names the url and DATA_SERVER_TOKEN', () => {
  const message = dataServerMessage(
    new RemoteDatasetUnauthorizedError('401', url, 401, 'invalid-credential'),
  );
  assert.ok(message);
  const lines = message.split('\n');
  assert.equal(lines[0], `The data server at ${url} refused this app's token`);
  assert.match(lines[1], /DATA_SERVER_TOKEN in \.env/);
  assert.match(message, /Start this app once from Create Now/);
  assert.match(message, /"store": "@_linked\/fuseki\/shapes\/FusekiStore"/);
});

test('any other error is not a boot message', () => {
  assert.equal(dataServerMessage(new RemoteDatasetError('500', url, 500)), undefined);
  assert.equal(dataServerMessage(new Error('boom')), undefined);
  assert.equal(dataServerMessage('boom'), undefined);
  assert.equal(dataServerMessage(undefined), undefined);
});

test('an error that only shares the class name is not a boot message', () => {
  // Matching is by class; a look-alike from another module instance is rethrown.
  class RemoteDatasetUnauthorizedError extends Error {
    url = url;
    constructor() {
      super('401');
      this.name = 'RemoteDatasetUnauthorizedError';
    }
  }
  assert.equal(dataServerMessage(new RemoteDatasetUnauthorizedError()), undefined);
});
