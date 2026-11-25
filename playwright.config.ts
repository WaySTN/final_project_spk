import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const e2eStorePath =
  process.env.LAPTOPMATCH_LOCAL_STORE_PATH ??
  path.join(os.tmpdir(), `laptopmatch-e2e-store-${Date.now()}.json`);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port} -H 127.0.0.1`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          LAPTOPMATCH_LOCAL_STORE_PATH: e2eStorePath,
          LAPTOPMATCH_LOCAL_ADMIN_EMAIL: "admin@laptopmatch.local",
          LAPTOPMATCH_LOCAL_ADMIN_PASSWORD: "AdminLaptopMatch2026!",
        },
      },
});
