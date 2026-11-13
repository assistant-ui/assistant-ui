import { promises as fs } from "node:fs";
import path from "node:path";
import { unstable_cache } from "@farm.js/core/cache";
import type { ReactNode } from "react";
import { highlightElementSource } from "@/lib/element-source";
import { ExampleFrame } from "./example-frame";

const readExample = unstable_cache(
  async function readExample(file: string): Promise<string> {
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
  },
  ["components/diagrammatic/example.tsx#readExample"],
  { revalidate: false },
);

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

// MDX imports Example directly, so the LLM renderer takes this static instead of the client preview frame.
(
  Example as typeof Example & {
    llm: (props: { file: string }) => Promise<ReactNode>;
  }
).llm = async ({ file }) => (
  <pre>
    <code className="language-tsx">{await readExample(file)}</code>
  </pre>
);
