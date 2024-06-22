import {
  generateStylesheet,
  transform,
} from "@assistant-ui-tsup/tailwindcss-transformer";
import fs from "fs";
import path from "path";
import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

const tailwindcssTransformerCode: Plugin = {
  name: "tailwindcss-transformer-code",
  setup(build) {
    const outDir = path.join(process.cwd(), build.initialOptions.outdir!);
    const styleCache = new Map();
    build.onLoad({ filter: /.*/ }, async (args) => {
      // it would be more accurate to check if the file is part of tailwindConfig.content
      if (args.path.includes("node_modules")) {
        return;
      }

      const code = await fs.promises.readFile(args.path, "utf8");
      const transformedCode = transform(code, { styleCache });
      return {
        contents: transformedCode,
        resolveDir: path.dirname(args.path),
        loader: "tsx",
      };
    });

    build.onEnd(async () => {
      const styleSheet = await generateStylesheet(styleCache, {
        globalCss: fs.readFileSync(
          path.join(process.cwd(), "src", "global.css"),
          "utf8",
        ),
      });
      await fs.promises.mkdir(outDir, { recursive: true });
      await fs.promises.writeFile(path.join(outDir, "styles.css"), styleSheet);
      await fs.promises.writeFile(
        path.join(outDir, "styles.css.d.ts"),
        'declare module "@assistant-ui/react-ui/styles.css";',
      );
    });
  },
};

export default defineConfig(() => {
  return {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    esbuildPlugins: [tailwindcssTransformerCode],
  };
});
