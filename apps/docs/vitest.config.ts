import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
};
