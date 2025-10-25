import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
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

  // TypeScript ESLint recommended configs (no React)
  ...tseslint.configs.recommended,

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
