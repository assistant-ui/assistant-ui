import { v4 as uuidv4 } from "uuid";
import type { MessageStatus } from "@assistant-ui/core";
import type {
  AdkEvent,
  AdkEventPart,
  AdkMessage,
  AdkMessageContentPart,
  AdkToolCall,
  AdkToolConfirmation,
  AdkAuthRequest,
  AdkMessageMetadata,
} from "./types";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

type InProgressMessage = AdkMessage & { type: "ai" };

const ADK_REQUEST_CONFIRMATION = "adk_request_confirmation";
const ADK_REQUEST_CREDENTIAL = "adk_request_credential";

/**
 * Checks if an event is a final response using the same logic as ADK's
 * `isFinalResponse()`.
 */
export const isFinalResponse = (event: AdkEvent): boolean => {
  if (
    event.actions?.skipSummarization ||
    (event.longRunningToolIds && event.longRunningToolIds.length > 0)
  ) {
    return true;
  }

  const parts = event.content?.parts;
  return (
    !event.partial &&
    (parts?.length ?? 0) > 0 &&
    !parts!.some((p) => p.functionCall) &&
    !parts!.some((p) => p.functionResponse) &&
    !parts![parts!.length - 1]?.codeExecutionResult
  );
};

const CONTENT_FILTER_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "LANGUAGE",
  "IMAGE_SAFETY",
  "IMAGE_RECITATION",
  "IMAGE_OTHER",
  "IMAGE_PROHIBITED_CONTENT",
]);

const ERROR_REASONS = new Set([
  "MALFORMED_FUNCTION_CALL",
  "UNEXPECTED_TOOL_CALL",
]);

const finishReasonToStatus = (
  finishReason: string | undefined,
): MessageStatus => {
  if (finishReason === "MAX_TOKENS") {
    return { type: "incomplete", reason: "length" };
  }
  if (finishReason && CONTENT_FILTER_REASONS.has(finishReason)) {
    return {
      type: "incomplete",
      reason: "content-filter",
      error: `Content filtered: ${finishReason}`,
    };
  }
  if (finishReason && ERROR_REASONS.has(finishReason)) {
    return {
      type: "incomplete",
      reason: "error",
      error: `LLM error: ${finishReason}`,
    };
  }
  return { type: "complete", reason: "stop" };
};

// ── Snake_case normalization ──

const normalizeEventPart = (part: AdkEventPart): AdkEventPart => {
  const p = part as Record<string, unknown>;
  const result: Record<string, unknown> = { ...p };
  if ("function_call" in p && !("functionCall" in p))
    result.functionCall = p.function_call;
  if ("function_response" in p && !("functionResponse" in p))
    result.functionResponse = p.function_response;
  if ("inline_data" in p && !("inlineData" in p))
    result.inlineData = p.inline_data;
  if ("file_data" in p && !("fileData" in p)) result.fileData = p.file_data;
  if ("executable_code" in p && !("executableCode" in p))
    result.executableCode = p.executable_code;
  if ("code_execution_result" in p && !("codeExecutionResult" in p))
    result.codeExecutionResult = p.code_execution_result;
  return result as AdkEventPart;
};

