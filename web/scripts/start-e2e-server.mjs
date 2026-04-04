import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webDir, "..");
const nextBin = path.resolve(webDir, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT ?? "3100";
const backendPort = process.env.AGCLAW_BACKEND_PORT ?? "8008";

const backend = spawn(
  "python",
  ["-m", "agclaw_backend.server", "--host", "127.0.0.1", "--port", backendPort],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: path.resolve(repoRoot, "backend"),
      AGCLAW_BACKEND_MOCK_CHAT: "1",
      AGCLAW_BACKEND_MOCK_HEALTH: "1",
      AGCLAW_BACKEND_QUIET: "1",
    },
  }
);

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: webDir,
  stdio: "inherit",
  env: {
    ...process.env,
    AGCLAW_WEB_ROOT: repoRoot,
    AGCLAW_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
  },
});

const shutdown = (signal) => {
  if (!backend.killed) {
    backend.kill(signal);
  }
  if (!child.killed) {
    child.kill(signal);
  }
};

child.on("exit", (code) => {
  shutdown("SIGTERM");
  process.exit(code ?? 0);
});

backend.on("exit", (code) => {
  if (code && !child.killed) {
    child.kill("SIGTERM");
    process.exit(code);
  }
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

