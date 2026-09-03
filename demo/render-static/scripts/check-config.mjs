import { mkdir, readFile, writeFile } from 'node:fs/promises';

if (!process.env.PUBLIC_SITE_TITLE) {
  console.error('[host-whisperer-demo] Missing required configuration: PUBLIC_SITE_TITLE');
  console.error('[host-whisperer-demo] Add the variable, then trigger a fresh deployment.');
  process.exit(1);
}

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
await mkdir(new URL('../generated/', import.meta.url), { recursive: true });
await writeFile(new URL('../generated/index.html', import.meta.url), source.replace('%PUBLIC_SITE_TITLE%', process.env.PUBLIC_SITE_TITLE));
