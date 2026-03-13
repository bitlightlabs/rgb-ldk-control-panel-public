import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import fssync from "node:fs";

const execFileAsync = promisify(execFile);

const SKIP_MINE = process.env.E2E_SKIP_MINE === "1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(__dirname, "../artifacts");
const statePath = path.resolve(__dirname, "..", "..", ".tmp", "e2e-state.json");
const progressPath = path.resolve(
  __dirname,
  "..",
  "..",
  ".tmp",
  "e2e-progress.json"
);
const timingsPath = path.resolve(artifactsDir, "timings.json");

function nowIso() {
  return new Date().toISOString();
}

function writeJsonSync(p, data) {
  try {
    fssync.mkdirSync(path.dirname(p), { recursive: true });
    fssync.writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    // ignore
  }
}

async function writeTimings(timings) {
  try {
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.writeFile(
      timingsPath,
      JSON.stringify({ at: nowIso(), timings }, null, 2)
    );
  } catch {
    // ignore
  }
}

async function withStep(timings, name, fn) {
  const startedAt = Date.now();
  writeJsonSync(progressPath, {
    at: nowIso(),
    step: name,
    status: "start",
    startedAtMs: startedAt,
  });
  try {
    await uiLog(`e2e.step.start:${name}`);
    const result = await fn();
    const ms = Date.now() - startedAt;
    timings.push({ name, ms, ok: true });
    writeJsonSync(progressPath, { at: nowIso(), step: name, status: "ok", ms });
    await writeTimings(timings);
    await uiLog(`e2e.step.ok:${name}`, { ms });
    return result;
  } catch (err) {
    const ms = Date.now() - startedAt;
    const message = String(err?.message ?? err);
    timings.push({ name, ms, ok: false, error: message });
    writeJsonSync(progressPath, {
      at: nowIso(),
      step: name,
      status: "error",
      ms,
      error: message,
    });
    await writeTimings(timings);
    try {
      await stepShot(`error_${name}`);
    } catch {
      // ignore
    }
    const e = err instanceof Error ? err : new Error(message);
    e.message = `[${name}] after ${ms}ms: ${e.message}`;
    throw e;
  }
}

async function readIssuerName() {
  if (process.env.E2E_ISSUER_NAME) return process.env.E2E_ISSUER_NAME;
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const data = JSON.parse(raw);
    if (data?.issuerName) return data.issuerName;
  } catch {
    // ignore
  }
  return "RGB20-Simplest-v0-rLosfg";
}

async function runScript(scriptRel, args = []) {
  const rootDir = path.resolve(__dirname, "../..");
  const scriptPath = path.join(rootDir, scriptRel);
  await execFileAsync("bash", [scriptPath, ...args], {
    cwd: rootDir,
    env: process.env,
  });
}

async function uiLog(message, context) {
  try {
    await browser.execute(
      (msg, ctx) => {
        window.__TAURI_INTERNALS__?.invoke?.("log_ui", {
          level: "info",
          message: msg,
          context: ctx ?? null,
        });
      },
      message,
      context ?? null
    );
  } catch {
    // ignore
  }
}

async function stepShot(step) {
  await fs.mkdir(artifactsDir, { recursive: true });
  const safe = String(step)
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 80);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await browser.saveScreenshot(
    path.resolve(artifactsDir, `${timestamp}-${safe}.png`)
  );
}

async function clickTestId(testId, { timeout = 10000 } = {}) {
  const el = await $(`[data-testid="${testId}"]`);
  await el.waitForExist({ timeout });
  try {
    await el.click();
  } catch {
    await browser.execute((tid) => {
      const target = document.querySelector(`[data-testid="${tid}"]`);
      if (target instanceof HTMLElement) target.click();
    }, testId);
  }
}

async function safeClick(selector, { timeout = 10000 } = {}) {
  const el = await $(selector);
  await el.waitForDisplayed({ timeout });
  try {
    await el.click();
  } catch {
    await browser.execute((sel) => {
      const target = document.querySelector(sel);
      if (target instanceof HTMLElement) target.click();
    }, selector);
  }
}

