import type { ReactNode } from "react";
import { readExample } from "./example-source";
import { ExampleFrame } from "./example-frame.lazy";

// The preview renders with the page; the source behind the Code tab loads
// when the reader opens it (see app/api/diagrammatic/examples).
export async function Example({
  file,
  children,
}: {
  file: string;
  children: ReactNode;
}) {
  // Reading the source here fails the build on a misspelled file.
  await readExample(file);
  return <ExampleFrame preview={children} file={file} />;
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
