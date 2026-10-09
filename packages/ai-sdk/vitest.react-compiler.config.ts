import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const compiledAISDKChat = fileURLToPath(
  new URL("./dist/runtime/AISDKChat.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\/AISDKChat$/,
        replacement: compiledAISDKChat,
      },
    ],
  },
  test: {
    include: ["src/runtime/AISDKChat.react-compiler.test.ts"],
  },
});
