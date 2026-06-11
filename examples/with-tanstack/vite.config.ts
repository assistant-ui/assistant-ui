import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  plugins: [
    nitro({
      output: {
        dir: "dist",
      },
      // Nitro enables wasm by default, which adds the "unwasm" export
      // condition. That routes `shiki/wasm` to its raw `onig.wasm` file, which
      // Vite/Rolldown cannot load during the SSR build ([UNLOADABLE_DEPENDENCY]).
      // Disabling it resolves `shiki/wasm` to its base64-inlined default — same
      // Oniguruma engine, no separate .wasm asset.
      wasm: false,
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json", "../../packages/ui/tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
