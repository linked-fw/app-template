// Raw SPARQL (`/api/select-raw`) cannot be analysed for what it touches, so the
// server refuses it unless the app registers a raw query authorizer. The only
// caller this template expects is the Create Now backend, which signs each
// request with a service token for this app:
//
//   x-cn-service-timestamp: <unix ms>
//   x-cn-service-token:     hex(HMAC-SHA256(CN_APP_SERVICE_SECRET, `${APP_ID}:${timestamp}`))
//
// Anything else is refused. Without CN_APP_SERVICE_SECRET or APP_ID every raw
// query is refused.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ServerCallError } from '@_linked/server-utils/utils/ServerCallError';
import type { RawQueryAuthorizer } from '@_linked/server-utils/utils/QueryAccess';

export const SERVICE_TOKEN_HEADER = 'x-cn-service-token';
export const SERVICE_TIMESTAMP_HEADER = 'x-cn-service-timestamp';
/** How far a token's timestamp may be from the app's clock, either way. */
export const SERVICE_TOKEN_WINDOW_MS = 5 * 60 * 1000;

export interface ServiceTokenOptions {
  /** CN_APP_SERVICE_SECRET */
  secret?: string;
  /** APP_ID: the id CN signs for this app. */
  appId?: string;
  /** For tests. */
  now?: () => number;
}

/** hex(HMAC-SHA256(secret, `${appId}:${timestamp}`)) */
export function signServiceToken(
  secret: string,
  appId: string,
  timestamp: string | number,
): string {
  return createHmac('sha256', secret)
    .update(`${appId}:${timestamp}`)
    .digest('hex');
}

function header(request: any, name: string): string | undefined {
  const value = request?.headers?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** True when the request carries a valid, current service token for `appId`. */
export function verifyServiceToken(
  request: any,
  o: ServiceTokenOptions,
): boolean {
  const { secret, appId } = o;
  if (!secret || !appId) return false;
  const token = header(request, SERVICE_TOKEN_HEADER);
  const timestamp = header(request, SERVICE_TIMESTAMP_HEADER);
  if (!token || !timestamp || !/^\d{1,16}$/.test(timestamp)) return false;
  const now = (o.now ?? Date.now)();
  if (Math.abs(now - Number(timestamp)) > SERVICE_TOKEN_WINDOW_MS) return false;
  if (!/^[0-9a-f]{64}$/i.test(token)) return false;
  const expected = Buffer.from(
    signServiceToken(secret, appId, timestamp),
    'hex',
  );
  const given = Buffer.from(token, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** A raw query authorizer that accepts only a valid CN service token for this app. */
export function createServiceTokenAuthorizer(
  o: ServiceTokenOptions = {},
): RawQueryAuthorizer {
  const options: ServiceTokenOptions = {
    secret: o.secret ?? process.env.CN_APP_SERVICE_SECRET,
    appId: o.appId ?? process.env.APP_ID,
    now: o.now,
  };
  if (!options.secret || !options.appId) {
    console.warn(
      '[app] CN_APP_SERVICE_SECRET or APP_ID is not set: raw SPARQL (/api/select-raw) is refused.',
    );
  }
  return ({ request }) => {
    if (!verifyServiceToken(request, options)) {
      throw new ServerCallError(403, 'Query not permitted');
    }
  };
}
