import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import fssync from "node:fs";

const execFileAsync = promisify(execFile);

const SKIP_BOOTSTRAP = process.env.E2E_SKIP_BOOTSTRAP === "1";
const SKIP_UNLOCK = process.env.E2E_SKIP_UNLOCK === "1";
const SKIP_IMPORT_ISSUER = process.env.E2E_SKIP_IMPORT_ISSUER === "1";
const SKIP_FUND = process.env.E2E_SKIP_FUND === "1";
const SKIP_MINE = process.env.E2E_SKIP_MINE === "1";
const SKIP_BUILD = process.env.E2E_SKIP_BUILD === "1";
const BUILD_PROFILE = process.env.E2E_BUILD_PROFILE ?? "debug";
const RESET_ENV = process.env.E2E_RESET ?? process.env.E2E_CLEAN ?? "1";
const progressPath = path.join(".tmp", "e2e-setup-progress.json");
const timingsPath = path.join("e2e-tests", "artifacts", "setup-timings.json");

function nowIso() {
  return new Date().toISOString();
}

function writeJsonSync(rootDir, rel, data) {
  try {
    const p = path.join(rootDir, rel);
    fssync.mkdirSync(path.dirname(p), { recursive: true });
    fssync.writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    // ignore
  }
}

async function timed(rootDir, timings, name, fn) {
  const startedAt = Date.now();
  writeJsonSync(rootDir, progressPath, { at: nowIso(), stage: name, status: "start", startedAtMs: startedAt });
  try {
    const result = await fn();
    const ms = Date.now() - startedAt;
    timings.push({ name, ms, ok: true });
    writeJsonSync(rootDir, progressPath, { at: nowIso(), stage: name, status: "ok", ms });
    await fs.mkdir(path.join(rootDir, "e2e-tests", "artifacts"), { recursive: true });
    await fs.writeFile(path.join(rootDir, timingsPath), JSON.stringify({ at: nowIso(), timings }, null, 2));
    return result;
  } catch (err) {
    const ms = Date.now() - startedAt;
    const message = String(err?.message ?? err);
    timings.push({ name, ms, ok: false, error: message });
    writeJsonSync(rootDir, progressPath, { at: nowIso(), stage: name, status: "error", ms, error: message });
    await fs.mkdir(path.join(rootDir, "e2e-tests", "artifacts"), { recursive: true });
    await fs.writeFile(path.join(rootDir, timingsPath), JSON.stringify({ at: nowIso(), timings }, null, 2));
    throw err;
  }
}

function configDir(rootDir) {
  return process.env.RGB_LDK_CONTROL_PANEL_CONFIG_DIR ?? path.join(rootDir, ".tmp", "app-config");
}

function contextsPath(rootDir) {
  return process.env.CONTEXTS_PATH ?? path.join(configDir(rootDir), "contexts.json");
}

async function readContexts(rootDir) {
  try {
    const raw = await fs.readFile(contextsPath(rootDir), "utf8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, contexts: [] };
  }
}

async function readToken(tokenPath) {
  if (!tokenPath) return null;
  try {
    const raw = await fs.readFile(tokenPath, "utf8");
    return raw.trim();
  } catch {
    return null;
  }
}

function buildUrl(base, rel) {
  const normalized = rel.startsWith("/") ? rel.slice(1) : rel;
  return new URL(normalized, base).toString();
}

async function fetchJson(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const resp = await fetch(url, { ...init, signal: controller.signal });
  clearTimeout(timer);
  const text = await resp.text();
  const body = text ? safeJson(text) : null;
  if (!resp.ok) {
    const msg = typeof body?.error === "string" ? body.error : resp.statusText || `HTTP ${resp.status}`;
    throw new Error(`HTTP ${resp.status}: ${msg}`);
  }
  return body;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function waitForHealth(rootDir) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    let ok = true;
    for (const ctx of contexts) {
      try {
        const resp = await fetchJson(buildUrl(ctx.main_api_base_url, "/api/v1/healthz"), { method: "GET" });
        if (!resp?.ok) ok = false;
      } catch {
        ok = false;
      }
    }
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("nodes not ready before timeout");
}

async function waitForReady(rootDir) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    let ok = true;
    for (const ctx of contexts) {
      try {
        const resp = await fetchJson(buildUrl(ctx.main_api_base_url, "/api/v1/readyz"), { method: "GET" });
        if (!resp?.ok) ok = false;
      } catch {
        ok = false;
      }
    }
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("nodes not ready before timeout");
}

