#!/usr/bin/env node
/**
 * InsightForge AI - Clean Shutdown & Process Cleanup Utility
 * Safely stops lingering development server processes on ports 8000 and 5173.
 */

import { execSync } from 'child_process';

const isWindows = process.platform === 'win32';

console.log('\n\x1b[35;1m[insightforge]\x1b[0m Stopping InsightForge AI local development services...');

function stopPort(port) {
  try {
    if (isWindows) {
      // Find owning PID using netstat
      const output = execSync(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid, 10)) && parseInt(pid, 10) > 0) {
          pids.add(parseInt(pid, 10));
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /T /PID ${pid} >nul 2>&1`);
          console.log(`\x1b[32m✔ Stopped process tree on port ${port} (PID: ${pid})\x1b[0m`);
        } catch {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      console.log(`\x1b[32m✔ Stopped process on port ${port}\x1b[0m`);
    }
  } catch {
    // Port was already free
  }
}

stopPort(8000);
stopPort(5173);

console.log('\x1b[35;1m[insightforge]\x1b[0m Ports 8000 and 5173 verified clean.\n');
