import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "host",
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: "host/index.html",
      },
    },
  },
  plugins: [tailwindcss(), react()],
});
