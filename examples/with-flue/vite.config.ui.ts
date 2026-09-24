import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/ui",
  plugins: [tailwindcss()],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@assistant-ui/react"],
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
