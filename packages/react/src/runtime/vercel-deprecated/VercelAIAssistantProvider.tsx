"use client";

import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import type { FC, PropsWithChildren } from "react";
import { AssistantRuntimeProvider } from "../../context/providers/AssistantRuntimeProvider";
import {
  useVercelUseAssistantRuntime,
  useVercelUseChatRuntime,
} from "../vercel-ai";

type VercelUseChatRuntimeProps = PropsWithChildren<{
  chat: UseChatHelpers;
}>;

const VercelUseChatRuntimeProvider: FC<VercelUseChatRuntimeProps> = ({
  chat,
  children,
}) => {
  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

type VercelUseAssistantRuntimeProps = PropsWithChildren<{
  assistant: UseAssistantHelpers;
}>;

const VercelUseAssistantRuntimeProvider: FC<VercelUseAssistantRuntimeProps> = ({
  assistant,
  children,
}) => {
  const runtime = useVercelUseAssistantRuntime(assistant);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

/**
 * @deprecated Will be removed in 0.1.0.
 */
export type VercelAIAssistantProviderProps = PropsWithChildren<
  | {
      chat: UseChatHelpers;
    }
  | {
      assistant: UseAssistantHelpers;
    }
>;

/**
 * @deprecated `const runtime = useVercelUseChatRuntime(chat)` and `<AssistantRuntimeProvider runtime={...} />`. Will be removed in 0.1.0.
 */
export const VercelAIAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  children,
  ...rest
}) => {
  if ("chat" in rest) {
    return (
      <VercelUseChatRuntimeProvider chat={rest.chat}>
        {children}
      </VercelUseChatRuntimeProvider>
    );
  }

  return (
    <VercelUseAssistantRuntimeProvider assistant={rest.assistant}>
      {children}
    </VercelUseAssistantRuntimeProvider>
  );
};
