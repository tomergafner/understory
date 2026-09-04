import { defineConfig } from "@playwright/test";

// Local/CI: builds and serves the app itself.
// Against a deployment: E2E_BASE_URL=https://... npx playwright test
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start -- -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
