import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

export const uiAliases = (uiRoot) => ({
  "@/components/ui": resolve(uiRoot, "components/react/ui/base"),
  "@/components/assistant-ui": resolve(uiRoot, "components/react/assistant-ui"),
  "@/hooks": resolve(uiRoot, "hooks"),
  "@/lib/utils": resolve(uiRoot, "lib/utils.ts"),
});

export async function buildPreview(options, { uiRoot, sources }) {
  const { build } = require("esbuild");
  const result = await build({ ...options, alias: uiAliases(uiRoot) });
  const postcss = require("postcss");
  const tailwind = require("@tailwindcss/postcss");
  const theme = await readFile(new URL("./theme.css", import.meta.url), "utf8");
  const input = `@import "tailwindcss" source(none);\n@import "tw-animate-css";\n${sources.map((path) => `@source ${JSON.stringify(path)};`).join("\n")}\n${theme}`;
  const styles = await postcss([tailwind()]).process(input, {
    from: fileURLToPath(new URL("./theme.css", import.meta.url)),
  });
  const css = Object.keys(result.metafile.outputs).find((path) =>
    path.endsWith(".css"),
  );
  if (!css) throw new Error("Preview build produced no stylesheet");
  const combined = styles.css + "\n" + (await readFile(css, "utf8"));
  await writeFile(css, combined);
  result.metafile.outputs[css].bytes = Buffer.byteLength(combined);
  return result;
}
