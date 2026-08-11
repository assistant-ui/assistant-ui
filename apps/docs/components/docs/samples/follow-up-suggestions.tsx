"use client";

import type { FC, PropsWithChildren } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
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
  text: "Start by mapping the first-run path, then add a few suggested prompts that help users discover the highest-value workflows. Keep the empty state focused on one clear action.",
};

const messages = [
  userMessage,
  assistantMessage,
] satisfies readonly DemoMessage[];

const suggestions = [
  { prompt: "Draft three onboarding prompts" },
  { prompt: "Turn this into a checklist" },
  { prompt: "Write copy for the welcome screen" },
  { prompt: "Show me a better empty state" },
  { prompt: "Which metrics show onboarding is working?" },
  { prompt: "Compare a guided tour vs. suggested prompts" },
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

const SampleComposer = () => (
  <ComposerPrimitive.Root className="border-border bg-background dark:border-muted-foreground/15 relative flex w-full flex-col rounded-3xl border shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)]">
    <ComposerPrimitive.Input
      placeholder="Reply..."
      className="field-sizing-content min-h-10 w-full resize-none bg-transparent px-5 pt-3.5 pb-2.5 text-sm leading-relaxed focus:outline-none"
      rows={1}
    />
    <div className="flex items-center justify-end px-3 pb-3">
      <ComposerPrimitive.Send className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30">
        <ArrowUpIcon className="size-4" />
      </ComposerPrimitive.Send>
    </div>
  </ComposerPrimitive.Root>
);

export const FollowUpSuggestionsSample = () => {
  return (
    <SampleFrame className="bg-muted/40 flex h-auto items-center justify-center p-6">
      <FollowUpSuggestionsRuntimeProvider>
        <div className="bg-background flex w-full max-w-2xl flex-col rounded-xl border p-4 shadow-sm">
          <div className="flex justify-end">
            <div className="bg-muted max-w-[80%] rounded-2xl px-3.5 py-2 text-sm">
              {userMessage.text}
            </div>
          </div>
          <div className="mt-4 max-w-[85%] text-sm leading-relaxed">
            {assistantMessage.text}
          </div>
          <div className="mt-5">
            <ThreadFollowupSuggestions />
          </div>
          <div className="mt-3">
            <SampleComposer />
          </div>
        </div>
      </FollowUpSuggestionsRuntimeProvider>
    </SampleFrame>
  );
};
