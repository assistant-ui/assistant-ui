import { build } from "tsup";
import fs from "node:fs";
import postcss from "postcss";
import postcssJs from "postcss-js";

// tailwind-plugin-resources

const files = ["./src/styles/tailwindcss/markdown.css"];

const replaceNullWithObject = (obj: object) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value === true) return [key, {}];
      if (typeof value === "object" && value !== null)
        return [key, replaceNullWithObject(value)];
      return [key, value];
    }),
  );
};

fs.mkdirSync("./generated", { recursive: true });
for (const file of files) {
  const cssContent = fs.readFileSync(file, "utf8");
  const root = postcss.parse(cssContent);
  const formattedComponents = replaceNullWithObject(postcssJs.objectify(root));

  const outputFile = "./generated/" + file.split("/").pop() + ".json";
  const outputContent = JSON.stringify(formattedComponents, null, 2);
  fs.writeFileSync(outputFile, outputContent);
}

// JS
await build({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  esbuildOptions: (options, { format }) => {
    if (format === "esm") {
      options.banner = {
        js: '"use client";',
      };
    }
  },
});

await build({
  entry: ["src/tailwindcss/index.ts"],
  outDir: "dist/tailwindcss",
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
});

// css

await build({
  entry: ["src/styles/tailwindcss/markdown.css"],
  outDir: "dist/styles",
});

fs.mkdirSync("dist/styles/tailwindcss", { recursive: true });
fs.copyFileSync(
  "src/styles/tailwindcss/markdown.css",
  "dist/styles/tailwindcss/markdown.css",
);
