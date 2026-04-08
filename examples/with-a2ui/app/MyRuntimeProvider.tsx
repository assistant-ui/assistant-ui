"use client";

import { useCallback, useRef, useEffect, type ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { A2uiProvider } from "@assistant-ui/react-a2ui";
import type { A2uiAction } from "@assistant-ui/react-a2ui";
import { useActionHandler } from "@/components/a2ui/ActionHandler";
import { StyledCard } from "@/components/a2ui/StyledCard";
import { StyledButton } from "@/components/a2ui/StyledButton";
import { StyledTextField } from "@/components/a2ui/StyledTextField";
import { StyledRow } from "@/components/a2ui/StyledRow";
import { StyledText } from "@/components/a2ui/StyledText";
import { StyledDivider } from "@/components/a2ui/StyledDivider";

const customComponents = {
  Card: StyledCard,
  Button: StyledButton,
  TextField: StyledTextField,
  Row: StyledRow,
  Text: StyledText,
  Divider: StyledDivider,
};

function ActionBridge({
  callbackRef,
}: {
  callbackRef: React.MutableRefObject<((a: A2uiAction) => void) | undefined>;
}) {
  const handler = useActionHandler();
  useEffect(() => {
    callbackRef.current = handler;
  }, [handler, callbackRef]);
  return null;
}

export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const runtime = useChatRuntime();
  const actionRef = useRef<((a: A2uiAction) => void) | undefined>(undefined);

  const handleAction = useCallback((action: A2uiAction) => {
    actionRef.current?.(action);
  }, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <A2uiProvider onAction={handleAction} components={customComponents}>
        <ActionBridge callbackRef={actionRef} />
        {children}
      </A2uiProvider>
    </AssistantRuntimeProvider>
  );
}
