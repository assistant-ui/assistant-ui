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
      "@": resolve(__dirname),
    },
  },
};
