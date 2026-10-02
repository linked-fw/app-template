import { test } from 'node:test';
import { createHash, createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  createServiceTokenAuthorizer,
  signServiceToken,
  SERVICE_TOKEN_WINDOW_MS,
} from '../src/backend/serviceTokenAuthorizer.ts';

const SECRET = 'test-secret';
const APP_ID = 'https://create.now/workspace/ws/app/example';
const NOW = 1_800_000_000_000;

const QUERY = 'SELECT * WHERE { ?s ?p ?o }';

function ctx(headers: Record<string, string> = {}, query: unknown = QUERY) {
  return {
    query,
    endpoint: 'api/select-raw',
    request: { headers },
    linkedAuth: undefined,
  };
}
function signed(timestamp = NOW, appId = APP_ID, secret = SECRET) {
  return ctx({
    'x-cn-service-timestamp': String(timestamp),
    'x-cn-service-token': signServiceToken(secret, appId, timestamp, QUERY),
  });
}
const authorize = createServiceTokenAuthorizer({
  secret: SECRET,
  appId: APP_ID,
  now: () => NOW,
});
const refused = (c: any, a = authorize) =>
  assert.throws(
    () => a(c),
    (e: any) => e.status === 403,
  );

test('accepts a valid token for this app', () => {
  assert.doesNotThrow(() => authorize(signed()));
  assert.doesNotThrow(() => authorize(signed(NOW - SERVICE_TOKEN_WINDOW_MS)));
  assert.doesNotThrow(() => authorize(signed(NOW + SERVICE_TOKEN_WINDOW_MS)));
});

test('refuses a request without a token', () => {
  refused(ctx());
  refused(ctx({ 'x-cn-service-timestamp': String(NOW) }));
  refused({ ...ctx(), request: undefined });
});

test('refuses a token for another app or signed with another secret', () => {
  refused(signed(NOW, 'https://create.now/workspace/ws/app/other'));
  refused(signed(NOW, APP_ID, 'other-secret'));
});

test('refuses a timestamp outside the 5-minute window', () => {
  refused(signed(NOW - SERVICE_TOKEN_WINDOW_MS - 1));
  refused(signed(NOW + SERVICE_TOKEN_WINDOW_MS + 1));
});

test('refuses a token that does not match its timestamp', () => {
  const c = signed();
  c.request.headers['x-cn-service-timestamp'] = String(NOW + 1);
  refused(c);
});

test('refuses malformed tokens and timestamps', () => {
  const token = signServiceToken(SECRET, APP_ID, NOW, QUERY);
  refused(
    ctx({
      'x-cn-service-timestamp': String(NOW),
      'x-cn-service-token': token.slice(0, 62),
    }),
  );
  refused(
    ctx({
      'x-cn-service-timestamp': String(NOW),
      'x-cn-service-token': token + '00',
    }),
  );
  refused(
    ctx({
      'x-cn-service-timestamp': String(NOW),
      'x-cn-service-token': 'zz' + token.slice(2),
    }),
  );
  refused(
    ctx({ 'x-cn-service-timestamp': `${NOW}.0`, 'x-cn-service-token': token }),
  );
});

test('refuses everything when the secret or app id is not configured', () => {
  const quiet = console.warn;
  console.warn = () => {};
  try {
    refused(
      signed(),
      createServiceTokenAuthorizer({
        secret: '',
        appId: APP_ID,
        now: () => NOW,
      }),
    );
    refused(
      signed(),
      createServiceTokenAuthorizer({
        secret: SECRET,
        appId: '',
        now: () => NOW,
      }),
    );
  } finally {
    console.warn = quiet;
  }
});

test('signs appId:timestamp:sha256hex(query)', () => {
  const hash = createHash('sha256').update(QUERY).digest('hex');
  const expected = createHmac('sha256', SECRET)
    .update(`${APP_ID}:${NOW}:${hash}`)
    .digest('hex');
  assert.equal(signServiceToken(SECRET, APP_ID, NOW, QUERY), expected);
});

test('refuses a token replayed with another query', () => {
  const c = signed();
  refused({ ...c, query: QUERY + ' LIMIT 1' });
  refused({ ...c, query: 'DELETE WHERE { ?s ?p ?o }' });
  refused({ ...c, query: undefined });
});
