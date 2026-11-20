import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppOSRuntime } from "./appos-runtime";
import { Article } from "./ArticleView";
import { article, articleText } from "./article";

const INSTRUCTIONS = `You are the reading assistant for one article, shown beside this chat. Answer questions about that article only.

Rules:
- Base every answer on the article text below. Quote or paraphrase it, and name who said what.
- If the answer is not in the article, say so plainly ("The article doesn't say."). Do not guess, invent details or use outside knowledge to fill gaps. You may then point to the closest thing the article does say.
- The article is fiction. If asked, say it is a made-up story; otherwise just answer within it.
- Keep answers short: a few sentences or a short list.

<article>
${articleText}
</article>`;

const SUGGESTIONS = [
  {
    title: "How did Gerald end up",
    label: "on the electoral roll?",
    prompt: "How did Gerald end up on the electoral roll?",
  },
  {
    title: "Why does the council",
    label: "want to get rid of the fog?",
    prompt: "Why does the council want to get rid of the fog?",
  },
  {
    title: "Who supports Gerald,",
    label: "and who doesn't?",
    prompt: "Who supports Gerald, and who is against it?",
  },
  {
    title: "What is Gerald reading",
    label: "at the library?",
    prompt: "What is Gerald reading at the library?",
  },
];

const Welcome = () => (
  <div className="mb-6 flex flex-col gap-1 px-2">
    <p className="text-2xl font-medium tracking-tight">Ask about the article</p>
    <p className="text-muted-foreground text-sm">
      Answers come only from “{article.title}”.
    </p>
  </div>
);

export function App() {
  const runtime = useAppOSRuntime({ instructions: INSTRUCTIONS });
  const config = AuiConfig({ suggestions: Suggestions(SUGGESTIONS) });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <TooltipProvider>
        <main className="flex h-dvh flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <div className="border-border md:w-[55%] md:overflow-y-auto md:border-r">
            <Article />
          </div>
          <aside className="border-border flex h-[85dvh] shrink-0 flex-col border-t md:h-auto md:flex-1 md:border-t-0">
            <Thread components={{ Welcome }} autoFocus={false} />
          </aside>
        </main>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
