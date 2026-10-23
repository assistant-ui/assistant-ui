import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import { highlightElementSource } from "@/lib/element-source";
import { ExampleFrame } from "./example-frame";

async function readExample(file: string): Promise<string> {
  "use cache";
  cacheLife("max");
  const source = await fs.readFile(
    path.join(
      process.cwd(),
      "components",
      "diagrammatic",
      "examples",
      `${file}.tsx`,
    ),
    "utf8",
  );
  return source.trimEnd();
}

export async function Example({
  file,
  children,
}: {
  file: string;
  children: ReactNode;
}) {
  const code = await readExample(file);
  const codeHtml = await highlightElementSource(code);
  return (
    <ExampleFrame
      preview={children}
      code={code}
      codeHtml={codeHtml}
      file={file}
    />
  );
}
