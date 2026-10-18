// Bootstrap the local (gitignored) `.env` from the committed `.env.example`.
// Wired to the `postinstall` / `prestart` / `prebuild` npm hooks so `.env`
// exists straight after `npm install` and a fresh clone boots with no manual
// copy step.
//
// Copied only when `.env` is missing (no-op otherwise — e.g. the CLI already
// wrote it on create, or the developer has customised it). In production the
// host replaces it or injects real env instead. CommonJS (.cjs) so it runs
// regardless of the package's "type": "module".
const fs = require('fs');

const pairs = [['.env.example', '.env']];

for (const [example, target] of pairs) {
  if (!fs.existsSync(target) && fs.existsSync(example)) {
    fs.copyFileSync(example, target);
    console.log(`Created ${target} from ${example}.`);
  }
}
