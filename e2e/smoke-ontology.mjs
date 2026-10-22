// The ontology data of the `project` layout's ontology package (e2e/project-app.mjs):
// `linked create-package smoke --kind both --base-uri https://smoke.example/`
// scaffolds packages/smoke-ont with its data in Turtle (src/data/<name>.ttl),
// which declares only the ontology itself. The e2e adds one class axiom to it,
// Widget rdfs:subClassOf Item, so e2e/ontology.spec.ts can check that the app
// writes the package's hierarchy into its dataset at boot and that the store
// infers from it.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The smoke ontology's namespace: `<base uri>ont/<name>/`. */
export const smokeNs = 'https://smoke.example/ont/smoke/';
export const smokeItem = `${smokeNs}Item`;
export const smokeWidget = `${smokeNs}Widget`;

/** Adds `Widget rdfs:subClassOf Item` to the smoke ontology package's Turtle in <dir>. */
export function addSmokeAxiom(dir) {
  const dataDir = join(dir, 'packages', 'smoke-ont', 'src', 'data');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.ttl'));
  if (files.length !== 1) {
    throw new Error(
      `expected one Turtle file in ${dataDir}, found ${files.length ? files.join(', ') : 'none'}`,
    );
  }
  const file = join(dataDir, files[0]);
  const turtle = readFileSync(file, 'utf8');
  if (!turtle.includes(`<${smokeNs}> a owl:Ontology`)) {
    throw new Error(`${file} does not declare the ontology <${smokeNs}>`);
  }
  writeFileSync(
    file,
    turtle.replace(/\n*$/, '\n') +
      `\n<${smokeItem}> a rdfs:Class .\n` +
      `\n<${smokeWidget}> a rdfs:Class ;\n` +
      `  rdfs:subClassOf <${smokeItem}> .\n`,
  );
  console.log(`[project-app] ${file}: Widget rdfs:subClassOf Item`);
}
