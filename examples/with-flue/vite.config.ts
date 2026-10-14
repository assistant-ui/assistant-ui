import { flue } from "@flue/vite";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: "node_modules/.vite/flue-server",
  plugins: [flue()],
});
