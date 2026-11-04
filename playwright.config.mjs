import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4321",
    browserName: "chromium",
    channel: "chrome",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4321 --ignore-lock",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
  },
  reporter: "list",
});
