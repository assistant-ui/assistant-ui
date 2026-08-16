import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const compiledNotificationManager = fileURLToPath(
  new URL("./dist/utils/NotificationManager.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\/NotificationManager$/,
        replacement: compiledNotificationManager,
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/utils/NotificationManager.react-compiler.test.tsx"],
  },
});