const normalizeEvent = (event: AdkEvent): AdkEvent => {
  const e = event as Record<string, unknown>;
  const result: Record<string, unknown> = { ...e };
  if ("error_code" in e && !("errorCode" in e)) result.errorCode = e.error_code;
  if ("error_message" in e && !("errorMessage" in e))
    result.errorMessage = e.error_message;
  if ("long_running_tool_ids" in e && !("longRunningToolIds" in e))
    result.longRunningToolIds = e.long_running_tool_ids;
  if ("turn_complete" in e && !("turnComplete" in e))
    result.turnComplete = e.turn_complete;
  if ("finish_reason" in e && !("finishReason" in e))
    result.finishReason = e.finish_reason;
  if ("invocation_id" in e && !("invocationId" in e))
    result.invocationId = e.invocation_id;
  if ("custom_metadata" in e && !("customMetadata" in e))
    result.customMetadata = e.custom_metadata;
  if ("grounding_metadata" in e && !("groundingMetadata" in e))
    result.groundingMetadata = e.grounding_metadata;
  if ("citation_metadata" in e && !("citationMetadata" in e))
    result.citationMetadata = e.citation_metadata;
  if ("usage_metadata" in e && !("usageMetadata" in e))
    result.usageMetadata = e.usage_metadata;

  if (result.actions) {
    const a = result.actions as Record<string, unknown>;
    const na: Record<string, unknown> = { ...a };
    if ("state_delta" in a && !("stateDelta" in a))
      na.stateDelta = a.state_delta;
    if ("artifact_delta" in a && !("artifactDelta" in a))
      na.artifactDelta = a.artifact_delta;
    if ("transfer_to_agent" in a && !("transferToAgent" in a))
      na.transferToAgent = a.transfer_to_agent;
    if ("skip_summarization" in a && !("skipSummarization" in a))
      na.skipSummarization = a.skip_summarization;
    if ("requested_auth_configs" in a && !("requestedAuthConfigs" in a))
      na.requestedAuthConfigs = a.requested_auth_configs;
    if (
      "requested_tool_confirmations" in a &&
      !("requestedToolConfirmations" in a)
    )
      na.requestedToolConfirmations = a.requested_tool_confirmations;
    result.actions = na;
  }

  if (result.content && (result.content as Record<string, unknown>).parts) {
    const content = result.content as Record<string, unknown>;
    const parts = content.parts as AdkEventPart[];
    result.content = { ...content, parts: parts.map(normalizeEventPart) };
  }

  return result as AdkEvent;
};

// ── Accumulator ──

export class AdkEventAccumulator {
  private messagesMap = new Map<string, AdkMessage>();
  private currentMessageId: string | null = null;
  private partialTextBuffer = "";
  private partialReasoningBuffer = "";
  private accumulatedStateDelta: Record<string, unknown> = {};
  private accumulatedArtifactDelta: Record<string, number> = {};
  private lastAgentInfo: {
    name?: string | undefined;
    branch?: string | undefined;
  } = {};
  private lastTransferToAgent: string | undefined;
  private pendingLongRunningToolIds: string[] = [];
  private toolConfirmations: AdkToolConfirmation[] = [];
  private authRequests: AdkAuthRequest[] = [];
  private escalated = false;
  private messageMetadataMap = new Map<string, AdkMessageMetadata>();
  constructor(initialMessages?: AdkMessage[]) {
    if (initialMessages) {
      for (const msg of initialMessages) {
        this.messagesMap.set(msg.id, msg);
      }
    }
  }

