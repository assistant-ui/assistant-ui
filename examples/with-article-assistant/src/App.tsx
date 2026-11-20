import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { AssistantModal } from "@/components/assistant-ui/elements/assistant-modal.aui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAgentRuntime } from "./runtime";
import { Article } from "./ArticleView";
import { articleText } from "./article";

const INSTRUCTIONS = `You are the reading assistant for one article, shown behind this chat. Answer questions about that article only.

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

export function App() {
  const runtime = useAgentRuntime({ instructions: INSTRUCTIONS });
  const config = AuiConfig({ suggestions: Suggestions(SUGGESTIONS) });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <TooltipProvider>
        <main className="h-dvh overflow-y-auto">
          <Article />
        </main>
        <AssistantModal />
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
