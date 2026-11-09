import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// create-vite's config, plus a relative base so the build can be served
// from /__app/vite-template/.
export default defineConfig({ base: "./", plugins: [react()] });
