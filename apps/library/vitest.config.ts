import { fileURLToPath } from "node:url";

export default {
  resolve: {
    alias: {
      // tsconfig falls back from this app to the docs app for `@/`; Vite
      // aliases do not, so the docs modules the tests reach are named here.
      "@/lib/moved-docs": fileURLToPath(
        new URL("../docs/lib/moved-docs.ts", import.meta.url),
      ),
    },
  },
};
