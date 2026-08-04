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
      "@/components/ui": resolve(
        __dirname,
        "../../packages/ui/src/components/ui/base",
      ),
      "@/lib/utils": resolve(__dirname, "../../packages/ui/src/lib/utils"),
      "@": resolve(__dirname),
    },
  },
};
