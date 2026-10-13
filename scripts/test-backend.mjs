#!/usr/bin/env node
/**
 * InsightForge AI - Cross-Platform Test Runner for Backend Suites
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

const isWindows = process.platform === 'win32';
const winPath = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const posixPath = path.join(backendDir, '.venv', 'bin', 'python');
const pythonExec = isWindows && fs.existsSync(winPath) ? winPath : (fs.existsSync(posixPath) ? posixPath : winPath);

const testScript = process.argv[2] || 'test_auth_e2e_suite.py';

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/health', { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const alreadyRunning = await checkHealth();
  let backendProc = null;

  if (!alreadyRunning) {
    console.log(`\x1b[34;1m[insightforge]\x1b[0m Starting local FastAPI test server on 127.0.0.1:8000...`);
    backendProc = spawn(
      pythonExec,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      { cwd: backendDir, env: { ...process.env, PYTHONUNBUFFERED: '1' }, stdio: 'ignore' }
    );

    // Poll until healthy
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkHealth()) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.error(`\x1b[31;1m[insightforge] Failed to start test backend server.\x1b[0m`);
      if (backendProc) backendProc.kill();
      process.exit(1);
    }
  }

  console.log(`\n\x1b[35;1m[insightforge]\x1b[0m Executing backend test: ${testScript}`);
  const testProc = spawn(pythonExec, [testScript], { cwd: backendDir, stdio: 'inherit' });

  testProc.on('exit', (code) => {
    if (backendProc) {
      backendProc.kill();
    }
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