async function unlockAll(rootDir) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  for (const ctx of contexts) {
    if (!ctx.control_api_base_url || !ctx.control_api_token_file_path) continue;
    const token = await readToken(ctx.control_api_token_file_path);
    if (!token) continue;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    try {
      await fetchJson(buildUrl(ctx.control_api_base_url, "/control/unlock"), {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }
  }
}

async function importIssuerAll(rootDir, issuerPath) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  const issuerBytes = new Uint8Array(await fs.readFile(issuerPath));
  const issuerName = path.basename(issuerPath).replace(/\.[^/.]+$/, "");
  let detectedIssuer = issuerName;
  for (const ctx of contexts) {
    const token = await readToken(ctx.main_api_token_file_path);
    const headers = {
      "Content-Type": "application/octet-stream",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const importUrl = buildUrl(
        ctx.main_api_base_url,
        `/api/v1/rgb/issuers/import?name=${encodeURIComponent(issuerName)}&format=raw`,
      );
      await fetchJson(importUrl, {
        method: "POST",
        headers,
        body: issuerBytes,
      });
    } catch (error) {
      throw new Error(`issuer import failed for ${ctx.node_id ?? ctx.display_name ?? ctx.main_api_base_url}: ${error?.message ?? error}`);
    }

    try {
      const issuersResp = await fetchJson(buildUrl(ctx.main_api_base_url, "/api/v1/rgb/issuers"), {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const issuers = Array.isArray(issuersResp?.issuers) ? issuersResp.issuers : [];
      if (!issuers.length) {
        throw new Error("issuer list empty after import");
      }
      if (!issuers.includes(issuerName)) {
        detectedIssuer = issuers[0];
        console.warn(
          `issuer name "${issuerName}" not found for ${ctx.node_id ?? ctx.display_name ?? ctx.main_api_base_url}; using "${detectedIssuer}"`,
        );
      }
    } catch (error) {
      throw new Error(`issuer list check failed for ${ctx.node_id ?? ctx.display_name ?? ctx.main_api_base_url}: ${error?.message ?? error}`);
    }
  }

  const statePath = path.join(rootDir, ".tmp", "e2e-state.json");
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify({ issuerName: detectedIssuer }, null, 2));
}

async function postOk(url, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  await fetchJson(url, { method: "POST", headers, body: JSON.stringify({}) });
}

async function getBalances(baseUrl, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return fetchJson(buildUrl(baseUrl, "/api/v1/balances"), { method: "GET", headers });
}

async function walletSyncAll(rootDir) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  for (const ctx of contexts) {
    const token = await readToken(ctx.main_api_token_file_path);
    await postOk(buildUrl(ctx.main_api_base_url, "/api/v1/wallet/sync"), token);
  }
}

async function waitForSpendableAll(rootDir, minSpendableSats = 100_000) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    let ok = true;
    for (const ctx of contexts) {
      const token = await readToken(ctx.main_api_token_file_path);
      try {
        await postOk(buildUrl(ctx.main_api_base_url, "/api/v1/wallet/sync"), token);
        const b = await getBalances(ctx.main_api_base_url, token);
        const spendable = Number(
          b?.btc?.onchain_spendable_sats ?? b?.spendable_onchain_balance_sats ?? 0
        );
        if (!(spendable >= minSpendableSats)) ok = false;
      } catch {
        ok = false;
      }
    }
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`spendable sats not available before timeout (min=${minSpendableSats})`);
}

async function rgbSyncAll(rootDir) {
  const ctxFile = await readContexts(rootDir);
  const contexts = ctxFile.contexts ?? [];
  for (const ctx of contexts) {
    const token = await readToken(ctx.main_api_token_file_path);
    await postOk(buildUrl(ctx.main_api_base_url, "/api/v1/rgb/sync"), token);
  }
}

async function runScript(rootDir, scriptRel, args = [], env = {}) {
  const scriptPath = path.join(rootDir, scriptRel);
  await execFileAsync("bash", [scriptPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, ...env },
  });
}

async function runCommand(rootDir, cmd, args = []) {
  await execFileAsync(cmd, args, {
    cwd: rootDir,
    env: process.env,
  });
}

export async function runSetup({ rootDir, appPath }) {
  const timings = [];
  if (RESET_ENV === "1") {
    const resetArgs = process.env.E2E_RESET_HARD === "1" ? ["--hard"] : [];
    await timed(rootDir, timings, "reset_local", async () => runScript(rootDir, "scripts/reset-local.sh", resetArgs));
  }
  // Building the desktop app can dominate runtime; by default we only build when the binary is missing.
  // Force rebuild with E2E_BUILD_ALWAYS=1.
  const buildAlways = process.env.E2E_BUILD_ALWAYS === "1";
  const binaryMissing = appPath ? !fssync.existsSync(appPath) : false;
  if (binaryMissing && SKIP_BUILD) {
    throw new Error(`App binary missing at ${appPath}. Unset E2E_SKIP_BUILD or set E2E_SKIP_BUILD=0.`);
  }
  if (!SKIP_BUILD && (buildAlways || binaryMissing)) {
    await timed(rootDir, timings, "tauri_build", async () => {
      if (BUILD_PROFILE === "release") {
        await runCommand(rootDir, "pnpm", ["tauri", "build"]);
      } else {
        await runCommand(rootDir, "pnpm", ["tauri", "build", "--debug"]);
      }
    });
  }
  if (!SKIP_BOOTSTRAP) {
    await timed(rootDir, timings, "bootstrap_local", async () =>
      runScript(rootDir, "scripts/bootstrap-local.sh", [], { SKIP_TAURI_DEV: "1" }),
    );
  }
  await timed(rootDir, timings, "wait_healthz", async () => waitForHealth(rootDir));
  if (!SKIP_UNLOCK) {
    await timed(rootDir, timings, "unlock_all", async () => unlockAll(rootDir));
    await timed(rootDir, timings, "wait_readyz", async () => waitForReady(rootDir));
  }
  await timed(rootDir, timings, "rgb_sync_all_pre", async () => rgbSyncAll(rootDir));
  if (!SKIP_IMPORT_ISSUER) {
    await timed(rootDir, timings, "import_issuer_all", async () =>
      importIssuerAll(rootDir, path.join(rootDir, "e2e-tests", "fixtures", "RGB20-Simplest-v0-rLosfg.issuer")),
    );
  }
  if (!SKIP_FUND) {
    await timed(rootDir, timings, "fund_local", async () => runScript(rootDir, "scripts/fund-local.sh"));
  }
  if (!SKIP_MINE) {
    await timed(rootDir, timings, "mine_6", async () => runScript(rootDir, "scripts/mine-local.sh", ["6"]));
  }
  await timed(rootDir, timings, "wallet_sync_all", async () => walletSyncAll(rootDir));
  await timed(rootDir, timings, "wait_spendable", async () => waitForSpendableAll(rootDir, 200_000));
  await timed(rootDir, timings, "rgb_sync_all_post", async () => rgbSyncAll(rootDir));
}
