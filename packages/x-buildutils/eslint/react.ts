import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import workspaces from "eslint-plugin-workspaces";

const eslintConfig = defineConfig([
  // Global ignores first
  globalIgnores([
    "**/dist/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.vercel/**",
    "**/out/**",
    ".source/**",
    "next-env.d.ts",
  ]),

  // Next.js recommended configs (native flat format in v16, includes React)
  ...nextVitals,
  ...nextTs,

  // Workspaces plugin flat config
  workspaces.configs["flat/recommended"],

  // Custom rules override
  {
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
    },
  },
]);

export default eslintConfig;
