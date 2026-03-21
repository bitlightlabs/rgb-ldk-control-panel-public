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
const progressPath = path.resolve(
  __dirname,
  "..",
  "..",
  ".tmp",
  "e2e-progress-btc-l2.json"
);
const timingsPath = path.resolve(artifactsDir, "btc-l2-timings.json");

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
    await uiLog(`btc_l2.step.start:${name}`);
    const result = await fn();
    const ms = Date.now() - startedAt;
    timings.push({ name, ms, ok: true });
    writeJsonSync(progressPath, { at: nowIso(), step: name, status: "ok", ms });
    await writeTimings(timings);
    await uiLog(`btc_l2.step.ok:${name}`, { ms });
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
      await stepShot(`btc_l2_error_${name}`);
    } catch {
      // ignore
    }
    const e = err instanceof Error ? err : new Error(message);
    e.message = `[${name}] after ${ms}ms: ${e.message}`;
    throw e;
  }
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

async function navTo(label, { timeout = 20000 } = {}) {
  await safeClick(`button=${label}`, { timeout });
}

async function invokeTauri(command, payload) {
  return browser.executeAsync(
    (cmd, data, done) => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        return done({ ok: false, error: "tauri invoke not available" });
      }
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

async function listChannels(nodeId = "alex") {
  const channels = await invokeTauriOrThrow("node_main_channels", { nodeId });
  await uiLog(`btc_l2.list_channels:${nodeId}`, {
    count: channels.length,
    ids: channels.map((c) => c?.channel_id),
  });
  return Array.isArray(channels) ? channels : [];
}

async function waitForNewChannel(nodeId = "alex", existingChannelIds = []) {
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

async function waitForChannelReady(nodeId = "alex", existingChannelIds = []) {
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
  await uiLog("btc_l2.channel.snapshot", { nodeId, channels: lastSnapshot });
}

function toBigIntU64(v) {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s)) {
    throw new Error(`invalid u64 string: ${JSON.stringify(v)}`);
  }
  return BigInt(s);
}

async function getBalances(nodeId) {
  return invokeTauriOrThrow("node_main_balances", { nodeId });
}

