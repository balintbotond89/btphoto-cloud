import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import astro from "eslint-plugin-astro"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig(
  {
    ignores: [".astro", "dist", "coverage", ".vitest"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
  },
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: {
      globals: globals.browser,
    },
  },
)
