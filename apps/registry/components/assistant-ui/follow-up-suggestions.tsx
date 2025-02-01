"use client";

import { useThread, ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";

export const ThreadFollowupSuggestions: FC = () => {
  const suggestions = useThread((t) => t.suggestions);
  return (
    <ThreadPrimitive.If empty={false} running={false}>
      <div className="aui-thread-followup-suggestions">
        {suggestions?.map((suggestion, idx) => (
          <ThreadPrimitive.Suggestion
            key={idx}
            className="aui-thread-followup-suggestion"
            prompt={suggestion.prompt}
            method="replace"
            autoSend
          >
            {suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </ThreadPrimitive.If>
  );
};