describe("btc l2 e2e", () => {
  it("open channel → lightning invoice → pay → close", async () => {
    const timings = [];
    const invoiceAmountMsat = 5_000_000n;
    const invoiceAmountSats = invoiceAmountMsat / 1000n;

    await uiLog("btc_l2.start");

    await withStep(timings, "app_loaded", async () => {
      await browser.url("tauri://localhost");
      await stepShot("btc_l2_app_loaded");
    });

    await withStep(timings, "contexts_loaded", async () => {
      await invokeTauriOrThrow("contexts_reload");
      await browser.waitUntil(
        async () => {
          const hasNodes = await browser.execute(() => {
            return !document.body.textContent?.includes("No nodes configured");
          });
          return Boolean(hasNodes);
        },
        { timeout: 20000, interval: 500, timeoutMsg: "contexts not loaded" }
      );
      await eventsStart("alex");
      await eventsStart("bob");
      await eventsClear("alex");
      await eventsClear("bob");

      await navTo("Nodes");
      await clickTestId("pick-node-alex", { timeout: 20000 });
      await stepShot("btc_l2_nodes_ready");
    });

    const beforeAlex = await getBalances("alex");
    const beforeBob = await getBalances("bob");
    const beforeBobOnchain = toBigIntU64(beforeBob?.btc?.onchain_spendable_sats);
    const beforeBobLightning = toBigIntU64(beforeBob?.btc?.lightning_total_sats);
    assert.ok(
      toBigIntU64(beforeAlex?.btc?.onchain_spendable_sats) >= 1_000_000n,
      "alex should have enough spendable sats to open a channel"
    );

    let initialChannelIds = [];
    let initialChannelIds2 = [];
    await withStep(timings, "open_btc_channel_dialog", async () => {
      await navTo("Channels");
      const initialChannels = await listChannels("alex");
      const initialChannels2 = await listChannels("bob");
      initialChannelIds = initialChannels.map((ch) => ch.channel_id);
      initialChannelIds2 = initialChannels2.map((ch) => ch.channel_id);

      const openBtn = await $("button=Open Channel");
      await openBtn.waitForDisplayed({ timeout: 10000 });
      await openBtn.click();

      const dialog = await $('div[role="dialog"]');
      const localNodeBtn = await dialog.$("button=Local node");
      await localNodeBtn.waitForDisplayed({ timeout: 10000 });
      await localNodeBtn.click();

      await clickTestId("open-channel-target-hack-bob");

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

      const channelAmtInput = await $("input#channel_amount_sats");
      await channelAmtInput.waitForEnabled({ timeout: 10000 });
      await channelAmtInput.setValue("1000000");
      await stepShot("btc_l2_open_channel_dialog");

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
    });

    await withStep(timings, "open_btc_channel_created", async () => {
      await waitForNewChannel("alex", initialChannelIds);
      await waitForNewChannel("bob", initialChannelIds2);
    });

    await withStep(timings, "open_btc_channel_confirmed", async () => {
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

      const pending1 = await tryWaitForEvent("alex", "ChannelPending", {
        timeout: 30000,
      });
      const pending2 = await tryWaitForEvent("bob", "ChannelPending", {
        timeout: 30000,
      });
      await uiLog("btc_l2.channel.pending", { node1: pending1, node2: pending2 });

      if (!SKIP_MINE) {
        await runScript("scripts/mine-local.sh", ["6"]);
      }

      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "alex" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "bob" });
      } catch {
        // ignore
      }

      await waitForEvent("alex", "ChannelReady", { timeout: 180000 });
      await waitForEvent("bob", "ChannelReady", { timeout: 180000 });
      await waitForChannelReady("alex", initialChannelIds);
      await waitForChannelReady("bob", initialChannelIds2);
      await stepShot("btc_l2_channel_ready");
    });

    await withStep(timings, "invoice_pay_balances", async () => {
      await navTo("Nodes");
      await clickTestId("pick-node-bob", { timeout: 20000 });
      await navTo("Dashboard");
      await (await $("button=Receive")).waitForDisplayed({ timeout: 20000 });
      await (await $("button=Receive")).click();
      await (await $("button=Lightning Invoice")).waitForDisplayed({
        timeout: 20000,
      });
      await (await $("button=Lightning Invoice")).click();

      const invoiceAmountInput = await $("#recv_amount_msat");
      await invoiceAmountInput.waitForDisplayed({ timeout: 30000 });
      await invoiceAmountInput.setValue(String(invoiceAmountMsat));
      const createBtn = await $("button=Create");
      await createBtn.waitForEnabled({ timeout: 30000 });
      await createBtn.click();

      const invoice = await browser.waitUntil(
        async () => {
          const val = await browser.execute(() => {
            const codes = Array.from(document.querySelectorAll("code"));
            for (const el of codes) {
              const text = (el.textContent ?? "").trim();
              if (text.startsWith("ln") && text.length > 20) return text;
            }
            return "";
          });
          return val || false;
        },
        {
          timeout: 30000,
          interval: 500,
          timeoutMsg: "invoice code not visible after create",
        }
      );
      assert.ok(String(invoice).length > 10, "invoice should be created");
      await stepShot("btc_l2_invoice_created");

      await navTo("Nodes");
      await clickTestId("pick-node-alex", { timeout: 20000 });
      await navTo("Dashboard");
      await (await $("button=Send")).waitForDisplayed({ timeout: 20000 });
      await (await $("button=Send")).click();

      const payloadInput = await $("#send_payload");
      await payloadInput.waitForDisplayed({ timeout: 20000 });
      await payloadInput.setValue(String(invoice));
      const payBtn = await $("button=Pay");
      await payBtn.waitForEnabled({ timeout: 30000 });
      await payBtn.click();
      const confirmBtn = await $("button=Confirm Pay");
      await confirmBtn.waitForEnabled({ timeout: 30000 });
      await confirmBtn.click();

      await browser.waitUntil(
        async () => {
          const text = await browser.execute(
            () => document.body.textContent ?? ""
          );
          return text.includes("Payment ID:");
        },
        {
          timeout: 120000,
          interval: 1000,
          timeoutMsg: "payment result did not show Payment ID",
        }
      );
      await stepShot("btc_l2_payment_success");

      await waitForEvent("bob", "PaymentReceived", {
        timeout: 120000,
        predicate: (data) =>
          String(data?.amount_msat ?? "") === String(invoiceAmountMsat),
      });

      let lastBobLightning = null;
      await browser.waitUntil(
        async () => {
          const balances = await getBalances("bob");
          const value = toBigIntU64(balances?.btc?.lightning_total_sats);
          lastBobLightning = value.toString();
          return value >= beforeBobLightning + invoiceAmountSats;
        },
        {
          timeout: 120000,
          interval: 1000,
          timeoutMsg: `bob lightning balance did not reflect payment; last=${lastBobLightning}`,
        }
      );

      const channelsAfterPay = await listChannels("alex");
      const active =
        channelsAfterPay.find((ch) => ch?.is_usable || ch?.is_channel_ready) ??
        channelsAfterPay[0];
      assert.ok(active?.user_channel_id, "expected channel user_channel_id");
      assert.ok(
        active?.counterparty_node_id,
        "expected channel counterparty_node_id"
      );

      await invokeTauriOrThrow("node_channel_close", {
        nodeId: "alex",
        request: {
          user_channel_id: active.user_channel_id,
          counterparty_node_id: active.counterparty_node_id,
        },
      });

      await waitForEvent("alex", "ChannelClosed", { timeout: 180000 });
      await waitForEvent("bob", "ChannelClosed", { timeout: 180000 });

      if (!SKIP_MINE) {
        await runScript("scripts/mine-local.sh", ["6"]);
      }
      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "alex" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "bob" });
      } catch {
        // ignore
      }

      if (!SKIP_MINE) {
        await browser.pause(30000);
        await runScript("scripts/mine-local.sh", ["6"]);
      }
      try {
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "alex" });
        await invokeTauriOrThrow("node_wallet_sync", { nodeId: "bob" });
      } catch {
        // ignore
      }

      let lastBobOnchain = null;
      await browser.waitUntil(
        async () => {
          const balances = await getBalances("bob");
          const value = toBigIntU64(balances?.btc?.onchain_spendable_sats);
          lastBobOnchain = value.toString();
          return value >= beforeBobOnchain + invoiceAmountSats;
        },
        {
          timeout: 240000,
          interval: 2000,
          timeoutMsg: `bob onchain balance did not settle after close; last=${lastBobOnchain}`,
        }
      );

      await navTo("Nodes");
      await clickTestId("pick-node-bob", { timeout: 20000 });
      await navTo("Dashboard");
      await stepShot("btc_l2_final_balances");
    });

    await writeTimings(timings);
  });
});
