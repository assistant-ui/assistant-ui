import { defineConfig } from "vite";
import { variants } from "../src/vite";

export default defineConfig({
  plugins: [variants()],
});
