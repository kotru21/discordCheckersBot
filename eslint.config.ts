import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  { ignores: ["dist", "node_modules", "**/dist", "activity/dist"] },

  reactHooks.configs.flat.recommended,

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
        tsconfigRootDir: repoRoot,
      },
    },
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },
]);
