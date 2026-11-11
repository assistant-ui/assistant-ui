import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

// `pnpm dev:lite` swaps the heaviest demos for a "Load demo" button, so they
// are not compiled until someone asks for them. next.config.mts aliases each
// module below to a generated file in .source/lite-demos that re-exports
// either the real module or the placeholder.
export const LITE_DEMOS = {
  home: {
    specifier: "@/components/pages/home/demo",
    module: "components/pages/home/demo/index.tsx",
    exports: ["HomeDemo"],
    label: "the home page demo",
  },
  playground: {
    specifier: "@/components/pages/playground/playground-page",
    module: "components/pages/playground/playground-page.tsx",
    exports: ["default"],
    label: "the playground",
  },
} as const;

export type LiteDemo = keyof typeof LITE_DEMOS;

export const LITE_DEMOS_FILE = ".source/lite-demos.json";
const GENERATED_DIR = ".source/lite-demos";

export const liteDemoModule = (demo: LiteDemo) =>
  `${GENERATED_DIR}/${demo}.tsx`;

export function isLiteDemo(value: unknown): value is LiteDemo {
  return typeof value === "string" && Object.hasOwn(LITE_DEMOS, value);
}

function readLoaded(root: string): LiteDemo[] {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(resolve(root, LITE_DEMOS_FILE), "utf8"),
    );
    return Array.isArray(parsed) ? parsed.filter(isLiteDemo) : [];
  } catch {
    return [];
  }
}

function writeIfChanged(file: string, text: string) {
  let previous: string | undefined;
  try {
    previous = readFileSync(file, "utf8");
  } catch {
    // Not written yet.
  }
  if (previous === text) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function demoSource(root: string, demo: LiteDemo, loaded: boolean) {
  const file = resolve(root, liteDemoModule(demo));
  const from = (target: string) =>
    JSON.stringify(relative(dirname(file), resolve(root, target)));
  const { module, exports, label } = LITE_DEMOS[demo];
  if (loaded) return `export { ${exports.join(", ")} } from ${from(module)};\n`;
  const lines = [
    '"use client";',
    `import { LiteDemoPlaceholder } from ${from("components/shared/lite-demo-placeholder.tsx")};`,
    "",
    `const Placeholder = () => <LiteDemoPlaceholder demo=${JSON.stringify(demo)} label=${JSON.stringify(label)} />;`,
    ...exports.map((name) =>
      name === "default"
        ? "export default Placeholder;"
        : `export const ${name} = Placeholder;`,
    ),
    "",
  ];
  return lines.join("\n");
}

/** Writes the generated demo modules; returns the alias map for Turbopack. */
export function writeLiteDemos(root: string) {
  const loaded = new Set(readLoaded(root));
  const aliases: Record<string, string> = {};
  for (const demo of Object.keys(LITE_DEMOS) as LiteDemo[]) {
    writeIfChanged(
      resolve(root, liteDemoModule(demo)),
      demoSource(root, demo, loaded.has(demo)),
    );
    aliases[LITE_DEMOS[demo].specifier] = `./${liteDemoModule(demo)}`;
  }
  return aliases;
}

/** Marks a demo as loaded and points its generated module at the real one. */
export function loadLiteDemo(root: string, demo: LiteDemo) {
  const loaded = new Set(readLoaded(root));
  loaded.add(demo);
  writeIfChanged(
    resolve(root, LITE_DEMOS_FILE),
    `${JSON.stringify([...loaded].sort())}\n`,
  );
  writeIfChanged(
    resolve(root, liteDemoModule(demo)),
    demoSource(root, demo, true),
  );
}
