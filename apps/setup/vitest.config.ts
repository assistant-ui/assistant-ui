import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// The tsconfig paths resolve `@/components/ui/*` to base first and radix second.
const uiRoot = resolve(__dirname, "../../packages/ui/src/components/react/ui");
const radixOnlyUi = Object.fromEntries(
  readdirSync(resolve(uiRoot, "radix"))
    .map((file) => file.replace(/\.tsx?$/, ""))
    .filter(
      (name) =>
        !existsSync(resolve(uiRoot, "base", `${name}.tsx`)) &&
        !existsSync(resolve(uiRoot, "base", `${name}.ts`)),
    )
    .map((name) => [`@/components/ui/${name}`, resolve(uiRoot, "radix", name)]),
);

export default {
  // Vite rejects Next's string-valued PostCSS plugins; DOM tests do not assert transformed styles.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    pool: "threads",
    globals: true,
  },
  resolve: {
    alias: {
      "@/hooks/use-copy-to-clipboard": resolve(
        __dirname,
        "../../packages/ui/src/hooks/use-copy-to-clipboard",
      ),
      "@/hooks/use-mobile": resolve(
        __dirname,
        "../../packages/ui/src/hooks/use-mobile",
      ),
      ...radixOnlyUi,
      "@/components/ui": resolve(
        __dirname,
        "../../packages/ui/src/components/react/ui/base",
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