  processEvent(rawEvent: AdkEvent): AdkMessage[] {
    const event = normalizeEvent(rawEvent);

    // Accumulate state delta
    if (event.actions?.stateDelta) {
      Object.assign(this.accumulatedStateDelta, event.actions.stateDelta);
    }

    // Accumulate artifact delta
    if (event.actions?.artifactDelta) {
      Object.assign(this.accumulatedArtifactDelta, event.actions.artifactDelta);
    }

    // Track escalation
    if (event.actions?.escalate) {
      this.escalated = true;
    }

    // Track agent transfer
    if (event.actions?.transferToAgent) {
      this.lastTransferToAgent = event.actions.transferToAgent;
    }

    // Track long-running tool IDs
    if (event.longRunningToolIds?.length) {
      this.pendingLongRunningToolIds = event.longRunningToolIds;
    }

    // Track tool confirmations from actions
    if (event.actions?.requestedToolConfirmations) {
      for (const [tcId, conf] of Object.entries(
        event.actions.requestedToolConfirmations,
      )) {
        const c = conf as Record<string, unknown>;
        this.toolConfirmations.push({
          toolCallId: tcId,
          toolName: "",
          args: {},
          hint: (c.hint as string) ?? "",
          confirmed: false,
          payload: c.payload,
        });
      }
    }

    // Track auth requests from actions
    if (event.actions?.requestedAuthConfigs) {
      for (const [tcId, authConf] of Object.entries(
        event.actions.requestedAuthConfigs,
      )) {
        this.authRequests.push({ toolCallId: tcId, authConfig: authConf });
      }
    }

    // Track agent info
    if (event.author && event.author !== "user") {
      this.lastAgentInfo = {
        name: event.author ?? undefined,
        branch: event.branch ?? undefined,
      };
    }

    // Handle interrupted events
    if (event.interrupted) {
      if (this.currentMessageId) {
        const msg = this.messagesMap.get(this.currentMessageId);
        if (msg && msg.type === "ai" && !msg.status) {
          const updated: InProgressMessage = {
            ...msg,
            content: [...this.getContentArray(msg)],
            status: { type: "incomplete", reason: "cancelled" },
          };
          this.messagesMap.set(updated.id, updated);
        }
      }
      this.finalizeCurrentMessage();
      return this.getMessages();
    }

    // Handle error events
    if (event.errorCode || event.errorMessage) {
      this.finalizeCurrentMessage();
      const errorMsg = this.getOrCreateAiMessage(event);
      const errorText =
        event.errorMessage ?? event.errorCode ?? "Unknown error";
      const updated: InProgressMessage = {
        ...errorMsg,
        content: [
          ...this.getContentArray(errorMsg),
          { type: "text", text: errorText },
        ],
        status: { type: "incomplete", reason: "error", error: errorText },
      };
      this.messagesMap.set(updated.id, updated);
      this.currentMessageId = null;
      return this.getMessages();
    }

    const parts = event.content?.parts;
    if (!parts?.length) {
      // Track metadata even for content-less events (e.g. turnComplete)
      this.trackMessageMetadata(event);
      return this.getMessages();
    }

    // User-authored events → create human message, not AI.
    // Without this, user events fall through to processPart →
    // getOrCreateAiMessage, producing type:"ai" messages that
    // convertAdkMessage maps to role:"assistant".
    if (event.author === "user") {
      this.finalizeCurrentMessage();
      const humanParts: AdkMessageContentPart[] = [];
      for (const part of parts) {
        if (part.text != null && !part.thought) {
          humanParts.push({ type: "text", text: part.text });
        } else if (part.inlineData) {
          humanParts.push({
            type: "image",
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
          });
        } else if (part.fileData) {
          humanParts.push({
            type: "image_url",
            url: part.fileData.fileUri,
          });
        }
      }
      if (humanParts.length > 0) {
        const id = event.id ?? uuidv4();
        const first = humanParts[0];
        const content: string | AdkMessageContentPart[] =
          humanParts.length === 1 && first?.type === "text"
            ? first.text
            : humanParts;
        this.messagesMap.set(id, { id, type: "human", content });
      }
      return this.getMessages();
    }

    // If author changed, finalize previous message
    if (this.currentMessageId && event.author && event.author !== "user") {
      const current = this.messagesMap.get(this.currentMessageId);
      if (current && current.type === "ai" && current.author !== event.author) {
        this.finalizeCurrentMessage();
      }
    }

    for (const part of parts) {
      this.processPart(part, event);
    }

    // Track per-message metadata (grounding, citation, usage)
    this.trackMessageMetadata(event);

    // Check isFinalResponse (can be true even for partial events via skipSummarization/longRunningToolIds)
    if (isFinalResponse(event) && this.currentMessageId) {
      const msg = this.messagesMap.get(this.currentMessageId);
      if (msg && msg.type === "ai" && !msg.status) {
        const status = finishReasonToStatus(event.finishReason);
        const updated: InProgressMessage = {
          ...msg,
          content: [...this.getContentArray(msg)],
          status,
        };
        this.messagesMap.set(updated.id, updated);
      }
    }

    // Non-partial event finalizes the current message
    if (!event.partial || isFinalResponse(event)) {
      this.finalizeCurrentMessage();
    }

    return this.getMessages();
  }