async function invokeTauri(command, payload) {
  return browser.executeAsync(
    (cmd, data, done) => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke)
        return done({ ok: false, error: "tauri invoke not available" });
      invoke(cmd, data)
        .then((res) => done({ ok: true, value: res }))
        .catch((err) =>
          done({ ok: false, error: String(err?.message ?? err) })
        );
    },
    command,
    payload ?? null
  );
}

async function invokeTauriOrThrow(command, payload) {
  const res = await invokeTauri(command, payload);
  if (!res || res.ok !== true) {
    throw new Error(`${command} failed: ${res?.error ?? "unknown error"}`);
  }
  return res.value;
}

async function eventsStart(nodeId) {
  await invokeTauriOrThrow("events_start", { nodeId });
}

async function eventsClear(nodeId) {
  await invokeTauriOrThrow("events_clear", { nodeId });
}

async function eventsList(nodeId, limit = 200) {
  const out = await invokeTauriOrThrow("events_list", { nodeId, limit });
  return Array.isArray(out) ? out : [];
}

async function waitForEvent(
  nodeId,
  type,
  { timeout = 120000, predicate = null } = {}
) {
  let lastSeen = null;
  await browser.waitUntil(
    async () => {
      const list = await eventsList(nodeId, 200);
      for (const item of list) {
        const ev = item?.event;
        if (!ev || ev.type !== type) continue;
        if (predicate && !predicate(ev.data ?? null, item)) continue;
        lastSeen = ev;
        return true;
      }
      return false;
    },
    {
      timeout,
      interval: 500,
      timeoutMsg: `event not seen: ${type} (node=${nodeId}) last=${
        lastSeen ? JSON.stringify(lastSeen) : "null"
      }`,
    }
  );
  return lastSeen;
}

async function tryWaitForEvent(
  nodeId,
  type,
  { timeout = 15000, predicate = null } = {}
) {
  try {
    return await waitForEvent(nodeId, type, { timeout, predicate });
  } catch {
    return null;
  }
}

async function listChannels(nodeId = "node-1") {
  const channels = await invokeTauriOrThrow("node_main_channels", { nodeId });
  await uiLog(`e2e.list_channels:${nodeId}`, {
    count: channels.length,
    ids: channels.map((c) => c?.channel_id),
  });
  return Array.isArray(channels) ? channels : [];
}

async function waitForNewChannel(nodeId = "node-1", existingChannelIds = []) {
  let lastLen = 0;
  await browser.waitUntil(
    async () => {
      const channels = await listChannels(nodeId);
      lastLen = channels.length;
      return channels.some(
        (ch) => ch && !existingChannelIds.includes(ch.channel_id)
      );
    },
    {
      timeout: 180000,
      interval: 3000,
      timeoutMsg: `new channel not created (node=${nodeId}, existing=${existingChannelIds.length}, lastLen=${lastLen})`,
    }
  );
}

async function waitForChannelReady(nodeId = "node-1", existingChannelIds = []) {
  let lastSnapshot = [];
  await browser.waitUntil(
    async () => {
      const channels = await listChannels(nodeId);
      lastSnapshot = channels.map((ch) => ({
        channel_id: ch?.channel_id,
        user_channel_id: ch?.user_channel_id,
        is_usable: ch?.is_usable,
        is_channel_ready: ch?.is_channel_ready,
        channel_point: ch?.channel_point,
      }));
      return channels.some((ch) => {
        if (!ch) return false;
        if (existingChannelIds.includes(ch.channel_id)) return false;
        return Boolean(ch.is_usable || ch.is_channel_ready);
      });
    },
    { timeout: 120000, interval: 1000, timeoutMsg: "channel not ready" }
  );
  await uiLog("e2e.channel.snapshot", { nodeId, channels: lastSnapshot });
}

function toBigIntU64(v) {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s))
    throw new Error(`invalid u64 string: ${JSON.stringify(v)}`);
}

