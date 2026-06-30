import type {
  MessageStatus,
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
} from "../../types/message";
import { generateId } from "../../utils/id";

type AssistantMetadata = ThreadAssistantMessage["metadata"];

export type CreateThreadAssistantMessageOptions = {
  readonly id?: string | undefined;
  readonly createdAt?: Date | undefined;
  readonly content?: readonly ThreadAssistantMessagePart[] | undefined;
  readonly status?: MessageStatus | undefined;
  readonly metadata?: Partial<AssistantMetadata> | undefined;
};

export const createThreadAssistantMessage = ({
  id = generateId(),
  createdAt = new Date(),
  content = [],
  status = { type: "running" },
  metadata,
}: CreateThreadAssistantMessageOptions = {}): ThreadAssistantMessage => ({
  id,
  role: "assistant",
  content,
  status,
  createdAt,
  metadata: {
    unstable_state: metadata?.unstable_state ?? null,
    unstable_annotations: metadata?.unstable_annotations ?? [],
    unstable_data: metadata?.unstable_data ?? [],
    steps: metadata?.steps ?? [],
    custom: metadata?.custom ?? {},
    ...(metadata?.timing !== undefined && { timing: metadata.timing }),
    ...(metadata?.submittedFeedback !== undefined && {
      submittedFeedback: metadata.submittedFeedback,
    }),
    ...(metadata?.isOptimistic === true && { isOptimistic: true }),
  },
});
