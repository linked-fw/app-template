/**
 * The one line the boot logs about `appData`: which store, where, and which
 * dataset, so a developer sees which data the app reads and writes, and when a
 * branch has forked its own.
 *
 *   [storage] appData: FusekiStore at http://localhost:3030 → dataset acme-shop-data
 *   [storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-data (branch change-1, still on main's data)
 *   [storage] appData: RemoteDataset at http://localhost:4040/gateway → dataset acme-shop-change-1-data (branch change-1, forked)
 *   [storage] appData: RemoteDataset at https://data.example.com
 *
 * A RemoteDataset names the dataset only when its data server's `ping` says
 * which one it serves (Create Now's gateway answers `{ok, projectId,
 * branchName, dataset, forked}`); a plain linked server answers `{ok: true}`.
 */
export interface AppDataLogInput {
  /** The store's class name, e.g. `FusekiStore` or `RemoteDataset`. */
  store: string;
  /** A RemoteDataset's data server url. */
  url?: string;
  /** A RemoteDataset's ping answer (`RemoteDataset.info`). */
  ping?: Readonly<Record<string, unknown>>;
  /** A FusekiStore's `endpoint`, `<base>/<dataset>`, as configured. */
  endpoint?: unknown;
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function appDataLogLine(input: AppDataLogInput): string {
  const head = `[storage] appData: ${input.store}`;
  const url = text(input.url);
  if (url) {
    const dataset = text(input.ping?.dataset);
    if (!dataset) return `${head} at ${url}`;
    return `${head} at ${url} → dataset ${dataset}${branchNote(input.ping ?? {})}`;
  }
  const endpoint = text(input.endpoint);
  if (input.store === 'FusekiStore' && endpoint) {
    try {
      const parsed = new URL(endpoint);
      const dataset = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const base = `${parsed.protocol}//${parsed.host}`;
      return dataset
        ? `${head} at ${base} → dataset ${dataset}`
        : `${head} at ${base}`;
    } catch {
      return head;
    }
  }
  return head;
}

/** ` (branch change-1, forked)`, ` (branch change-1, still on main's data)`, ` (branch main)`, or ''. */
function branchNote(ping: Readonly<Record<string, unknown>>): string {
  const branch = text(ping.branchName);
  if (!branch) return '';
  if (ping.forked === true) return ` (branch ${branch}, forked)`;
  if (ping.forked === false && branch !== 'main')
    return ` (branch ${branch}, still on main's data)`;
  return ` (branch ${branch})`;
}
