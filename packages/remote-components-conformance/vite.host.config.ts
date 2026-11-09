import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Host app: http://localhost:5180 (a different site from the remote server). */
export default defineConfig({
  root: "host",
  publicDir: "../public",
  plugins: [react()],
  server: { host: "localhost", port: 5180, strictPort: true },
  logLevel: "warn",
  clearScreen: false,
});
