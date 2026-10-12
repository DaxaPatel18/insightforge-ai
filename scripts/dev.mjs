#!/usr/bin/env node
/**
 * InsightForge AI - Enterprise Development Orchestrator
 * Coordinates FastAPI (backend: 127.0.0.1:8000) and React/Vite (frontend: localhost:5173)
 * Powered by concurrently for robust process tree lifecycle management.
 */

import concurrently from 'concurrently';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');
const frontendDir = path.resolve(rootDir, 'frontend');

const isWindows = process.platform === 'win32';
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  backend: '\x1b[34;1m[backend]\x1b[0m',
  frontend: '\x1b[36;1m[frontend]\x1b[0m',
  system: '\x1b[35;1m[insightforge]\x1b[0m',
  success: '\x1b[32m',
  warning: '\x1b[33m',
  error: '\x1b[31;1m',
};

// 1. Resolve Python executable
function getPythonExecutable() {
  const winPath = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const posixPath = path.join(backendDir, '.venv', 'bin', 'python');

  if (isWindows && fs.existsSync(winPath)) return winPath;
  if (!isWindows && fs.existsSync(posixPath)) return posixPath;
  if (fs.existsSync(winPath)) return winPath;
  if (fs.existsSync(posixPath)) return posixPath;

  console.error(`${COLORS.system} ${COLORS.error}FATAL: Python virtual environment not found in backend/.venv!${COLORS.reset}`);
  console.error(`${COLORS.system} Expected: ${winPath} or ${posixPath}`);
  process.exit(1);
}

// 2. Check port status
function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port, host);
  });
}

// 3. Probe existing backend health
async function probeBackendHealth(url = 'http://127.0.0.1:8000/health') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function main() {
  console.log(`\n${COLORS.system} ${COLORS.bold}InsightForge AI - Starting Local Development Environment...${COLORS.reset}`);
  console.log(`${COLORS.system} Root Directory: ${rootDir}`);

  const pythonExec = getPythonExecutable();
  console.log(`${COLORS.system} Backend Python: ${pythonExec}`);

  // Check backend port 8000
  const port8000Used = await isPortInUse(8000, '127.0.0.1');
  let spawnBackend = true;

  if (port8000Used) {
    const health = await probeBackendHealth();
    if (health && health.status) {
      console.log(
        `${COLORS.backend} ${COLORS.success}✔ Active healthy backend detected on http://127.0.0.1:8000 (Dialect: ${health.database?.dialect || 'unknown'}). Reusing running backend instance.${COLORS.reset}`
      );
      spawnBackend = false;
    } else {
      console.warn(
        `${COLORS.backend} ${COLORS.warning}⚠ Port 8000 is occupied but /health did not respond ok. Please verify port 8000.${COLORS.reset}`
      );
      spawnBackend = false;
    }
  }

  // Check frontend port 5173
  const port5173Used = await isPortInUse(5173, '127.0.0.1');
  if (port5173Used) {
    console.log(
      `${COLORS.frontend} ${COLORS.warning}⚠ Port 5173 is already in use. Vite will reuse or negotiate next available port.${COLORS.reset}`
    );
  }

  const commands = [];

  if (spawnBackend) {
    commands.push({
      command: `"${pythonExec}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`,
      name: 'backend',
      cwd: backendDir,
      prefixColor: 'blue.bold',
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
  }

  commands.push({
    command: 'npm run dev',
    name: 'frontend',
    cwd: frontendDir,
    prefixColor: 'cyan.bold',
    env: { ...process.env },
  });

  const { result, commands: spawnedCommands } = concurrently(commands, {
    prefix: '[{name}]',
    prefixColors: ['blue.bold', 'cyan.bold'],
    killOthers: ['failure'],
    restartTries: 0,
  });

  const cleanupTrees = () => {
    for (const cmd of spawnedCommands) {
      if (cmd && cmd.pid) {
        try {
          if (isWindows) {
            import('child_process').then(({ execSync }) => {
              try { execSync(`taskkill /F /T /PID ${cmd.pid} >nul 2>&1`); } catch {}
            });
          } else {
            process.kill(-cmd.pid, 'SIGKILL');
          }
        } catch {}
      }
    }
  };

  process.once('SIGINT', () => {
    cleanupTrees();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    cleanupTrees();
    process.exit(0);
  });

  result.then(
    () => {
      cleanupTrees();
      console.log(`\n${COLORS.system} ${COLORS.success}All development services stopped cleanly.${COLORS.reset}`);
      process.exit(0);
    },
    (failures) => {
      cleanupTrees();
      console.error(`\n${COLORS.system} ${COLORS.error}One or more services exited:${COLORS.reset}`);
      for (const f of failures) {
        console.error(`  - [${f.command.name}] exited with code ${f.exitCode}`);
        if (f.command.name === 'backend') {
          console.error(`    ${COLORS.warning}Backend diagnostic: cd backend && "${pythonExec}" -m uvicorn app.main:app --port 8000${COLORS.reset}`);
        }
      }
      process.exit(1);
    }
  );
}

main().catch((err) => {
  console.error('Failed to orchestrate development environment:', err);
  process.exit(1);
});
