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
      // Keep in step with the tsconfig paths: packages/ui ships stock shadcn
      // sidebars importing this bare alias, and it resolves outside this app.
      "@/hooks/use-mobile": resolve(
        __dirname,
        "../../packages/ui/src/hooks/use-mobile",
      ),
      "@/components/ui": resolve(
        __dirname,
        "../../packages/ui/src/components/react/ui/base",
      ),
      "@/components/assistant-ui/markdown-text": resolve(
        __dirname,
        "./components/assistant-ui/markdown-text",
      ),
      "@/components/assistant-ui": resolve(
        __dirname,
        "../../packages/ui/src/components/react/assistant-ui",
      ),
      "@/lib/utils": resolve(__dirname, "../../packages/ui/src/lib/utils"),
      "@": resolve(__dirname),
    },
  },
};
