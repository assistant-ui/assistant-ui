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
      "@/components/assistant-ui/elements/markdown-text": resolve(
        __dirname,
        "./components/assistant-ui/elements/markdown-text",
      ),
      "@/components/assistant-ui": resolve(
        __dirname,
        "../../packages/ui/src/components/assistant-ui",
      ),
      "@/lib/utils": resolve(__dirname, "../../packages/ui/src/lib/utils"),
      "@": resolve(__dirname),
    },
  },
};
