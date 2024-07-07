import React, { FC, PropsWithChildren, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ThreadPrimitive } from "@assistant-ui/react";
import { useLastAssistantMessage } from "./LastMessageHook";
import { generate } from './actions';
import { readStreamableValue } from 'ai/rsc';

const AI_ThreadSuggestion: FC<PropsWithChildren<{}>> = ({ children }) => {
  const lastAssistantMessage = useLastAssistantMessage();
  const [output, setOutput] = useState<string | null>(null);
  const [output2, setOutput2] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    const lastMessageContent = lastAssistantMessage?.content;
    const lastMessageString = JSON.stringify(lastMessageContent);
    console.log('LM:', lastMessageString);

    const [response1, response2] = await Promise.all([
      generate(`Generate a optimistic very very short one sentence follow up question based on this response: ${lastMessageString}`),
      generate(`Generate a very skeptical very very short one sentence follow up question based on this response: ${lastMessageString}`)
    ]);

    let generatedOutput = '';
    for await (const delta of readStreamableValue(response1.output)) {
      generatedOutput += delta;
    }
    console.log(generatedOutput);
    setOutput(generatedOutput);

    let generatedOutput2 = '';
    for await (const delta of readStreamableValue(response2.output)) {
      generatedOutput2 += delta;
    }
    console.log(generatedOutput2);
    setOutput2(generatedOutput2);
  }, [lastAssistantMessage]);

  useEffect(() => {
    if (lastAssistantMessage) {
      handleClick();
    }
  }, [lastAssistantMessage, handleClick]);

  return (
    <div className="flex w-full space-x-2">
      <ThreadPrimitive.Suggestion prompt={output || ''} method="replace" autoSend asChild>
        <Button
          variant="outline"
          className="flex-1 h-auto p-2"
          onClick={handleClick}
          style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
        >
          {output || children}
        </Button>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion prompt={output2 || ''} method="replace" autoSend asChild>
        <Button
          variant="outline"
          className="flex-1 h-auto p-2"
          onClick={handleClick}
          style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
        >
          {output2 || children}
        </Button>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

export default AI_ThreadSuggestion;