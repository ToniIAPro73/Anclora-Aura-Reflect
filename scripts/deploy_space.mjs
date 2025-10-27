import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const envFiles = [path.resolve(root, '.env.local'), path.resolve(root, '.env')];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
  }
}

const pythonScript = path.resolve(root, 'scripts', 'hf_space_deploy.py');

const deriveSpaceIdFromCloudUrl = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname; // e.g., ToniBalles73-Anclora.hf.space
    const firstLabel = host.split('.')[0];
    if (!firstLabel || !firstLabel.includes('-')) return null;
    const [owner, ...repoParts] = firstLabel.split('-');
    const repo = repoParts.join('-');
    if (!owner || !repo) return null;
    return `${owner}/${repo}`;
  } catch {
    return null;
  }
};

const deriveDevOrigins = () => {
  const viteConfigPath = path.resolve(root, 'vite.config.ts');
  const ports = new Set();
  if (fs.existsSync(viteConfigPath)) {
    try {
      const content = fs.readFileSync(viteConfigPath, 'utf8');
      const match = content.match(/server:\s*{[^}]*port:\s*(\d+)/m) || content.match(/port:\s*(\d+)/m);
      if (match) {
        const port = parseInt(match[1], 10);
        if (Number.isFinite(port) && port > 0) ports.add(port);
      }
    } catch {}
  }
  // Always include common Vite default
  ports.add(5173);
  const urls = new Set();
  for (const p of ports) {
    urls.add(`http://localhost:${p}`);
    urls.add(`http://127.0.0.1:${p}`);
  }
  return Array.from(urls).join(',');
};

const token = process.env.HF_TOKEN || process.env.HUGGINGFACEHUB_API_TOKEN;
let spaceId = process.env.SPACE_ID;
let origins = process.env.ORIGINS;

if (!origins || !origins.trim()) {
  origins = deriveDevOrigins();
  console.log(`Derived ORIGINS from vite.config.ts/defaults: ${origins}`);
}

if (!spaceId || !spaceId.trim()) {
  const cloudUrl = process.env.VITE_CLOUD_ENGINE_URL;
  const derived = cloudUrl ? deriveSpaceIdFromCloudUrl(cloudUrl) : null;
  if (derived) {
    spaceId = derived;
    console.log(`Derived SPACE_ID from VITE_CLOUD_ENGINE_URL: ${spaceId}`);
  }
}

const isWin = process.platform === 'win32';
const pythonExe = process.env.PYTHON || process.env.DIFFUSION_PYTHON_PATH || (isWin ? 'python' : 'python3');

const printUsage = () => {
  console.log('Usage:');
  console.log('  Ensure the following environment variables are set (either in your shell or .env/.env.local):');
  console.log('    - HF_TOKEN (required)');
  console.log('    - SPACE_ID (required) — can be derived automatically from VITE_CLOUD_ENGINE_URL');
  console.log('    - ORIGINS (optional) — auto-derived from vite.config.ts or defaults to localhost ports');
  console.log('');
  console.log('Examples:');
  console.log('  Windows (PowerShell):');
  console.log('    $env:HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"');
  console.log('    $env:SPACE_ID="ToniBalles73/Anclora"');
  console.log('    npm run deploy:space');
  console.log('');
  console.log('  Linux/macOS (bash):');
  console.log('    export HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"');
  console.log('    export SPACE_ID="ToniBalles73/Anclora"');
  console.log('    npm run deploy:space');
};

if (!token || !spaceId) {
  console.error('ERROR: Missing required environment variables.');
  console.error(`HF_TOKEN present: ${Boolean(token)}; SPACE_ID present: ${Boolean(spaceId)}`);
  if (process.env.VITE_CLOUD_ENGINE_URL) {
    console.error(`Found VITE_CLOUD_ENGINE_URL=${process.env.VITE_CLOUD_ENGINE_URL} but unable to derive SPACE_ID.`);
  }
  printUsage();
  process.exit(2);
}

const args = ['scripts/hf_space_deploy.py', '--space-id', spaceId, '--origins', origins, '--token', token];

console.log(`Running: ${pythonExe} ${args.join(' ')}`);

const child = spawn(pythonExe, args, {
  cwd: root,
  stdio: ['inherit', 'inherit', 'inherit'],
});

child.on('error', (err) => {
  console.error('Failed to start deployment:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Deployment completed.');
  } else {
    console.error(`Deployment failed with exit code ${code}.`);
  }
  process.exit(code ?? 1);
});