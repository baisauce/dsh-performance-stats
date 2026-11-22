/**
 * Qwen CLI invocation, parsing, and credits cache.
 * Command: qianwen subscription status --plan token --format json
 * Executed via ELECTRON_RUN_AS_NODE with the Host executable.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readdirSync } from 'node:fs';

const TIMEOUT_MS = 75_000;
const CACHE_SUCCESS_MS = 30_000;
const CACHE_FAILURE_MS = 10_000;

let cachedResult = null;
let cachedAt = 0;
let cacheIsSuccess = false;

/**
 * Find the qianwen CLI JS entry point.
 * Searches pnpm global directory and common locations.
 */
function cliCandidates() {
  const candidates = [];

  // Environment override
  if (process.env.QIANWEN_CLI_PATH) {
    candidates.push(process.env.QIANWEN_CLI_PATH);
  }

  const pnpmGlobal = join(homedir(), 'AppData', 'Local', 'pnpm', 'global');

  // Collect @qianwenai/qianwen-cli entry points under a node_modules directory.
  const scanNodeModules = (nm) => {
    try {
      for (const d of readdirSync(nm, { withFileTypes: true })) {
        if (d.name === '@qianwenai') {
          try {
            for (const s of readdirSync(join(nm, d.name), { withFileTypes: true })) {
              if (s.name === 'qianwen-cli') candidates.push(join(nm, d.name, s.name, 'dist', 'bin', 'qianwen.js'));
            }
          } catch { /* ignore */ }
        } else if (d.name === 'qianwen-cli') {
          candidates.push(join(nm, d.name, 'dist', 'bin', 'qianwen.js'));
        }
      }
    } catch { /* ignore */ }
  };

  if (existsSync(pnpmGlobal)) {
    // Legacy layout: global/node_modules/...
    scanNodeModules(join(pnpmGlobal, 'node_modules'));
    // pnpm v11 layout: global/v11/<hash>/node_modules/... (hash changes on upgrade).
    const v11 = join(pnpmGlobal, 'v11');
    if (existsSync(v11)) {
      try {
        for (const h of readdirSync(v11, { withFileTypes: true })) {
          if (h.isDirectory()) scanNodeModules(join(v11, h.name, 'node_modules'));
        }
      } catch { /* ignore */ }
    }
  }

  return candidates.filter(existsSync);
}

function resolveCli() {
  const candidates = cliCandidates();
  return candidates[0] ?? null;
}

/**
 * Run the qianwen CLI and parse JSON output.
 */
async function runCli(cliPath, args, timeoutMs = TIMEOUT_MS) {
  const execPath = process.execPath;
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, [cliPath, ...args], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new Error(msg));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        reject(new Error(`Invalid JSON: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

/**
 * Parse the CLI output into a structured plan object.
 */
function parsePlan(data) {
  const individual = data?.individual;
  if (!individual) return null;

  const monthly = individual.monthlyCredits;
  if (!monthly) return null;

  const total = Number(monthly.total) || 0;
  const usedPct = Number(monthly.usedPct) || 0;
  const remaining = total * (1 - usedPct / 100);

  return {
    planType: individual.name ?? individual.type ?? individual.planType ?? 'unknown',
    total,
    usedPct,
    remaining: Math.round(remaining * 10) / 10,
    resetAt: monthly.resetTime ?? individual.resetAt ?? individual.period?.end ?? null,
    daysRemaining: individual.remainingDays ?? individual.period?.remainingDays ?? null,
    fetchedAt: Date.now(),
  };
}

/**
 * Query the plan, using cache when available.
 * @param {boolean} force - bypass cache
 */
export async function queryPlan(force = false) {
  const now = Date.now();
  const cacheAge = now - cachedAt;
  const cacheValid = cacheIsSuccess
    ? cacheAge < CACHE_SUCCESS_MS
    : cacheAge < CACHE_FAILURE_MS;

  if (!force && cachedResult && cacheValid) {
    return { ...cachedResult, fromCache: true };
  }

  const cliPath = resolveCli();
  if (!cliPath) {
    const err = { error: 'no-cli', message: 'Qwen CLI not found' };
    if (cachedResult && cacheIsSuccess) {
      return { ...cachedResult, stale: true, error: err };
    }
    cachedResult = err;
    cachedAt = now;
    cacheIsSuccess = false;
    return err;
  }

  try {
    const data = await runCli(cliPath, ['subscription', 'status', '--plan', 'token', '--format', 'json']);
    const plan = parsePlan(data);
    if (!plan) {
      const err = { error: 'parse-error', message: 'Could not parse plan data' };
      if (cachedResult && cacheIsSuccess) {
        return { ...cachedResult, stale: true, error: err };
      }
      cachedResult = err;
      cachedAt = now;
      cacheIsSuccess = false;
      return err;
    }
    cachedResult = plan;
    cachedAt = now;
    cacheIsSuccess = true;
    return { ...plan, fromCache: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAuthError = /login|expired|未登录|TOKEN_EXPIRED|UNAUTHENTICATED/i.test(msg);
    const result = {
      error: isAuthError ? 'not-authenticated' : 'cli-error',
      message: msg,
    };
    if (cachedResult && cacheIsSuccess) {
      return { ...cachedResult, stale: true, error: result };
    }
    cachedResult = result;
    cachedAt = now;
    cacheIsSuccess = false;
    return result;
  }
}

/**
 * Get cached plan without triggering a CLI call.
 */
export function getCachedPlan() {
  return cachedResult ? { ...cachedResult, fromCache: true } : null;
}
