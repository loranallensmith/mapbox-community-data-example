import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
export default defineConfig(
  { ignores: ["dist/**", ".astro/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-explicit-any": "off" } },
);
