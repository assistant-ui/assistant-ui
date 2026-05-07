import { ExternalLink } from 'lucide-react';
import type { useAugmentAssistantRuntime } from '@/components/agent-playground/runtime/useAugmentAssistantRuntime';
import type { Template } from '@/components/agent-playground/lib/templates';
import { ErrorMessage } from '../chat/ErrorMessage';
import { InitialMessageSender } from '../chat/InitialMessageSender';
import { Thread } from '../thread';

export function PlaygroundChatPane({
  runtimeState,
  initialPrompt,
  templateBanner,
}: {
  runtimeState: ReturnType<typeof useAugmentAssistantRuntime>;
  initialPrompt?: string | null | undefined;
  templateBanner?: Template | null | undefined;
}) {
  const hasMessages = runtimeState.messages.length > 0;

  return (
    <div data-slot="playground-chat-pane" className="flex h-full min-h-0 flex-col bg-background">
      {templateBanner && (
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <span>New chat started from template</span>
          {templateBanner.previewUrl ? (
            <a
              href={templateBanner.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              {templateBanner.title}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="font-medium text-foreground">{templateBanner.title}</span>
          )}
        </div>
      )}
      <div className="px-4 pt-4">
        <ErrorMessage message={runtimeState.lastError} />
      </div>
      <div className="min-h-0 flex-1">
        <InitialMessageSender initialPrompt={initialPrompt ?? null} />
        <Thread
          approvals={runtimeState.pendingApprovals}
          followUps={runtimeState.pendingFollowUps}
          onApprovalDecision={runtimeState.approveTool}
          workspaceEnvRequests={runtimeState.pendingWorkspaceEnvRequests}
          onWorkspaceEnvSubmit={runtimeState.submitWorkspaceEnv}
          onWorkspaceEnvContinueWithout={runtimeState.continueWithoutWorkspaceEnv}
          hideWelcome={!!initialPrompt || runtimeState.isRunning || hasMessages || !!templateBanner}
        />
      </div>
    </div>
  );
}
