// Drops the throwaway datasets the smoke run created. Only names this run
// generated are dropped; a dataset passed in through E2E_DATASET is left alone.
//
// The scratch project is not removed here: global teardown runs while the dev
// servers are still up, and deleting its node_modules under a running Vite
// fails the run. e2e/project-app.mjs replaces it at the start of the next run.
export default async function teardown() {
  const name = process.env.E2E_DATASET;
  if (!name || process.env.E2E_DATASET_GENERATED !== '1') return;

  const base = (process.env.FUSEKI_BASE_URL || 'http://localhost:3030').replace(
    /\/$/,
    '',
  );
  const user = process.env.FUSEKI_USER || 'admin';
  const password = process.env.FUSEKI_PASSWORD || 'admin';
  for (const dataset of [name, `${name}-project`]) {
    const res = await fetch(
      `${base}/$/datasets/${encodeURIComponent(dataset)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
        },
      },
    );
    if (!res.ok && res.status !== 404) {
      console.warn(
        `[e2e] could not drop dataset ${dataset}: ${res.status} ${res.statusText}`,
      );
    }
  }
}
