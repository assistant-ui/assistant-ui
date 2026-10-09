import type {
  RespondToToolApprovalOptions,
  ThreadMessage,
  Unstable_ToolInteractionLog,
} from "@assistant-ui/core";
import { isRecord, readToolInteractionLog } from "@assistant-ui/core/internal";
import { normalizeToolApprovalAnswers } from "../converters/toolApprovalAnswers";

const TOOL_ARTIFACTS_METADATA_KEY = "__aui_toolArtifacts";
const TOOL_INTERACTIONS_METADATA_KEY = "__aui_toolInteractions";
const TOOL_APPROVAL_RESPONSES_METADATA_KEY = "__aui_toolApprovalResponses";

export type StoredToolApprovalResponse = Omit<
  RespondToToolApprovalOptions,
  "approvalId"
>;

export const collectToolArtifacts = (
  message: ThreadMessage,
  toolArtifacts: ReadonlyMap<string, unknown> | undefined,
) => {
  if (!toolArtifacts) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call") return [];
    const artifact = toolArtifacts.get(part.toolCallId);
    return artifact === undefined ? [] : [[part.toolCallId, artifact] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const collectToolInteractions = (
  message: ThreadMessage,
  toolInteractions:
    | ReadonlyMap<string, Unstable_ToolInteractionLog>
    | undefined,
) => {
  if (!toolInteractions) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call") return [];
    const interactions = toolInteractions.get(part.toolCallId);
    return interactions === undefined
      ? []
      : [[part.toolCallId, interactions] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const collectToolApprovalResponses = (
  message: ThreadMessage,
  toolApprovalResponses:
    | ReadonlyMap<string, RespondToToolApprovalOptions>
    | undefined,
) => {
  if (!toolApprovalResponses) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call" || !part.approval) return [];
    const response = toolApprovalResponses.get(part.approval.id);
    if (!response) return [];
    return [
      [
        part.approval.id,
        {
          approved: response.approved,
          ...(response.optionId != null && { optionId: response.optionId }),
          ...(response.text != null && { text: response.text }),
          ...(response.answers != null && { answers: response.answers }),
          ...(response.reason != null && { reason: response.reason }),
        },
      ] as const,
    ];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const addToolData = <TMessage>(
  message: TMessage,
  toolArtifacts: Record<string, unknown> | undefined,
  toolInteractions: Record<string, Unstable_ToolInteractionLog> | undefined,
  toolApprovalResponses: Record<string, StoredToolApprovalResponse> | undefined,
): TMessage => {
  if (
    (!toolArtifacts && !toolInteractions && !toolApprovalResponses) ||
    !isRecord(message) ||
    !Array.isArray(message.parts)
  )
    return message;
  const toolCallIds = message.parts.flatMap((part) => {
    if (!isRecord(part) || typeof part.toolCallId !== "string") return [];
    return [part.toolCallId];
  });
  const artifacts = toolArtifacts
    ? Object.fromEntries(
        toolCallIds.flatMap((toolCallId) =>
          Object.hasOwn(toolArtifacts, toolCallId)
            ? [[toolCallId, toolArtifacts[toolCallId]] as const]
            : [],
        ),
      )
    : undefined;
  const interactions = toolInteractions
    ? Object.fromEntries(
        toolCallIds.flatMap((toolCallId) =>
          Object.hasOwn(toolInteractions, toolCallId)
            ? [[toolCallId, toolInteractions[toolCallId]] as const]
            : [],
        ),
      )
    : undefined;
  const approvalIds = message.parts.flatMap((part) => {
    if (!isRecord(part) || !isRecord(part.approval)) return [];
    const approvalId = part.approval.id;
    return typeof approvalId === "string" ? [approvalId] : [];
  });
  const approvalResponses = toolApprovalResponses
    ? Object.fromEntries(
        approvalIds.flatMap((approvalId) =>
          Object.hasOwn(toolApprovalResponses, approvalId)
            ? [[approvalId, toolApprovalResponses[approvalId]] as const]
            : [],
        ),
      )
    : undefined;
  const hasArtifacts = !!artifacts && Object.keys(artifacts).length > 0;
  const hasInteractions =
    !!interactions && Object.keys(interactions).length > 0;
  const hasApprovalResponses =
    !!approvalResponses && Object.keys(approvalResponses).length > 0;
  if (!hasArtifacts && !hasInteractions && !hasApprovalResponses)
    return message;
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  return {
    ...message,
    metadata: {
      ...metadata,
      ...(hasArtifacts && { [TOOL_ARTIFACTS_METADATA_KEY]: artifacts }),
      ...(hasInteractions && {
        [TOOL_INTERACTIONS_METADATA_KEY]: interactions,
      }),
      ...(hasApprovalResponses && {
        [TOOL_APPROVAL_RESPONSES_METADATA_KEY]: approvalResponses,
      }),
    },
  } as TMessage;
};

export const restoreToolData = <TMessage>(
  message: TMessage,
  toolArtifacts: Map<string, unknown> | undefined,
  toolInteractions: Map<string, Unstable_ToolInteractionLog> | undefined,
  toolApprovalResponses: Map<string, RespondToToolApprovalOptions> | undefined,
): TMessage => {
  if (!isRecord(message) || !isRecord(message.metadata)) return message;
  const metadata = message.metadata;
  const hasArtifacts = Object.hasOwn(metadata, TOOL_ARTIFACTS_METADATA_KEY);
  const hasInteractions = Object.hasOwn(
    metadata,
    TOOL_INTERACTIONS_METADATA_KEY,
  );
  const hasApprovalResponses = Object.hasOwn(
    metadata,
    TOOL_APPROVAL_RESPONSES_METADATA_KEY,
  );
  if (!hasArtifacts && !hasInteractions && !hasApprovalResponses)
    return message;
  const artifacts = metadata[TOOL_ARTIFACTS_METADATA_KEY];
  if (toolArtifacts && isRecord(artifacts)) {
    for (const [toolCallId, artifact] of Object.entries(artifacts)) {
      toolArtifacts.set(toolCallId, artifact);
    }
  }
  const interactions = metadata[TOOL_INTERACTIONS_METADATA_KEY];
  if (toolInteractions && isRecord(interactions)) {
    for (const [toolCallId, value] of Object.entries(interactions)) {
      const log = readToolInteractionLog(value);
      if (log) toolInteractions.set(toolCallId, log);
    }
  }
  const approvalResponses = metadata[TOOL_APPROVAL_RESPONSES_METADATA_KEY];
  if (toolApprovalResponses && isRecord(approvalResponses)) {
    for (const [approvalId, value] of Object.entries(approvalResponses)) {
      if (!isRecord(value) || typeof value.approved !== "boolean") continue;
      const answers = normalizeToolApprovalAnswers(value.answers);
      toolApprovalResponses.set(approvalId, {
        approvalId,
        approved: value.approved,
        ...(typeof value.optionId === "string" && {
          optionId: value.optionId,
        }),
        ...(typeof value.text === "string" && { text: value.text }),
        ...(answers && Object.keys(answers).length > 0 && { answers }),
        ...(typeof value.reason === "string" && { reason: value.reason }),
      });
    }
  }
  const {
    [TOOL_ARTIFACTS_METADATA_KEY]: _,
    [TOOL_INTERACTIONS_METADATA_KEY]: __,
    [TOOL_APPROVAL_RESPONSES_METADATA_KEY]: ___,
    ...restMetadata
  } = metadata;
  const { metadata: _metadata, ...restMessage } = message;
  return (
    Object.keys(restMetadata).length === 0
      ? restMessage
      : { ...restMessage, metadata: restMetadata }
  ) as TMessage;
};
