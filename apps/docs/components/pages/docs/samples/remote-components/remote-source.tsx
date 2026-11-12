import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { codeToHtml } from "shiki";
import { CodeBlock } from "@/components/ui/code-block";
import { REMOTE_PAGES, UI_CSS, type RemotePageName } from "./pages";

type Lang = "html" | "css" | "ts" | "tsx" | "txt";

async function highlight(code: string, lang: Lang): Promise<string> {
  "use cache";
  cacheLife("max");
  return codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light-dark()",
  });
}

function sourceOf(name: RemotePageName | "ui.css") {
  if (name === "ui.css")
    return { file: "widgets/ui.css", code: UI_CSS, lang: "css" as const };
  const page = REMOTE_PAGES[name];
  return { file: page.file, code: page.source, lang: "html" as const };
}

export async function RemoteSource({
  name,
}: {
  name: RemotePageName | "ui.css";
}) {
  const { file, code, lang } = sourceOf(name);
  const html = await highlight(code, lang);
  return (
    <CodeBlock
      title={file}
      copyText={code}
      viewportClassName="max-h-[32rem] overflow-y-auto"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </CodeBlock>
  );
}

(
  RemoteSource as typeof RemoteSource & {
    llm: (props: { name: RemotePageName | "ui.css" }) => ReactNode;
  }
).llm = ({ name }) => {
  const { file, code, lang } = sourceOf(name);
  return (
    <>
      <p>{file}</p>
      <pre>
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </>
  );
};

export async function Code({
  code,
  lang,
  title,
  className,
}: {
  code: string;
  lang: Lang;
  title?: string;
  className?: string;
}) {
  const html = await highlight(code, lang);
  return (
    <CodeBlock
      {...(title !== undefined && { title })}
      {...(className !== undefined && { className })}
      copyText={code}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </CodeBlock>
  );
}
