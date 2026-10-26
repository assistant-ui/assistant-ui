import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        inline: [/@farming-labs\/theme/, /fumadocs-ui/, /fumadocs-core/],
      },
    },
  },
});
