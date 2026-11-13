import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { highlightElementSource } from "@/lib/element-source";

const LANGUAGES = {
  bash: "bash",
  json: "json",
  ts: "tsx",
  tsx: "tsx",
} as const;

const textOf = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(node)
    ? textOf(node.props.children)
    : "";
};

export const readmeHeadingId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function ReadmeCode({
  code,
  language,
}: {
  code: string;
  language: string | undefined;
}) {
  const html = await highlightElementSource(
    code,
    LANGUAGES[language as keyof typeof LANGUAGES] ?? "text",
  );
  return (
    <CodeBlock className="mt-4" copyText={code}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </CodeBlock>
  );
}

const components: Components = {
  h2: ({ children }) => (
    <h2 id={readmeHeadingId(textOf(children))}>{children}</h2>
  ),
  pre: ({ children }) => {
    const code = isValidElement<{ className?: string; children?: ReactNode }>(
      children,
    )
      ? children.props
      : undefined;
    return (
      <ReadmeCode
        code={textOf(code?.children).replace(/\n$/, "")}
        language={/language-(\w+)/.exec(code?.className ?? "")?.[1]}
      />
    );
  },
  table: ({ children }) => (
    <div className="my-6">
      <Table>{children}</Table>
    </div>
  ),
  thead: ({ children }) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHead>{children}</TableHead>,
  td: ({ children }) => <TableCell>{children}</TableCell>,
};

/** A block's README, rendered with the docs' own code and table chrome. */
export function BlockReadme({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
