import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["dist/**", "node_modules/**", ".vercel/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: "error",
      "no-nested-ternary": "error",
      "no-throw-literal": "error",
    },
  },
  {
    files: ["main.js", "lib/client/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      "api/**/*.js",
      "lib/server/**/*.js",
      "scripts/**/*.mjs",
      "tests/**/*.js",
      "*.config.js",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/browser/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
