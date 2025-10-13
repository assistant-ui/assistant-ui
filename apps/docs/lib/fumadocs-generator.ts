import { createGenerator } from "fumadocs-typescript";
import { resolve } from "path";

export const generator = createGenerator({
  // Point to monorepo root to resolve ../../packages/* paths correctly
  basePath: resolve(process.cwd(), "../.."),
  tsconfigPath: resolve(process.cwd(), "tsconfig.json"),
});
