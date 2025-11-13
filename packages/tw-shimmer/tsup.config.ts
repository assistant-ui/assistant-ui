import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.css"],
  clean: true,
  outExtension() {
    return {
      js: ".css",
    };
  },
});
