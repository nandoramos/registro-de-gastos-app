import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/navigation",
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: { baseURL: "http://localhost:3107", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "node scripts/navigation-server.mjs",
    url: "http://localhost:3107/login",
    reuseExistingServer: false,
    timeout: 240000,
  },
});
