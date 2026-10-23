// The app's ontology data reaches its store, and the store infers from it.
//
// The `project` layout's ontology package declares `Widget rdfs:subClassOf Item`
// in its Turtle (e2e/smoke-ontology.mjs). At boot, before it listens, the app
// writes every registered package's ontology into that package's own named
// graph and records the graph in the registry graph (the ontology sync). The
// Fuseki image's datasets infer RDFS classes from the hierarchy in the default
// graph and in every graph the registry marks as feeding it;
// `/<dataset>/stored` reads only what was written. No browser.
import { expect, test } from '@playwright/test';
import { smokeItem, smokeWidget } from './smoke-ontology.mjs';

const base = (process.env.FUSEKI_BASE_URL || 'http://localhost:3030').replace(
  /\/$/,
  '',
);
const authorization = `Basic ${Buffer.from(
  `${process.env.FUSEKI_USER || 'admin'}:${process.env.FUSEKI_PASSWORD || 'admin'}`,
).toString('base64')}`;
// The `project` web server's dataset (playwright.config.ts).
const dataset = `${process.env.E2E_DATASET}-project`;
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const CORE = 'https://linked.cm/ont/core/';
const SD = 'http://www.w3.org/ns/sparql-service-description#';
const registry = 'https://linked.cm/pkg/core/graph/registry';
const widget = 'urn:app-template-e2e:widget';

async function ask(endpoint: string, query: string): Promise<boolean> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/sparql-query',
      Accept: 'application/sparql-results+json',
    },
    body: query,
  });
  expect(res.ok, `${endpoint}: ${res.status} ${await res.clone().text()}`).toBe(
    true,
  );
  return (await res.json()).boolean;
}

test('the ontology sync writes the package hierarchy, and the store infers from it', async () => {
  const live = `${base}/${dataset}`;
  const stored = `${live}/stored`;

  // Written by the app at boot, from the ontology package's Turtle, into a
  // package graph the registry records as feeding the hierarchy.
  expect(
    await ask(
      stored,
      `ASK {
        GRAPH ?g { <${smokeWidget}> <${RDFS}subClassOf> <${smokeItem}> }
        GRAPH <${registry}> { ?r <${SD}name> ?g ; <${CORE}feedsHierarchy> true }
      }`,
    ),
  ).toBe(true);

  const update = await fetch(`${live}/update`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/sparql-update',
    },
    body: `INSERT DATA { <${widget}> a <${smokeWidget}> }`,
  });
  expect(update.ok, `${update.status} ${await update.text()}`).toBe(true);

  // The dataset answers the inferred type; `/stored` holds only what was written.
  const isItem = `ASK { <${widget}> a <${smokeItem}> }`;
  expect(await ask(live, isItem)).toBe(true);
  expect(await ask(stored, isItem)).toBe(false);
});