describe("rgb ln e2e", () => {
  it("issue → export/import → invoice → pay (UI)", async () => {
    const timings = [];
    await uiLog("e2e.start");
    await withStep(timings, "app_loaded", async () => {
      await browser.url("tauri://localhost");
      await stepShot("app_loaded");
    });

    const contexts = await withStep(timings, "contexts_loaded", async () => {
      const ctxs = await invokeTauriOrThrow("contexts_reload");
      await browser.waitUntil(
        async () => {
          const hasNodes = await browser.execute(() => {
            return !document.body.textContent?.includes("No nodes configured");
          });
          return Boolean(hasNodes);
        },
        { timeout: 20000, interval: 500, timeoutMsg: "contexts not loaded" }
      );
      // Ensure we can observe channel lifecycle through the backend event loops.
      await eventsStart("node-1");
      await eventsStart("node-2");
      await eventsClear("node-1");
      await eventsClear("node-2");

      // Ensure the UI active node is deterministic (localStorage may persist between runs).
      await safeClick("button=Nodes");
      await clickTestId("pick-node-node-1", { timeout: 20000 });
      await stepShot("node_1_active");
      await stepShot("contexts_loaded");
      return ctxs;
    });

    const { contractId, assetId } = await withStep(
      timings,
      "issue_export_import",
      async () => {
        // Payments -> RGB flow (issue/export/import before RGB channel open).
        await safeClick('button[aria-label="Payments"]');
        await (
          await $("div*=RGB Lightning (BOLT-11) — RGB20")
        ).waitForDisplayed({ timeout: 30000 });
        await stepShot("payments_tab");

        await clickTestId("rgb-ln-picker-issuer-node-hack-node-1");
        await stepShot("issuer_selected");

        await clickTestId("rgb-ln-picker-receiver-node-hack-node-2");
        await stepShot("receiver_selected");

        const issuerInput = await $(
          "input[placeholder='issuer'], input[value='issuer']"
        );
        const issuerName = await readIssuerName();
        await issuerInput.setValue(issuerName);
        const contractInput = await $(
          "input[value='DemoRGB20'], input[value='Demo RGB20']"
        );
        await contractInput.setValue("DemoRGB20");
        await stepShot("issuer_value_set");

        const issueBtn = await $("button=Issue asset");
        await issueBtn.click();
        await stepShot("issue_completed");

        await browser.waitUntil(
          async () => {
            const result = await browser.execute(() => {
              const errorEl = document.querySelector(
                '[data-testid="issue-error"]'
              );
              const contractIdEl = document.querySelector(
                '[data-testid="contract-id"]'
              );
              return {
                hasError: Boolean(errorEl),
                errorText: errorEl?.textContent ?? "",
                hasContract: Boolean(contractIdEl),
              };
            });
            if (result.hasError) {
              throw new Error(`issue failed: ${result.errorText.trim()}`);
            }
            return result.hasContract;
          },
          {
            timeout: 60000,
            interval: 500,
            timeoutMsg: "contract_id not displayed after issue",
          }
        );
        await uiLog("e2e.issued");
        await stepShot("contract_id_visible");

        const contractId = await (
          await $('[data-testid="contract-id"]')
        ).getText();
        assert.ok(
          contractId && contractId.length > 10,
          "contract_id should be available"
        );

        await (await $("button=RGB sync issuer")).click();
        await (await $("button=RGB sync receiver")).click();
        await stepShot("sync_clicked");

        const exportBtn = await $("button=Export contract");
        await exportBtn.waitForEnabled({ timeout: 60000 });
        await exportBtn.click();
        // Export/import are async; ensure they actually complete before proceeding to RGB funding.
        await browser.waitUntil(
          async () => {
            const t = String((await exportBtn.getText()) ?? "");
            return t.includes("Export contract");
          },
          {
            timeout: 60000,
            interval: 250,
            timeoutMsg: "contract export did not complete",
          }
        );

        const importBtn = await $("button=Import to receiver");
        await importBtn.waitForEnabled({ timeout: 60000 });
        await importBtn.click();
        await browser.waitUntil(
          async () => {
            const t = String((await importBtn.getText()) ?? "");
            return t.includes("Import to receiver");
          },
          {
            timeout: 60000,
            interval: 250,
            timeoutMsg: "contract import did not complete",
          }
        );

        // Verify receiver actually has the contract (otherwise channel funding will fail with unknown contract).
        await browser.waitUntil(
          async () => {
            const res = await invokeTauri("node_rgb_contracts", {
              nodeId: "node-2",
            });
            if (!res?.ok) return false;
            const list = Array.isArray(res?.value?.contracts)
              ? res.value.contracts
              : [];
            return list.some(
              (c) => String(c?.contract_id ?? "") === String(contractId)
            );
          },
          {
            timeout: 60000,
            interval: 500,
            timeoutMsg: "receiver contract not visible after import",
          }
        );
        await uiLog("e2e.imported");
        await stepShot("import_done");

        // Ensure the receiver wallet fully ingests the imported contract before we attempt RGB funding.
        await (await $("button=RGB sync receiver")).click();
        await browser.pause(1000);

        const assetId = await (await $('[data-testid="asset-id"]')).getText();
        assert.ok(
          assetId && assetId.length > 10,
          "asset_id should be available"
        );

        return { contractId, assetId };
      }
    );

    // Open channels view and open an RGB-enabled channel from node-1 to node-2.
    let initialChannelIds = [];
    let initialChannelIds2 = [];
    await withStep(timings, "open_rgb_channel_dialog", async () => {
      await safeClick('button[aria-label="Channels"]');
      await stepShot("channels_tab");
      const initialChannels = await listChannels("node-1");
      initialChannelIds = initialChannels.map((ch) => ch.channel_id);
      const initialChannels2 = await listChannels("node-2");
      initialChannelIds2 = initialChannels2.map((ch) => ch.channel_id);
      const openBtn = await $("button=Open");
      await openBtn.waitForDisplayed({ timeout: 10000 });

      await openBtn.click();
      await stepShot("open_channel_dialog");

      const dialog = await $('div[role="dialog"]');
      const localNodeBtn = await dialog.$("button=Local node");
      await localNodeBtn.waitForDisplayed({ timeout: 10000 });
      await localNodeBtn.click();
      await stepShot("target_mode_local");

      await clickTestId("open-channel-target-hack-node-2");
      await stepShot("node_2_selected");

      const addressInput = await $("input#peer_address");
      await addressInput.waitForEnabled({ timeout: 10000 });
      await browser.waitUntil(
        async () => {
          const v = await addressInput.getValue();
          return Boolean(v && String(v).trim().length > 0);
        },
        {
          timeout: 20000,
          interval: 250,
          timeoutMsg: "peer address not auto-filled",
        }
      );

      const nodeIdInput = await $("input#peer_node_id");
      await browser.waitUntil(
        async () => {
          const v = String((await nodeIdInput.getValue()) ?? "").trim();
          return v.length > 40;
        },
        {
          timeout: 20000,
          interval: 250,
          timeoutMsg: "peer node_id not auto-filled",
        }
      );

      // Align with integration tests; use a funding size that consistently yields ChannelPending/Ready.
      const channelAmtInput = await $("input#channel_amount_sats");
      await channelAmtInput.waitForEnabled({ timeout: 10000 });
      await channelAmtInput.setValue("1000000");

      await clickTestId("open-channel-rgb-toggle");
      const rgbAssetInput = await $(
        '[data-testid="open-channel-rgb-asset-id"]'
      );
      await rgbAssetInput.waitForDisplayed({ timeout: 10000 });
      await rgbAssetInput.setValue(assetId);
      const rgbAmountInput = await $(
        '[data-testid="open-channel-rgb-asset-amount"]'
      );
      // Match rgb-ldk-node integration tests: keep RGB amount small but > payment amount.
      await rgbAmountInput.setValue("100");
      const rgbContextInput = await $(
        '[data-testid="open-channel-rgb-context-data"]'
      );
      const rgbContextValue = String(
        (await rgbContextInput.getValue()) ?? ""
      ).trim();
      if (!rgbContextValue) {
        // Must be reachable by the receiver node (which runs inside the docker network).
        await rgbContextInput.setValue(
          "http://rgbldk_node_1:8500/api/v1/rgb/consignments/{txid}?format=zip"
        );
      } else if (rgbContextValue.startsWith("file://")) {
        throw new Error(
          "Unsupported RGB color_context_data in e2e: " +
            rgbContextValue +
            ". Use HTTP /api/v1/rgb/consignments/{txid}?format=zip"
        );
      }
      await stepShot("rgb_channel_configured");

      const validationExists = await browser.execute(() =>
        Boolean(
          document.querySelector('[data-testid="open-channel-validation"]')
        )
      );
      if (validationExists) {
        const msg = await browser.execute(
          () =>
            document.querySelector('[data-testid="open-channel-validation"]')
              ?.textContent ?? ""
        );
        throw new Error(`open channel validation error: ${String(msg).trim()}`);
      }

      const openChannelBtn = await $("button=Open channel");
      await openChannelBtn.waitForEnabled({ timeout: 20000 });
      await openChannelBtn.click();
      await stepShot("open_channel_clicked");
    });

    await withStep(timings, "open_rgb_channel_created", async () => {
      // Ensure the channel actually exists before mining; otherwise we can mine "too early".
      await waitForNewChannel("node-1", initialChannelIds);
      await waitForNewChannel("node-2", initialChannelIds2);
    });

    await withStep(timings, "open_rgb_channel_confirmed", async () => {
      const hasOpenError = await browser.execute(() => {
        return Boolean(
          document.querySelector('[data-testid="open-channel-error"]')
        );
      });
      if (hasOpenError) {
        const msg = await browser.execute(
          () =>
            document.querySelector('[data-testid="open-channel-error"]')
              ?.textContent ?? ""
        );
        throw new Error(`open channel failed: ${String(msg).trim()}`);
      }

      // Mirror the Rust integration test flow:
      // - wait for ChannelPending on both sides
      // - mine confirmations
      // - wait for ChannelReady on both sides
      const pending1 = await tryWaitForEvent("node-1", "ChannelPending", {
        timeout: 30000,
      });
      const pending2 = await tryWaitForEvent("node-2", "ChannelPending", {
        timeout: 30000,
      });
      await uiLog("e2e.channel.pending", { node1: pending1, node2: pending2 });
      if (pending1 || pending2) {
        await stepShot("channel_pending_seen");
      }

      if (!SKIP_MINE) {
        await runScript("scripts/mine-local.sh", ["6"]);
      }

      // Encourage fast convergence after mining.
      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-2" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-2" });
      } catch {
        // ignore
      }

      await waitForEvent("node-1", "ChannelReady", { timeout: 180000 });
      await waitForEvent("node-2", "ChannelReady", { timeout: 180000 });
      await stepShot("channel_ready_seen");
      await waitForChannelReady("node-1", initialChannelIds);
      await waitForChannelReady("node-2", initialChannelIds2);

      await uiLog("e2e.channel_ready");
      await stepShot("channel_ready");
    });

    // Back to payments for invoice/pay.
    await withStep(timings, "invoice_pay_balances", async () => {
      await safeClick('button[aria-label="Payments"]');
      await (
        await $("div*=RGB Lightning (BOLT-11) — RGB20")
      ).waitForDisplayed({ timeout: 30000 });
      await stepShot("payments_tab_return");

      await clickTestId("rgb-ln-picker-invoice-receiver-hack-node-2");
      await stepShot("invoice_receiver_selected");
      await clickTestId("rgb-ln-picker-invoice-payer-hack-node-1");
      await stepShot("invoice_payer_selected");

      const invoiceAssetInput = await $(
        '[data-testid="rgb-ln-invoice-asset-id"]'
      );
      await invoiceAssetInput.waitForDisplayed({ timeout: 10000 });
      await invoiceAssetInput.setValue(assetId);
      const invoiceAmountInput = await $(
        '[data-testid="rgb-ln-invoice-asset-amount"]'
      );
      await invoiceAmountInput.setValue("21");
      const invoiceCarrierInput = await $(
        '[data-testid="rgb-ln-invoice-carrier-msat"]'
      );
      await invoiceCarrierInput.setValue("5000000");

      await (await $("button=Create RGB invoice")).click();
      const invoiceInput = await $("input[readonly]");
      await invoiceInput.waitForDisplayed({ timeout: 30000 });
      const invoice = await invoiceInput.getValue();
      assert.ok(invoice && invoice.length > 10, "invoice should be created");
      await stepShot("invoice_created");

      const payInput = await $("input[placeholder='rgb invoice']");
      await payInput.setValue(invoice);
      const payValue = await payInput.getValue();
      assert.strictEqual(payValue, invoice, "pay input should match invoice");
      await browser.pause(5000);

      const payBtn = await $("button=Pay RGB invoice");
      let paid = false;
      let lastError = "";
      for (let attempt = 0; attempt < 6 && !paid; attempt += 1) {
        await payBtn.click();
        await stepShot(`pay_clicked_${attempt + 1}`);
        await browser.waitUntil(
          async () => {
            const paidEl = await $('[data-testid="pay-success"]');
            const errorEl = await $('[data-testid="pay-error"]');
            if (await paidEl.isExisting()) {
              paid = true;
              return true;
            }
            if (await errorEl.isExisting()) {
              lastError = (await errorEl.getText()).trim();
              return true;
            }
            return false;
          },
          {
            timeout: 20000,
            interval: 1000,
            timeoutMsg: "pay attempt timed out",
          }
        );
        if (paid) break;
        if (!lastError) continue;
        const retryable =
          /route not found|payment sending failed|paymentsendingfailed/i.test(
            lastError.toLowerCase()
          );
        if (!retryable) break;
        await browser.pause(5000);
      }

      if (!paid) {
        throw new Error(`pay failed: ${lastError || "unknown error"}`);
      }
      await uiLog("e2e.paid");
      await stepShot("invoice_paid");

      // Close the channel to finalize state transitions, mirroring rgb-ldk-node integration tests.
      const channelsAfterPay = await listChannels("node-1");
      const active =
        channelsAfterPay.find((ch) => ch?.is_usable || ch?.is_channel_ready) ??
        channelsAfterPay[0];
      assert.ok(active?.user_channel_id, "expected channel user_channel_id");
      assert.ok(
        active?.counterparty_node_id,
        "expected channel counterparty_node_id"
      );
      await invokeTauriOrThrow("node_channel_close", {
        nodeId: "node-1",
        request: {
          user_channel_id: active.user_channel_id,
          counterparty_node_id: active.counterparty_node_id,
        },
      });

      await waitForEvent("node-1", "ChannelClosed", { timeout: 180000 });
      await waitForEvent("node-2", "ChannelClosed", { timeout: 180000 });

      if (!SKIP_MINE) {
        await runScript("scripts/mine-local.sh", ["6"]);
      }
      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-2" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-2" });
      } catch {
        // ignore
      }

      // Mirror rgb-ldk-node integration tests: give RGB runtime time to finalize after close, then re-mine + re-sync.
      if (!SKIP_MINE) {
        await browser.pause(30000);
        await runScript("scripts/mine-local.sh", ["6"]);
      }
      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "node-2" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-1" });
        await invokeTauriOrThrow("node_rgb_sync", { nodeId: "node-2" });
      } catch {
        // ignore
      }

      const balanceInput = await $(
        '[data-testid="rgb-ln-balance-contract-id"]'
      );
      await balanceInput.waitForDisplayed({ timeout: 10000 });
      await balanceInput.setValue(contractId);

      // These buttons share one mutation; wait for issuer result before querying receiver.
      const checkIssuerBtn = await $("button=Check issuer balance");
      await checkIssuerBtn.waitForEnabled({ timeout: 30000 });
      await checkIssuerBtn.click();
      await (await $("pre*=issuer:")).waitForDisplayed({ timeout: 30000 });

      const checkReceiverBtn = await $("button=Check receiver balance");
      await checkReceiverBtn.waitForEnabled({ timeout: 30000 });
      await checkReceiverBtn.click();
      await (await $("pre*=receiver:")).waitForDisplayed({ timeout: 30000 });
      await stepShot("balances_visible");

      // Assert totals converge to expected post-close state.
      const expectedSupply = 1000000n;
      const expectedPayment = 21n;
      let lastObserved = null;
      await browser.waitUntil(
        async () => {
          const b1 = await invokeTauriOrThrow("node_rgb_contract_balance", {
            nodeId: "node-1",
            contractId,
          });
          const b2 = await invokeTauriOrThrow("node_rgb_contract_balance", {
            nodeId: "node-2",
            contractId,
          });
          const issuerTotal = toBigIntU64(b1?.balance?.total);
          const receiverTotal = toBigIntU64(b2?.balance?.total);
          lastObserved = {
            issuer: b1?.balance,
            receiver: b2?.balance,
          };
          return (
            issuerTotal === expectedSupply - expectedPayment &&
            receiverTotal === expectedPayment
          );
        },
        {
          timeout: 240000,
          interval: 2000,
          timeoutMsg: `final balances did not converge after close; last=${
            lastObserved ? JSON.stringify(lastObserved) : "null"
          }`,
        }
      );
    });

    await writeTimings(timings);
  });
});
