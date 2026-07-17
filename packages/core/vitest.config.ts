import { configDefaults, defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      "**/external-message-converter.react-compiler.test.tsx",
    ],
    globals: true,
    passWithNoTests: true,
  },
});