  private processPart(part: AdkEventPart, event: AdkEvent): void {
    // Detect special ADK function calls
    if (part.functionCall && !event.partial) {
      const name = part.functionCall.name;

      // Tool confirmation request
      if (name === ADK_REQUEST_CONFIRMATION) {
        const callArgs = part.functionCall.args;
        // ADK JS: args keys are "originalFunctionCall" and "toolConfirmation"
        // ADK Python: args keys are "original_function_call" and "tool_confirmation"
        const original =
          (callArgs.originalFunctionCall as Record<string, unknown>) ??
          (callArgs.original_function_call as Record<string, unknown>);
        const conf =
          (callArgs.toolConfirmation as Record<string, unknown>) ??
          (callArgs.tool_confirmation as Record<string, unknown>);
        this.toolConfirmations.push({
          toolCallId: part.functionCall.id ?? "",
          toolName: (original?.name as string) ?? "",
          args: (original?.args as Record<string, unknown>) ?? {},
          hint: (conf?.hint as string) ?? "",
          confirmed: false,
          payload: conf?.payload,
        });
      }

      // Auth credential request
      if (name === ADK_REQUEST_CREDENTIAL) {
        const credArgs = part.functionCall.args;
        // ADK JS: args keys are "function_call_id" and "auth_config"
        const originalToolCallId =
          (credArgs.function_call_id as string) ?? part.functionCall.id ?? "";
        const authConfig = credArgs.auth_config ?? credArgs;
        this.authRequests.push({
          toolCallId: originalToolCallId,
          authConfig,
        });
      }
    }

    // Text with thought=true → reasoning (accumulated)
    if (part.text != null && part.thought) {
      const msg = this.getOrCreateAiMessage(event);
      if (event.partial) {
        this.partialReasoningBuffer += part.text;
        this.replaceLastReasoningContent(msg, this.partialReasoningBuffer);
      } else {
        this.partialReasoningBuffer = "";
        this.replaceLastReasoningContent(msg, part.text);
      }
      return;
    }

    // Regular text
    if (part.text != null) {
      const msg = this.getOrCreateAiMessage(event);
      if (event.partial) {
        this.partialTextBuffer += part.text;
        this.replaceLastTextContent(msg, this.partialTextBuffer);
      } else {
        this.partialTextBuffer = "";
        this.replaceLastTextContent(msg, part.text);
      }
      return;
    }

    // Function call — skip partial events (args may be incomplete)
    if (part.functionCall) {
      if (event.partial) return;
      const msg = this.getOrCreateAiMessage(event);
      const toolCall: AdkToolCall = {
        id: part.functionCall.id ?? uuidv4(),
        name: part.functionCall.name,
        args: part.functionCall.args as ReadonlyJSONObject,
        argsText: JSON.stringify(part.functionCall.args),
      };
      const existing = [...(msg.tool_calls ?? [])];
      const idx = existing.findIndex((tc) => tc.id === toolCall.id);
      if (idx >= 0) {
        existing[idx] = toolCall;
      } else {
        existing.push(toolCall);
      }
      const updated: InProgressMessage = {
        ...msg,
        content: [...this.getContentArray(msg)],
        tool_calls: existing,
      };
      this.messagesMap.set(updated.id, updated);
      return;
    }

    // Function response → tool message
    if (part.functionResponse) {
      this.finalizeCurrentMessage();
      const toolMsg: AdkMessage = {
        id: uuidv4(),
        type: "tool",
        tool_call_id: part.functionResponse.id ?? "",
        name: part.functionResponse.name,
        content: JSON.stringify(part.functionResponse.response),
        status: "success",
      };
      this.messagesMap.set(toolMsg.id, toolMsg);
      return;
    }

    // Executable code
    if (part.executableCode) {
      const msg = this.getOrCreateAiMessage(event);
      this.appendContent(msg, {
        type: "code",
        code: part.executableCode.code,
        language: part.executableCode.language ?? "python",
      });
      return;
    }

    // Code execution result
    if (part.codeExecutionResult) {
      const msg = this.getOrCreateAiMessage(event);
      this.appendContent(msg, {
        type: "code_result",
        output: part.codeExecutionResult.output,
        outcome: part.codeExecutionResult.outcome ?? "OUTCOME_OK",
      });
      return;
    }

    // Inline data (images etc)
    if (part.inlineData) {
      const msg = this.getOrCreateAiMessage(event);
      this.appendContent(msg, {
        type: "image",
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data,
      });
      return;
    }

    // File data (URI reference)
    if (part.fileData) {
      const msg = this.getOrCreateAiMessage(event);
      this.appendContent(msg, {
        type: "image_url",
        url: part.fileData.fileUri,
      });
    }
  }

