"use client";

import type { FC, PropsWithChildren } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/follow-up-suggestions";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const userMessage: DemoMessage = {
  id: "user-1",
  role: "user",
  text: "How should I improve onboarding for my AI assistant?",
};

const assistantMessage: DemoMessage = {
  id: "assistant-1",
  role: "assistant",
  text: "Start by mapping the first-run path, then add a few suggested prompts that help users discover the highest-value workflows.",
};

const messages = [
  userMessage,
  assistantMessage,
] satisfies readonly DemoMessage[];

const suggestions = [
  {
    prompt: "Draft three onboarding prompts",
  },
  {
    prompt: "Turn this into a checklist",
  },
  {
    prompt: "Show me a better empty state",
  },
];

const convertMessage = (message: DemoMessage): ThreadMessageLike => ({
  id: message.id,
  role: message.role,
  content: [{ type: "text", text: message.text }],
});

const FollowUpSuggestionsRuntimeProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const runtime = useExternalStoreRuntime({
    messages,
    suggestions,
    convertMessage,
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

export const FollowUpSuggestionsSample = () => {
  return (
    <SampleFrame className="bg-muted/40 flex h-auto min-h-72 items-center justify-center p-6">
      <FollowUpSuggestionsRuntimeProvider>
        <div className="bg-background w-full max-w-2xl rounded-xl border p-4 shadow-sm">
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-3.5 py-2 text-sm">
              {userMessage.text}
            </div>
          </div>
          <div className="mt-4 max-w-[85%] text-sm leading-relaxed">
            {assistantMessage.text}
          </div>
          <div className="mt-4">
            <ThreadFollowupSuggestions />
          </div>
        </div>
      </FollowUpSuggestionsRuntimeProvider>
    </SampleFrame>
  );
};
