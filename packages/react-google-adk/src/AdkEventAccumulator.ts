import { v4 as uuidv4 } from "uuid";
import type {
  AdkEvent,
  AdkEventPart,
  AdkMessage,
  AdkMessageContentPart,
  AdkToolCall,
} from "./types";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

type InProgressMessage = AdkMessage & { type: "ai" };

/**
 * Port of ADK's isFinalResponse logic. A non-partial event is "final" if:
 * - It has no function calls
 * - It has no trailing code execution result
 * - It is not partial
 */
const isFinalResponse = (event: AdkEvent): boolean => {
  if (event.partial) return false;
  const parts = event.content?.parts;
  if (!parts?.length) return false;

  const hasFunctionCalls = parts.some((p) => p.functionCall);
  if (hasFunctionCalls) return false;

  const lastPart = parts[parts.length - 1];
  if (lastPart?.codeExecutionResult) return false;

  // Has actual text or data content
  return parts.some((p) => p.text != null || p.inlineData || p.fileData);
};

export class AdkEventAccumulator {
  private messagesMap = new Map<string, AdkMessage>();
  private currentMessageId: string | null = null;
  private partialTextBuffer = "";
  private accumulatedStateDelta: Record<string, unknown> = {};
  private lastAgentInfo: {
    name?: string | undefined;
    branch?: string | undefined;
  } = {};
  private lastTransferToAgent: string | undefined;
  private pendingLongRunningToolIds: string[] = [];

  constructor(initialMessages?: AdkMessage[]) {
    if (initialMessages) {
      for (const msg of initialMessages) {
        this.messagesMap.set(msg.id, msg);
      }
    }
  }

  processEvent(event: AdkEvent): AdkMessage[] {
    // Accumulate state delta
    if (event.actions?.stateDelta) {
      Object.assign(this.accumulatedStateDelta, event.actions.stateDelta);
    }

    // Track agent transfer
    if (event.actions?.transferToAgent) {
      this.lastTransferToAgent = event.actions.transferToAgent;
    }

    // Track long-running tool IDs
    if (event.longRunningToolIds?.length) {
      this.pendingLongRunningToolIds = event.longRunningToolIds;
    }

    // Track agent info
    if (event.author && event.author !== "user") {
      this.lastAgentInfo = {
        name: event.author ?? undefined,
        branch: event.branch ?? undefined,
      };
    }

    // Handle error events
    if (event.errorCode || event.errorMessage) {
      this.finalizeCurrentMessage();
      const errorMsg = this.getOrCreateAiMessage(event);
      const errorText =
        event.errorMessage ?? event.errorCode ?? "Unknown error";
      const updated: InProgressMessage = {
        ...errorMsg,
        content: [...this.getContentArray(errorMsg)],
        status: { type: "incomplete", reason: "error", error: errorText },
      };
      this.messagesMap.set(updated.id, updated);
      this.currentMessageId = null;
      return this.getMessages();
    }

    const parts = event.content?.parts;
    if (!parts?.length) return this.getMessages();

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

    // Non-partial event finalizes the current message
    if (!event.partial) {
      // Set complete status on final responses
      if (isFinalResponse(event) && this.currentMessageId) {
        const msg = this.messagesMap.get(this.currentMessageId);
        if (msg && msg.type === "ai" && !msg.status) {
          const updated: InProgressMessage = {
            ...msg,
            content: [...this.getContentArray(msg)],
            status: { type: "complete", reason: "stop" },
          };
          this.messagesMap.set(updated.id, updated);
        }
      }
      this.finalizeCurrentMessage();
    }

    return this.getMessages();
  }

  private processPart(part: AdkEventPart, event: AdkEvent): void {
    // Text with thought=true → reasoning
    if (part.text != null && part.thought) {
      const msg = this.getOrCreateAiMessage(event);
      this.appendContent(msg, { type: "reasoning", text: part.text });
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

    // Function call
    if (part.functionCall) {
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
    return msg;
  }

  private appendContent(
    msg: InProgressMessage,
    part: AdkMessageContentPart,
  ): void {
    // Always create new array to avoid stale React state
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

  private finalizeCurrentMessage(): void {
    this.partialTextBuffer = "";
    this.currentMessageId = null;
  }

  getMessages(): AdkMessage[] {
    return [...this.messagesMap.values()];
  }

  getStateDelta(): Record<string, unknown> {
    return { ...this.accumulatedStateDelta };
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
}
