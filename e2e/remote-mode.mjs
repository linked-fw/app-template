// Points `appData` in <dir>/linked.backend.datasets.json at a data server: the
// entry a host such as Create Now writes into an app it creates. Every other
// key of the file is kept. Only for scratch copies; never run it on the repo.
//
// Usage: node e2e/remote-mode.mjs <dir>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = process.argv[2] && resolve(process.argv[2]);
if (!dir) {
  console.error('usage: node e2e/remote-mode.mjs <dir>');
  process.exit(2);
}

const file = join(dir, 'linked.backend.datasets.json');
const config = JSON.parse(readFileSync(file, 'utf8'));
config.datasets.appData = {
  store: '@_linked/server/shapes/quadstores/RemoteDataset',
  config: { url: '${DATA_SERVER_URL:-}', token: '${DATA_SERVER_TOKEN:-}' },
};
writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(`[remote-mode] ${file}: appData is a RemoteDataset`);
