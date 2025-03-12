import React, { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { ThreadPrimitive } from "@assistant-ui/react";

const ThreadSuggestion: FC<PropsWithChildren<{ prompt: string }>> = ({
  prompt,
  children,
}) => {
  return (
    <ThreadPrimitive.Suggestion
      prompt={prompt}
      method="replace"
      autoSend
      asChild
    >
      <Button variant="outline" className="h-12 flex-1">
        {children}
      </Button>
    </ThreadPrimitive.Suggestion>
  );
};

export default ThreadSuggestion;
