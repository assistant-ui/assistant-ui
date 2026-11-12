import { mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      "@streamdown/code": "@streamdown/code-v1",
    },
  },
  test: {
    include: ["src/__tests__/StreamdownTextCodePlugin.test.tsx"],
  },
});
