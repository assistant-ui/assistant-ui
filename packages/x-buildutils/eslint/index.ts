import nextConfig from "eslint-config-next";
import workspacesPlugin from "eslint-plugin-workspaces";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/.vercel/**",
      "**/out/**",
      ".source/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
  {
    plugins: {
      workspaces: workspacesPlugin,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...workspacesPlugin.configs.recommended.rules,
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
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
