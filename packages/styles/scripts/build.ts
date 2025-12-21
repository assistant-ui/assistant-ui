import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import postcssNested from "postcss-nested";
import postcssPrefixSelector from "postcss-prefix-selector";

// Run sync-styles first to generate index.css from registry
console.log("Running sync-styles...");
execSync("tsx scripts/sync-styles.ts", { stdio: "inherit" });

// Process CSS with PostCSS
console.log("Building CSS...");

const inputPath = "src/styles/index.css";
const outputDir = "dist/styles";
const outputPath = path.join(outputDir, "index.css");

// Clean dist directory
await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

// Read the source CSS
const css = await fs.readFile(inputPath, "utf8");

// Configure PostCSS plugins
const processor = postcss([
  tailwindcss(),
  postcssNested(),
  postcssPrefixSelector({
    prefix: ":where(.aui-root)",
    transform: function (_prefix: string, selector: string) {
      if (selector === ":where(.aui-root) :root") {
        return ":root :where(.aui-root)";
      }
      if (selector === ":where(.aui-root) :host") {
        return ":host :where(.aui-root)";
      }
      return selector;
    },
  }),
]);

// Process the CSS
const result = await processor.process(css, {
  from: inputPath,
  to: outputPath,
});

// Write the output
await fs.writeFile(outputPath, result.css);

console.log(`Built ${outputPath}`);
