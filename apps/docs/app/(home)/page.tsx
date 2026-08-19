import { promises as fs } from "node:fs";
import path from "node:path";
import { Hero } from "@/components/pages/home/hero";
import { LibraryBody } from "@/components/pages/home/library-body";
import { ThreadSpecimen } from "@/components/pages/home/thread-specimen";
import { PageFrame } from "@/components/shared/page-frame";
import { getRepo } from "@/lib/github";
import { highlightElementSource } from "@/lib/element-source";
import { getWeeklyDownloads } from "@/lib/npm";

async function getReactVersion(): Promise<string | null> {
  try {
    const raw = await fs.readFile(
      path.join(
        process.cwd(),
        "node_modules",
        "@assistant-ui",
        "react",
        "package.json",
      ),
      "utf8",
    );
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

const INSTALL_SNIPPET = `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

export default async function HomePage() {
  const [repo, downloads, installHtml, reactVersion] = await Promise.all([
    getRepo(),
    getWeeklyDownloads(),
    highlightElementSource(INSTALL_SNIPPET, "tsx"),
    getReactVersion(),
  ]);

  return (
    <PageFrame pad="heroBody" className="relative z-2 flex flex-col">
      <div className="flex flex-col gap-10 md:gap-16">
        <Hero stars={repo?.stars ?? null} downloads={downloads} />
        <ThreadSpecimen />
      </div>
      <LibraryBody installHtml={installHtml} reactVersion={reactVersion} />
    </PageFrame>
  );
}
