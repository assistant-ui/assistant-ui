import { readdirSync, promises as fs } from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";
import { highlightElementSource } from "@/lib/element-source";

// Routes that read these files list them in `outputFileTracingIncludes`.
const EXAMPLES_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "components",
  "diagrammatic",
  "examples",
);

// "line/basic" names components/diagrammatic/examples/line/basic.tsx.
const EXAMPLE_NAME = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function isExampleName(name: string): boolean {
  return EXAMPLE_NAME.test(name);
}

export function listExampleNames(): string[] {
  return readdirSync(EXAMPLES_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\\/g, "/").replace(/\.tsx$/, ""))
    .filter(isExampleName)
    .sort();
}

export async function readExample(file: string): Promise<string> {
  "use cache";
  cacheLife("max");
  if (!isExampleName(file)) throw new Error(`Bad example name: ${file}`);
  const source = await fs.readFile(
    path.join(EXAMPLES_DIR, `${file}.tsx`),
    "utf8",
  );
  return source.trimEnd();
}

export type ExampleSource = { code: string; html: string };

export async function readHighlightedExample(
  file: string,
): Promise<ExampleSource> {
  const code = await readExample(file);
  return { code, html: await highlightElementSource(code) };
}
