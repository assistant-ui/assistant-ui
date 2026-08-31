import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { PreviewCodeClient } from "./preview-code";
import {
  cleanupCode,
  cleanupImports,
  extractFunctionCode,
  extractImports,
  extractUseClientDirective,
  filterRelevantImports,
} from "./preview-code-extract";
import type { LLMRenderContext } from "@/lib/get-llm-text";

type PreviewCodeProps = {
  /** Path relative to apps/docs, e.g. "components/pages/docs/samples/select" */
  file: string;
  /** Function name to extract, e.g. "SelectScrollableSample" */
  name: string;
  children: React.ReactNode;
  /** Base UI flavored twin of children; enables the flavor switcher. */
  base?: React.ReactNode;
  className?: string;
};

function buildPreviewCode(file: string, name: string): string {
  const filePath = path.join(process.cwd(), `${file}.tsx`);
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const functionCode = extractFunctionCode(source, name);
    const cleanedCode = cleanupCode(functionCode);

    const allImports = extractImports(source);
    const relevantImports = filterRelevantImports(allImports, cleanedCode);
    const cleanedImports = cleanupImports(relevantImports);
    const useClientDirective = extractUseClientDirective(source);
    const previewCode =
      cleanedImports.length > 0
        ? `${cleanedImports.join("\n")}\n\n${cleanedCode}`
        : cleanedCode;

    return useClientDirective
      ? `${useClientDirective}\n\n${previewCode}`
      : previewCode;
  } catch {
    return `// Error reading file: ${file}`;
  }
}

export async function PreviewCode({
  file,
  name,
  children,
  base,
  className,
}: PreviewCodeProps) {
  const hasRadixVariant = fs.existsSync(
    path.join(process.cwd(), `${file}.radix.tsx`),
  );
  const code = hasRadixVariant
    ? buildPreviewCode(`${file}.radix`, name)
    : buildPreviewCode(file, name);
  const baseCode =
    base !== undefined && hasRadixVariant
      ? buildPreviewCode(file, name)
      : undefined;

  return (
    <PreviewCodeClient
      code={code}
      codeVariant={hasRadixVariant ? "radix" : "base"}
      {...(base !== undefined && { base })}
      {...(baseCode !== undefined && { baseCode })}
      {...(className && { className })}
    >
      {children}
    </PreviewCodeClient>
  );
}

// PreviewCode is imported directly in MDX, so the LLM map can't swap it; it
// carries its text variant as a `.llm` static instead. Drop the live preview,
// keep the source.
(
  PreviewCode as typeof PreviewCode & {
    llm: (props: PreviewCodeProps, ctx?: LLMRenderContext) => ReactNode;
  }
).llm = ({ file, name }: PreviewCodeProps, ctx) => {
  const sourceFile =
    (ctx?.flavor ?? "base") === "radix" &&
    fs.existsSync(path.join(process.cwd(), `${file}.radix.tsx`))
      ? `${file}.radix`
      : file;

  return (
    <>
      <p>{`[interactive preview component ${name} omitted]`}</p>
      <p>{`Code for ${name} preview:`}</p>
      <pre>
        <code className="language-tsx">
          {buildPreviewCode(sourceFile, name)}
        </code>
      </pre>
    </>
  );
};