  private trackMessageMetadata(event: AdkEvent): void {
    if (
      !this.currentMessageId ||
      (!event.groundingMetadata &&
        !event.citationMetadata &&
        !event.usageMetadata)
    )
      return;

    const existing = this.messageMetadataMap.get(this.currentMessageId) ?? {};
    const updated: AdkMessageMetadata = { ...existing };
    if (event.groundingMetadata)
      updated.groundingMetadata = event.groundingMetadata;
    if (event.citationMetadata)
      updated.citationMetadata = event.citationMetadata;
    if (event.usageMetadata) updated.usageMetadata = event.usageMetadata;
    this.messageMetadataMap.set(this.currentMessageId, updated);
  }

  private getContentArray(msg: AdkMessage): AdkMessageContentPart[] {
    return Array.isArray(msg.content)
      ? (msg.content as AdkMessageContentPart[])
      : [];
  }

  private getOrCreateAiMessage(event: AdkEvent): InProgressMessage {
    if (this.currentMessageId) {
      const existing = this.messagesMap.get(this.currentMessageId);
      if (existing && existing.type === "ai") {
        return existing;
      }
    }

    const id = uuidv4();
    const msg: InProgressMessage = {
      id,
      type: "ai",
      content: [] as AdkMessageContentPart[],
      ...(event.author != null && { author: event.author }),
      ...(event.branch != null && { branch: event.branch }),
    };
    this.messagesMap.set(id, msg);
    this.currentMessageId = id;
    this.partialTextBuffer = "";
    this.partialReasoningBuffer = "";
    return msg;
  }

  private appendContent(
    msg: InProgressMessage,
    part: AdkMessageContentPart,
  ): void {
    const content = [...this.getContentArray(msg), part];
    const updated: InProgressMessage = { ...msg, content };
    this.messagesMap.set(updated.id, updated);
  }

  private replaceLastTextContent(msg: InProgressMessage, text: string): void {
    const content = [...this.getContentArray(msg)];
    const lastTextIdx = content.findLastIndex((p) => p.type === "text");
    if (lastTextIdx >= 0) {
      content[lastTextIdx] = { type: "text", text };
    } else {
      content.push({ type: "text", text });
    }
    const updated: InProgressMessage = { ...msg, content };
    this.messagesMap.set(updated.id, updated);
  }

  private replaceLastReasoningContent(
    msg: InProgressMessage,
    text: string,
  ): void {
    const content = [...this.getContentArray(msg)];
    const lastIdx = content.findLastIndex((p) => p.type === "reasoning");
    if (lastIdx >= 0) {
      content[lastIdx] = { type: "reasoning", text };
    } else {
      content.push({ type: "reasoning", text });
    }
    const updated: InProgressMessage = { ...msg, content };
    this.messagesMap.set(updated.id, updated);
  }

  private finalizeCurrentMessage(): void {
    this.partialTextBuffer = "";
    this.partialReasoningBuffer = "";
    this.currentMessageId = null;
  }

  getMessages(): AdkMessage[] {
    return [...this.messagesMap.values()];
  }

  getStateDelta(): Record<string, unknown> {
    return { ...this.accumulatedStateDelta };
  }

  getArtifactDelta(): Record<string, number> {
    return { ...this.accumulatedArtifactDelta };
  }

  getAgentInfo(): { name?: string | undefined; branch?: string | undefined } {
    return { ...this.lastAgentInfo };
  }

  getLastTransferToAgent(): string | undefined {
    return this.lastTransferToAgent;
  }

  getLongRunningToolIds(): string[] {
    return [...this.pendingLongRunningToolIds];
  }

  getToolConfirmations(): AdkToolConfirmation[] {
    return [...this.toolConfirmations];
  }

  getAuthRequests(): AdkAuthRequest[] {
    return [...this.authRequests];
  }

  isEscalated(): boolean {
    return this.escalated;
  }

  getMessageMetadata(): Map<string, AdkMessageMetadata> {
    return new Map(this.messageMetadataMap);
  }
}
