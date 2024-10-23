import { build } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";
import fs from "fs";
import postcss from "postcss";
import postcssJs from "postcss-js";

// tailwind-plugin-resources

const files = ["./src/styles/tailwindcss/trieve.css"];

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

mkdirSync("./src/tailwindcss/data", { recursive: true });
for (const file of files) {
  const cssContent = fs.readFileSync(file, "utf8");
  const root = postcss.parse(cssContent);
  const formattedComponents = replaceNullWithObject(postcssJs.objectify(root));

  const outputFile =
    "./src/tailwindcss/data/" + file.split("/").pop() + ".json";
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
  entry: ["src/styles/tailwindcss/trieve.css"],
  outDir: "dist/styles",
});

mkdirSync("dist/styles/tailwindcss", { recursive: true });
copyFileSync(
  "src/styles/tailwindcss/trieve.css",
  "dist/styles/tailwindcss/trieve.css",
);
