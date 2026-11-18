import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
for (const name of ['dist', 'build', 'server.js']) {
  const target = path.resolve(workspace, name);
  if (path.dirname(target) !== workspace) throw new Error('Build cleanup target is outside this workspace.');
  rmSync(target, { recursive: name !== 'server.js', force: true });
}
