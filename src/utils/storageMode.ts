/**
 * Which `linked.backend.datasets.json` alias this process stores its data in.
 *
 * Two modes, chosen by the presence of `CN_EG_GATEWAY` in the environment:
 *
 * - **gateway** — a host (Create Now) started this app and injected
 *   `CN_EG_GATEWAY` and `CN_APP_SERVICE_SECRET` into its environment. Every
 *   query goes to the host's gateway, which picks the dataset from the
 *   credential; the app never talks to Fuseki itself.
 * - **direct** — `npm start` by hand. The app talks to Fuseki on the `.env`
 *   dataset (`FUSEKI_DATASET`).
 *
 * The choice is explicit and final: when the alias the mode needs is missing
 * from the config the boot fails, it never falls back to the other alias. A
 * host-started app that quietly used the local Fuseki would write to the wrong
 * dataset and nobody would notice.
 */
export const GATEWAY_ALIAS = 'gateway';
export const DIRECT_ALIAS = 'appData';

export type StorageAlias = typeof GATEWAY_ALIAS | typeof DIRECT_ALIAS;

/** The variable a host sets to put the app in gateway mode. */
export const GATEWAY_ENV = 'CN_EG_GATEWAY';

/** True when a host started this process (gateway mode). */
export function isStartedByHost(
  env: Record<string, string | undefined>,
): boolean {
  return !!env[GATEWAY_ENV]?.trim();
}

/**
 * Selects the alias for the mode `env` puts the app in and checks the parsed
 * datasets config has an entry for it.
 *
 * @throws when the entry for the selected mode is missing from `config`.
 */
export function selectStorageAlias(
  env: Record<string, string | undefined>,
  config: { datasets: Record<string, unknown> },
): StorageAlias {
  const alias: StorageAlias = isStartedByHost(env)
    ? GATEWAY_ALIAS
    : DIRECT_ALIAS;
  if (!config.datasets[alias]) {
    const mode = isStartedByHost(env)
      ? `${GATEWAY_ENV} is set, so this app was started by a host and must store its data through the host's gateway`
      : `${GATEWAY_ENV} is not set, so this app stores its data in Fuseki directly`;
    throw new Error(
      `[storage] ${mode}, but linked.backend.datasets.json has no "${alias}" entry ` +
        `(found: ${
          Object.keys(config.datasets)
            .map((k) => `"${k}"`)
            .join(', ') || 'none'
        }). ` +
        'Add it from linked.backend.datasets.example.json; the app never falls back to another alias.',
    );
  }
  return alias;
}
