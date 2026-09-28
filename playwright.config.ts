import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the static export: `npm run build && npm run test:e2e`.
 * Set PW_CHANNEL=chrome to use an installed Chrome instead of Playwright's Chromium.
 */
const PORT = Number(process.env.PORT ?? 4175);

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    acceptDownloads: true,
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/static-server.mjs",
    url: `http://localhost:${PORT}/tools/pdf-to-word`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
