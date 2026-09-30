import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ThreadFollowupSuggestions } from "@assistant-ui/ui/components/assistant-ui/elements/follow-up-suggestions.aui.tsx";
import { defineSections } from "../types";

const MESSAGES: ThreadMessageLike[] = [
  {
    id: "u1",
    role: "user",
    content: "How should I improve onboarding for my assistant?",
  },
  {
    id: "a1",
    role: "assistant",
    content:
      "Map the first-run path, then add a few suggested prompts that lead to the highest-value workflows.",
  },
];

const SUGGESTIONS = [
  { prompt: "Draft three onboarding prompts" },
  { prompt: "Turn this into a checklist" },
  { prompt: "Write copy for the welcome screen" },
  { prompt: "Which metrics show onboarding is working?" },
];

// As in the docs sample: the external store runtime takes suggestions directly.
function SuggestionsRuntime({ children }: { children: ReactNode }) {
  const runtime = useExternalStoreRuntime({
    messages: MESSAGES,
    suggestions: SUGGESTIONS,
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export default defineSections([
  {
    id: "follow-up-suggestions",
    title: "Follow-up suggestions",
    category: "chat",
    notes:
      "follow-up-suggestions.aui.tsx under an external store runtime with four suggestions; the row scrolls sideways and fades at its edges.",
    render: () => (
      <SuggestionsRuntime>
        <div className="flex flex-col gap-4 text-sm">
          <div className="bg-muted self-end rounded-2xl px-3.5 py-2">
            {MESSAGES[0]!.content as string}
          </div>
          <p>{MESSAGES[1]!.content as string}</p>
          <ThreadFollowupSuggestions />
        </div>
      </SuggestionsRuntime>
    ),
  },
]);
