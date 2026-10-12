#!/usr/bin/env node
/**
 * InsightForge AI - Cross-Platform Test Runner for Backend Suites
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
const pythonExec = isWindows && fs.existsSync(winPath) ? winPath : (fs.existsSync(posixPath) ? posixPath : winPath);

const testScript = process.argv[2] || 'test_auth_e2e_suite.py';

console.log(`\n\x1b[35;1m[insightforge]\x1b[0m Executing backend test: ${testScript}`);
const proc = spawn(pythonExec, [testScript], { cwd: backendDir, stdio: 'inherit' });

proc.on('exit', (code) => {
  process.exit(code || 0);
});
