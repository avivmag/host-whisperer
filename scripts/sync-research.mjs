import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const root = resolve('.research-cache');
const index = JSON.parse(await readFile(new URL('../docs/research/sources.json', import.meta.url), 'utf8'));
const execFile = promisify(execFileCallback);
await mkdir(root, { recursive: true });
const report = [];

for (const source of index.sources) {
  const target = resolve(root, source.cachePath);
  await mkdir(dirname(target), { recursive: true });
  try {
    if (source.kind === 'git') {
      try {
        await access(resolve(target, '.git'));
        report.push({ id: source.id, status: 'cached', note: 'existing shallow clone retained', fetchedAt: new Date().toISOString() });
      } catch {
        await execFile('git', ['clone', '--depth', '1', '--filter=blob:none', source.url, target]);
        report.push({ id: source.id, status: 'cached', note: 'shallow clone', fetchedAt: new Date().toISOString() });
      }
      continue;
    }
    const response = await fetch(source.url, { headers: { 'user-agent': 'HostWhispererResearch/0.1' }, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    await writeFile(target, body);
    report.push({ id: source.id, status: 'cached', bytes: Buffer.byteLength(body), fetchedAt: new Date().toISOString() });
  } catch (error) {
    report.push({ id: source.id, status: 'failed', error: error instanceof Error ? error.message : String(error), fetchedAt: new Date().toISOString() });
  }
}

await writeFile(resolve(root, 'sync-report.json'), JSON.stringify(report, null, 2));
console.log(`Research sync complete: ${report.filter((item) => item.status === 'cached').length}/${report.length} sources cached in ${root}`);
