import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defaultExclude } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  test: {
    environment: "node",
    globals: true,
    // The generated repo source tree is a verbatim copy of the monorepo, and
    // vitest discovers dotted directories, so its tests would be collected here.
    exclude: [...defaultExclude, "generated/.repo-source/**"],
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
      "@/components/icons/discord": resolve(
        __dirname,
        "../../packages/ui/src/components/react/icons/discord",
      ),
      "@/components/icons/gemini": resolve(
        __dirname,
        "../../packages/ui/src/components/react/icons/gemini",
      ),
      "@/components/icons/github": resolve(
        __dirname,
        "../../packages/ui/src/components/react/icons/github",
      ),
      "@/components/icons/grok": resolve(
        __dirname,
        "../../packages/ui/src/components/react/icons/grok",
      ),
      "@/lib/utils": resolve(__dirname, "../../packages/ui/src/lib/utils"),
      "@": resolve(__dirname),
    },
  },
};
