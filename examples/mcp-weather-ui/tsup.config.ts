import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/ui-server.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
});
