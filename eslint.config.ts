import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import workspaces from "eslint-plugin-workspaces";

const eslintConfig = defineConfig([
  // Global ignores first
  globalIgnores([
    "**/python",
    "**/dist/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.vercel/**",
    "**/out/**",
    "**/.source/**",
    "**/next-env.d.ts",
  ]),

  // Next.js recommended configs (native flat format in v16, includes React)
  ...nextVitals,
  ...nextTs,

  // Workspaces plugin flat config
  workspaces.configs["flat/recommended"],

  // Custom rules override
  {
    settings: {
      next: {
        rootDir: ["apps/*/", "examples/*/"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Disable strict React Compiler rules that don't fit this codebase's patterns
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
]);

export default eslintConfig;
