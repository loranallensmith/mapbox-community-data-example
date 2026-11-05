import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4322",
    browserName: "chromium",
    channel: "chrome",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock",
    url: "http://127.0.0.1:4322",
    env: { BASE_PATH: "/" },
    reuseExistingServer: false,
  },
  reporter: "list",
});
