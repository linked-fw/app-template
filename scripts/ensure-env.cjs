// Bootstrap local (gitignored) config files from their committed `.example`
// counterparts. Wired to the `postinstall` / `prestart` / `prebuild` npm hooks
// so `.env` exists straight after `npm install` and a fresh clone boots with no
// manual copy step.
//
// Each pair is copied only when the target is missing (no-op otherwise — e.g.
// the CLI already wrote it on create, or the developer has customised it).
// In production the host replaces these or injects real env instead. CommonJS
// (.cjs) so it runs regardless of the package's "type": "module".
const fs = require('fs');

const pairs = [
  ['.env.example', '.env'],
  ['linked.backend.datasets.example.json', 'linked.backend.datasets.json'],
];

for (const [example, target] of pairs) {
  if (!fs.existsSync(target) && fs.existsSync(example)) {
    fs.copyFileSync(example, target);
    console.log(`Created ${target} from ${example}.`);
  }
}
