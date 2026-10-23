import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reserve = createServer();
await new Promise((resolve, reject) => { reserve.once('error', reject); reserve.listen(0, '127.0.0.1', resolve); });
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const emulatorLog = createWriteStream(path.join(root, 'output/audit/firestore-emulator-local.log'));
const emulator = spawn('C:/Java/jdk-21/bin/java.exe', [
  `-Djdk.net.unixdomain.tmpdir=${path.join(root, 'output/audit')}`,
  '-jar', path.join(root, '.firebase-emulators/cloud-firestore-emulator-v1.22.0.jar'),
  '--host', '127.0.0.1', '--port', String(port), '--project_id', 'demo-inventora',
  '--rules', path.join(root, 'firestore.rules'), '--single_project_mode', 'true',
], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
emulator.stdout.pipe(emulatorLog, { end: false });
emulator.stderr.pipe(emulatorLog, { end: false });
let spawnError;
emulator.once('error', error => { spawnError = error; });
const stopped = new Promise(resolve => emulator.once('close', resolve));
let ready = false;
try {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (spawnError) throw spawnError;
    if (emulator.exitCode !== null) throw new Error('Local emulator exited before startup.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Local emulator did not become ready within 45 seconds.');
  console.log(`Local emulator ready on 127.0.0.1:${port}; project demo-inventora.`);
  const runner = spawn(process.execPath, ['--import', 'tsx', '--test', 'tests/firestore.rules.test.ts'], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: `127.0.0.1:${port}`, FIREBASE_PROJECT_ID: 'demo-inventora', GOOGLE_APPLICATION_CREDENTIALS: '' },
  });
  const testLog = createWriteStream(path.join(root, 'output/audit/firestore-rules-local.log'));
  runner.stdout.on('data', data => { process.stdout.write(data); testLog.write(data); });
  runner.stderr.on('data', data => { process.stderr.write(data); testLog.write(data); });
  const timer = setTimeout(() => runner.kill(), 60000);
  try {
    const result = await new Promise((resolve, reject) => { runner.once('error', reject); runner.once('close', resolve); });
    process.exitCode = result === 0 ? 0 : 1;
  } finally { clearTimeout(timer); testLog.end(); }
} finally {
  if (emulator.exitCode === null) emulator.kill();
  await stopped;
  emulatorLog.end();
  console.log('Owned local emulator stopped.');
}
