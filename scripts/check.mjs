#!/usr/bin/env node
/**
 * InsightForge AI - System & Services Health Check Suite
 * Verifies backend health, frontend availability, Vite proxy routing, and active database dialect.
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31;1m',
  cyan: '\x1b[36m',
};

async function timedFetch(url, options = {}, timeoutMs = 3000) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    const duration = Date.now() - start;
    return { ok: res.ok, status: res.status, res, duration, error: null };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: 0, res: null, duration: Date.now() - start, error: err };
  }
}

async function runCheck() {
  console.log(`\n${COLORS.bold}InsightForge AI - Health & Availability Verification${COLORS.reset}`);
  console.log('='.repeat(70));

  let allHealthy = true;

  // 1. Direct Backend Health
  const beRes = await timedFetch('http://127.0.0.1:8000/health');
  let beData = null;
  if (beRes.ok) {
    try {
      beData = await beRes.res.json();
    } catch {}
  }

  const beStatus = beRes.ok ? `${COLORS.green}HEALTHY (200 OK)${COLORS.reset}` : `${COLORS.red}UNAVAILABLE${COLORS.reset}`;
  console.log(`\n1. Backend API (http://127.0.0.1:8000/health):`);
  console.log(`   Status:       ${beStatus} [${beRes.duration}ms]`);
  if (beData) {
    console.log(`   Platform:     ${beData.platform || 'InsightForge AI'} (v${beData.version || '0.3.0'})`);
    console.log(`   DB Status:    ${beData.database?.status === 'healthy' ? COLORS.green : COLORS.red}${beData.database?.status}${COLORS.reset}`);
    console.log(`   DB Dialect:   ${COLORS.cyan}${beData.database?.dialect || 'unknown'}${COLORS.reset}`);
  } else {
    allHealthy = false;
    console.log(`   Error:        ${COLORS.red}${beRes.error?.message || `HTTP ${beRes.status}`}${COLORS.reset}`);
  }

  // 2. Frontend Availability
  const feRes = await timedFetch('http://localhost:5173/');
  const feStatus = feRes.ok ? `${COLORS.green}AVAILABLE (200 OK)${COLORS.reset}` : `${COLORS.yellow}UNAVAILABLE / NOT LISTENING${COLORS.reset}`;
  console.log(`\n2. Frontend Web App (http://localhost:5173/):`);
  console.log(`   Status:       ${feStatus} [${feRes.duration}ms]`);
  if (!feRes.ok) {
    allHealthy = false;
    if (feRes.error) {
      console.log(`   Notice:       ${COLORS.yellow}${feRes.error.message}${COLORS.reset}`);
    }
  }

  // 3. Vite Reverse Proxy Routing
  const proxyRes = await timedFetch('http://localhost:5173/health');
  let proxyData = null;
  if (proxyRes.ok) {
    try {
      proxyData = await proxyRes.res.json();
    } catch {}
  }

  const proxyStatus = proxyRes.ok
    ? `${COLORS.green}OPERATIONAL (200 OK)${COLORS.reset}`
    : proxyRes.status === 502
    ? `${COLORS.red}FAILED (502 Bad Gateway - Proxy cannot reach backend)${COLORS.reset}`
    : `${COLORS.yellow}NOT TESTABLE (Frontend dev server inactive)${COLORS.reset}`;

  console.log(`\n3. Vite Dev Proxy Routing (http://localhost:5173/health):`);
  console.log(`   Proxy Status: ${proxyStatus} [${proxyRes.duration}ms]`);
  if (proxyData) {
    console.log(`   Verification: Routed to backend with dialect '${proxyData.database?.dialect}' successfully.`);
  }

  console.log('\n' + '='.repeat(70));
  if (allHealthy) {
    console.log(`${COLORS.green}${COLORS.bold}✔ ALL SYSTEMS OPERATIONAL: Ready for development.${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORS.yellow}${COLORS.bold}⚠ ONE OR MORE CHECKS REPORTED ISSUES.${COLORS.reset}`);
    console.log(`  Run 'npm run dev' to start both frontend and backend concurrently.\n`);
    process.exit(1);
  }
}

runCheck().catch((err) => {
  console.error('Check failed with uncaught exception:', err);
  process.exit(1);
});
