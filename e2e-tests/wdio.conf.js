import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSetup } from "./helpers/setup.js";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const appName = "rgb-ldk-control-panel";
const configDir = process.env.RGB_LDK_CONTROL_PANEL_CONFIG_DIR ?? path.join(rootDir, ".tmp", "app-config");
const dataDir = process.env.RGB_LDK_CONTROL_PANEL_DATA_DIR ?? path.join(rootDir, ".tmp", "app-data");

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const buildProfile = process.env.E2E_BUILD_PROFILE ?? "debug";

const appBinary = isWin ? `${appName}.exe` : appName;
const bundleRoot = path.join(rootDir, "src-tauri", "target", buildProfile, "bundle");
const appPath = resolveAppPath();

const driverPort = Number(process.env.E2E_DRIVER_PORT ?? 4444);
const nativePort = Number(process.env.E2E_NATIVE_PORT ?? 4445);
const driverBin = process.env.E2E_TAURI_WEBDRIVER_BIN ?? "tauri-webdriver";

let driverProcess;

function resolveAppPath() {
  if (!isMac) {
    return path.join(rootDir, "src-tauri", "target", buildProfile, appBinary);
  }

  const candidates = [
    path.join(bundleRoot, "macos", `${appName}.app`, "Contents", "MacOS", appName),
    path.join(bundleRoot, "macos", "RGB Lightning Node.app", "Contents", "MacOS", appName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

async function waitForPort(port, host = "127.0.0.1", timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`WebDriver port ${host}:${port} not ready`);
}

async function killPort(port) {
  if (isWin) return;
  try {
    const { execSync } = await import("node:child_process");
    const out = execSync(`lsof -ti tcp:${port}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (!out) return;
    const pids = out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export const config = {
  runner: "local",
  host: "127.0.0.1",
  port: driverPort,
  specs: ["./specs/**/*.spec.js"],
  maxInstances: 1,
  capabilities: [
    {
      "tauri:options": {
        application: appPath,
        binary: appPath,
      },
    },
  ],
  logLevel: process.env.E2E_WDIO_LOG_LEVEL ?? "warn",
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    // Default to 5 minutes for a full cold-start (docker reset + chain sync + channel funding).
    // Override with E2E_MOCHA_TIMEOUT_MS if needed.
    timeout: Number(process.env.E2E_MOCHA_TIMEOUT_MS ?? 300000),
  },
  onPrepare: async () => {
    await runSetup({ rootDir, appPath });
    const binPath = resolveWebdriverBin();
    if (!fs.existsSync(binPath)) {
      throw new Error(
        `tauri-webdriver not found at ${binPath}. Install with: cargo install tauri-webdriver`,
      );
    }
    await killPort(driverPort);
    await killPort(nativePort);
    driverProcess = spawn(binPath, ["--port", String(driverPort), "--native-port", String(nativePort)], {
      stdio: "inherit",
      env: {
        ...process.env,
        RGB_LDK_CONTROL_PANEL_CONFIG_DIR: configDir,
        RGB_LDK_CONTROL_PANEL_DATA_DIR: dataDir,
        TAURI_WEBDRIVER_PORT: String(nativePort),
      },
    });
    await waitForPort(driverPort);
  },
  onComplete: async () => {
    if (driverProcess) driverProcess.kill();
  },
};

function resolveWebdriverBin() {
  if (driverBin.includes("/") || driverBin.includes("\\")) return driverBin;
  return path.join(os.homedir(), ".cargo", "bin", driverBin);
}
