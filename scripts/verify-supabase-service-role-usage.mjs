import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const serviceRoleToken = 'SUPABASE_SERVICE_ROLE_KEY';
const codeExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const ignoredDirectories = new Set([
  '.git',
  'dist',
  'frames',
  'frames-clean',
  'node_modules',
]);

const allowedPrefixes = [
  path.join(rootDirectory, 'backend') + path.sep,
  path.join(rootDirectory, 'lib', 'supabase') + path.sep,
  path.join(rootDirectory, 'scripts') + path.sep,
];

const disallowedMatches = [];

function isAllowedPath(filePath) {
  return allowedPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function walk(directoryPath) {
  for (const entry of readdirSync(directoryPath)) {
    const absolutePath = path.join(directoryPath, entry);
    const relativePath = path.relative(rootDirectory, absolutePath);

    if (!relativePath) {
      continue;
    }

    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (ignoredDirectories.has(entry)) {
        continue;
      }

      walk(absolutePath);
      continue;
    }

    if (!codeExtensions.has(path.extname(absolutePath))) {
      continue;
    }

    const source = readFileSync(absolutePath, 'utf8');
    if (!source.includes(serviceRoleToken)) {
      continue;
    }

    if (!isAllowedPath(absolutePath)) {
      disallowedMatches.push(relativePath);
    }
  }
}

walk(rootDirectory);

if (disallowedMatches.length > 0) {
  console.error('[verify-supabase-service-role-usage] SUPABASE_SERVICE_ROLE_KEY was found in disallowed files:');
  for (const filePath of disallowedMatches) {
    console.error(` - ${filePath}`);
  }
  process.exit(1);
}

console.log('[verify-supabase-service-role-usage] ok');
