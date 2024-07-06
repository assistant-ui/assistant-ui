import { defineConfig } from "tsup";

export default defineConfig(() => {
  return {
    entry: ["src/tailwindcss.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: ["tailwindcss/plugin"],
  };
});
