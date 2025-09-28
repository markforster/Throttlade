#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const manifestPath = new URL('../manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const current = manifest.version;
const desired = pkg.version;

if (current !== desired) {
  manifest.version = desired;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[sync-version] Updated manifest.json version ${current} -> ${desired}`);
} else {
  console.log(`[sync-version] manifest.json already at ${desired}`);
}

