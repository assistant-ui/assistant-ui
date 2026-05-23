import { defineConfig } from "@rslib/core";
import { createJiti } from "jiti";

const { referencePlugin } = await createJiti(import.meta.url).import(
  "./reference-plugin.ts",
);

export default defineConfig({
  plugins: [referencePlugin()],
  lib: [
    {
      format: "esm",
      bundle: false,
      dts: true,
      output: {
        sourceMap: {
          js: "source-map",
          css: false,
        },
      },
    },
  ],
  source: {
    entry: {
      index: ["./src/**", "!./src/**/__tests__/**", "!./src/**/*.test.*"],
    },
  },
});
