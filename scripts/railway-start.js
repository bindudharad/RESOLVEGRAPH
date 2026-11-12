/**
 * RESOLVEGRAPH — Railway Safe Production Startup Script
 *
 * Ensures persistent directories exist, executes non-destructive Prisma migrations,
 * bootstraps demo records only if the persistent database is completely fresh,
 * and launches Next.js listening on 0.0.0.0:$PORT.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

console.log('[Railway Startup] Initializing RESOLVEGRAPH demonstration instance...');

// 1. Resolve SQLite database path
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
let dbFilePath = null;
if (dbUrl.startsWith('file:')) {
  const rawPath = dbUrl.replace(/^file:/, '');
  dbFilePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

// 2. Ensure persistent storage directories exist
if (dbFilePath) {
  const dbDir = path.dirname(dbFilePath);
  if (!fs.existsSync(dbDir)) {
    console.log(`[Railway Startup] Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const evidenceDir = path.resolve(
  process.cwd(),
  process.env.EVIDENCE_STORAGE_PATH ||
  process.env.EVIDENCE_STORAGE_DIR ||
  './.private/evidence'
);
if (!fs.existsSync(evidenceDir)) {
  console.log(`[Railway Startup] Creating evidence directory: ${evidenceDir}`);
  fs.mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
}

// 3. Database Initialization / Migration
const dbExists = dbFilePath && fs.existsSync(dbFilePath);

if (!dbExists) {
  console.log(`[Railway Startup] Persistent database not found at ${dbFilePath}. Initializing schema via prisma migrate deploy...`);
  const mig = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env, shell: true });
  if (mig.status !== 0) {
    console.error('[Railway Startup] FATAL: prisma migrate deploy failed during initial setup.');
    process.exit(1);
  }

  console.log('[Railway Startup] Seeding initial demonstration accounts and synthetic case records...');
  const seed = spawnSync('npm', ['run', 'db:seed'], { stdio: 'inherit', env: process.env, shell: true });
  if (seed.status !== 0) {
    console.warn('[Railway Startup] Warning: db:seed reported non-zero status, continuing startup.');
  }
} else {
  console.log(`[Railway Startup] Existing persistent database detected at ${dbFilePath}. Running non-destructive schema migration...`);
  spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env, shell: true });
}

// 4. Start Next.js server
const port = process.env.PORT || '3000';
console.log(`[Railway Startup] Launching Next.js on 0.0.0.0:${port}...`);

const nextProc = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

nextProc.on('exit', (code, signal) => {
  if (signal) {
    console.log(`[Railway Startup] Next.js process terminated by signal: ${signal}`);
  }
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  console.log('[Railway Startup] Received SIGTERM, forwarding to Next.js...');
  nextProc.kill('SIGTERM');
});
process.on('SIGINT', () => {
  console.log('[Railway Startup] Received SIGINT, forwarding to Next.js...');
  nextProc.kill('SIGINT');
});
