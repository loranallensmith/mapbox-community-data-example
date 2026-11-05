import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
// The application and build configuration share the same local setup.
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
export default defineConfig({
  site: process.env.SITE_URL || "https://example.github.io",
  base: process.env.BASE_PATH || "/",
  vite: { plugins: [tailwindcss()] },
});
