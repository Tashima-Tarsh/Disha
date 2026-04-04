import { defineConfig, devices } from "@playwright/test";
import path from "path";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: "set AGCLAW_WEB_ROOT=..&& npm run build && node scripts/start-e2e-server.mjs",
    cwd: path.resolve(__dirname),
    url: `http://127.0.0.1:${port}/health`,
    timeout: 180000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

