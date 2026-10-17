import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function build(vercelEnv, preview) {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    env: { ...process.env, VERCEL_ENV: vercelEnv, VITE_PREMIUM_DEV_PREVIEW: preview },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  function digest(dir) {
    return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? digest(path) : [[path, createHash('sha256').update(readFileSync(path)).digest('hex')]];
    });
  }
  return digest('dist');
}

const production = build('production', 'false');
const forcedPreview = build('production', 'true');
assert.deepEqual(forcedPreview, production, 'Production must ignore a mistakenly enabled preview flag');
assert.deepEqual(build('', 'true'), production, 'An unscoped production build must stay locked');
assert.deepEqual(build('development', 'true'), production, 'A development-target static build must stay locked');
const preview = build('preview', 'true');
assert.notDeepEqual(preview, production, 'Explicit preview must produce a distinct test build');
// Leave the verified production artifact in dist, rather than the unlocked preview.
assert.deepEqual(build('production', 'false'), production);
console.log('PASS: production, unscoped and development-target builds stay locked with the preview flag; explicit preview differs; dist is production.');
