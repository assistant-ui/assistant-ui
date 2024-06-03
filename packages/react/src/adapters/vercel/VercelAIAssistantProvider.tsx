"use client";

import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { type FC, type PropsWithChildren, useMemo } from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";
import { useVercelAIThreadState } from "./useVercelAIThreadState";

export type VercelAIAssistantProviderProps = PropsWithChildren<
  | {
      chat: UseChatHelpers;
    }
  | {
      assistant: UseAssistantHelpers;
    }
>;

export const VercelAIAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  children,
  ...rest
}) => {
  const context = useDummyAIAssistantContext();

  const vercel = "chat" in rest ? rest.chat : rest.assistant;

  // -- useThread sync --

  const threadState = useVercelAIThreadState(vercel);

  useMemo(() => {
    context.useThread.setState(threadState, true);
  }, [context, threadState]);

  // -- useComposer sync --

  useMemo(() => {
    context.useComposer.setState({
      value: vercel.input,
      setValue: vercel.setInput,
    });
  }, [context, vercel.input, vercel.setInput]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
