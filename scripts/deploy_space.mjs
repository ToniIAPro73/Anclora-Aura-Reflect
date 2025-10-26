import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const pythonScript = path.resolve(root, 'scripts', 'hf_space_deploy.py');

const token = process.env.HF_TOKEN || process.env.HUGGINGFACEHUB_API_TOKEN;
const spaceId = process.env.SPACE_ID;
const origins = process.env.ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';

const isWin = process.platform === 'win32';
const pythonExe = process.env.PYTHON || process.env.DIFFUSION_PYTHON_PATH || (isWin ? 'python' : 'python3');

const printUsage = () => {
  console.log('Usage:');
  console.log('  Set the following environment variables before running this script:');
  console.log('    - HF_TOKEN (required)');
  console.log('    - SPACE_ID (required), e.g. ToniBalles73/Anclora');
  console.log('    - ORIGINS (optional), e.g. http://localhost:5173,http://127.0.0.1:5173');
  console.log('');
  console.log('Examples:');
  console.log('  Windows (PowerShell):');
  console.log('    $env:HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"');
  console.log('    $env:SPACE_ID="ToniBalles73/Anclora"');
  console.log('    $env:ORIGINS="http://localhost:5173,http://127.0.0.1:5173"');
  console.log('    npm run deploy:space');
  console.log('');
  console.log('  Linux/macOS (bash):');
  console.log('    export HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"');
  console.log('    export SPACE_ID="ToniBalles73/Anclora"');
  console.log('    export ORIGINS="http://localhost:5173,http://127.0.0.1:5173"');
  console.log('    npm run deploy:space');
};

if (!token || !spaceId) {
  console.error('ERROR: Missing required environment variables.');
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