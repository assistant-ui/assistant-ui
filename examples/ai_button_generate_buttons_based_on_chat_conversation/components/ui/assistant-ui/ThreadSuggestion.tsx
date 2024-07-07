import React, { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { ThreadPrimitive } from "@assistant-ui/react";

const ThreadSuggestion: FC<PropsWithChildren<{ prompt: string }>> = ({ prompt, children }) => {
  return (
    <ThreadPrimitive.Suggestion prompt={prompt} method="replace" autoSend asChild>
      <Button variant="outline" className="flex-1 h-12">
        {children}
      </Button>
    </ThreadPrimitive.Suggestion>
  );
};

export default ThreadSuggestion;