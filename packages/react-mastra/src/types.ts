import type {
  GetWorkflowRunByIdResponse,
  MastraClient,
  WorkflowRunResult,
} from "@mastra/client-js";
import type { WorkflowRunStatus } from "@mastra/core/workflows";
import type { ThreadMessage } from "@assistant-ui/react";
import type { ChatTransport, UIMessage } from "ai";
import type { UseChatRuntimeOptions } from "@assistant-ui/react-ai-sdk";
import type { createMastraChatTransport } from "./createMastraChatTransport";

export type MastraTitleGenerator = (
  messages: readonly ThreadMessage[],
) => string | Promise<string>;

export type MastraThreadListOptions = {
  client: MastraClient;
  agentId: string;
  resourceId: string;
  perPage?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
  titleGenerator?: MastraTitleGenerator | undefined;
};

export type MastraChatTransportOptions<
  UI_MESSAGE extends UIMessage = UIMessage,
> = NonNullable<
  ConstructorParameters<
    typeof import("@assistant-ui/react-ai-sdk").AssistantChatTransport<UI_MESSAGE>
  >[0]
> & {
  resourceId: string;
};

export type UseMastraRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<UseChatRuntimeOptions<UI_MESSAGE>, "cloud" | "transport"> &
    MastraThreadListOptions & {
      threadId?: string | undefined;
      transport?: ChatTransport<UI_MESSAGE> | undefined;
      transportOptions?: Omit<
        Parameters<typeof createMastraChatTransport<UI_MESSAGE>>[0],
        "resourceId"
      >;
    };

export type MastraSuspendedStep<TPayload = unknown> = {
  stepId: string;
  path: string[];
  forEachIndex?: number | undefined;
  payload: TPayload;
};

export type MastraWorkflowState<TResult = unknown, TSuspend = unknown> = {
  runId: string | undefined;
  status: "idle" | WorkflowRunStatus;
  result: TResult | undefined;
  error: Error | undefined;
  suspendedSteps: MastraSuspendedStep<TSuspend>[];
  raw: WorkflowRunResult | GetWorkflowRunByIdResponse | undefined;
};

export type UseMastraWorkflowOptions<TResult = unknown, TSuspend = unknown> = {
  client: MastraClient;
  workflowId: string;
  runId?: string | undefined;
  resourceId?: string | undefined;
  requestContext?: Record<string, unknown> | undefined;
  onRunIdChange?: ((runId: string) => void) | undefined;
  onStateChange?:
    | ((state: MastraWorkflowState<TResult, TSuspend>) => void)
    | undefined;
};

export type MastraWorkflowStartOptions = {
  initialState?: Record<string, unknown> | undefined;
  requestContext?: Record<string, unknown> | undefined;
};

export type MastraWorkflowResumeOptions = {
  forEachIndex?: number | undefined;
  requestContext?: Record<string, unknown> | undefined;
};
