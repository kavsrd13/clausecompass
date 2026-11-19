import js from "@eslint/js";
import { builtinModules } from "node:module";
import globals from "globals";
export default [
  { ignores: ["dist/**", "node_modules/**", ".vercel/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: "error",
      "array-callback-return": "error",
      "no-nested-ternary": "error",
      "no-throw-literal": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["main.js", "lib/*.js", "lib/client/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...builtinModules,
            {
              name: "zod",
              message: "Use zod/mini for schemas shipped to browsers.",
            },
          ],
          patterns: [
            {
              regex: "^node:|(?:^|/)(?:server|api)/",
              message:
                "Browser and shared modules use the HTTP client for server operations.",
            },
          ],
        },
      ],
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
