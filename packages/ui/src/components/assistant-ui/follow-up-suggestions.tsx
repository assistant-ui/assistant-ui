"use client";

import {
  AssistantIf,
  useAssistantState,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";

export const ThreadFollowupSuggestions: FC = () => {
  const suggestions = useAssistantState(({ thread }) => thread.suggestions);
  return (
    <AssistantIf
      condition={({ thread }) => !thread.isEmpty && !thread.isRunning}
    >
      <div className="aui-thread-followup-suggestions flex min-h-8 items-center justify-center gap-2">
        {suggestions?.map((suggestion, idx) => (
          <ThreadPrimitive.Suggestion
            key={idx}
            className="aui-thread-followup-suggestion rounded-full border bg-background px-3 py-1 text-sm transition-colors ease-in hover:bg-muted/80"
            prompt={suggestion.prompt}
            method="replace"
            autoSend
          >
            {suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </AssistantIf>
  );
};
