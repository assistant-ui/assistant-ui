import { AssistantRuntimeProvider } from '@assistant-ui/react';
import type { ReactNode } from 'react';
import { useAugmentAssistantRuntime } from './useAugmentAssistantRuntime';
import { ToolUIs } from '@/components/agent-playground/tools/ToolUIs';
import { ToolActionProvider } from './ToolActionContext';

export function AugmentRuntimeProvider({
  children,
}: {
  children: (runtimeState: ReturnType<typeof useAugmentAssistantRuntime>) => ReactNode;
}) {
  const runtimeState = useAugmentAssistantRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtimeState.runtime}>
      <ToolActionProvider
        value={{
          approveTool: runtimeState.approveTool,
          respondToQuestion: runtimeState.respondToQuestion,
          respondToToolSuspension: runtimeState.respondToToolSuspension,
        }}
      >
        <ToolUIs />
        {children(runtimeState)}
      </ToolActionProvider>
    </AssistantRuntimeProvider>
  );
}
