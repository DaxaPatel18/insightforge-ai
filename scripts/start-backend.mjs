#!/usr/bin/env node
/**
 * InsightForge AI - Dedicated Backend Development Launcher
 * Explicitly targets backend/.venv Python and starts Uvicorn with reload.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

const isWindows = process.platform === 'win32';
const winPath = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const posixPath = path.join(backendDir, '.venv', 'bin', 'python');

const pythonExec = isWindows ? winPath : (fs.existsSync(posixPath) ? posixPath : winPath);

if (!fs.existsSync(pythonExec)) {
  console.error(`\x1b[31;1m[backend] FATAL: Python executable not found at: ${pythonExec}\x1b[0m`);
  process.exit(1);
}

console.log(`\x1b[34;1m[backend]\x1b[0m Starting FastAPI with: ${pythonExec}`);
const proc = spawn(
  pythonExec,
  ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
  {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: 'inherit',
  }
);

proc.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`\x1b[31;1m[backend] Backend process exited with code ${code}\x1b[0m`);
  }
  process.exit(code || 0);
});
