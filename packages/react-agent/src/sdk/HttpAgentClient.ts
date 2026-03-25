/**
 * HTTP-based client for communicating with the Agent API.
 * This runs in the browser and communicates with a server-side API
 * that uses the real @anthropic-ai/claude-agent-sdk.
 */

import type {
  AgentClientConfig,
  CreateTaskOptions,
  SDKEvent,
  TaskHandle,
} from "../runtime/types";

export interface AgentClientInterface {
  createTask(options: CreateTaskOptions): Promise<TaskHandle>;
  streamEvents(taskId: string): AsyncGenerator<SDKEvent>;
  approveToolUse(
    taskId: string,
    approvalId: string,
    decision: "allow" | "deny",
  ): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
  respondToUserInput?(
    taskId: string,
    requestId: string,
    answers: Record<string, string>,
  ): Promise<void>;
  respondToPlan?(
    taskId: string,
    planId: string,
    decision: "approve" | "reject",
    feedback?: string,
  ): Promise<void>;
}

/**
 * HTTP client that communicates with a server-side agent API.
 * Use this when the real Claude Agent SDK cannot run in the browser.
 *
 * IMPORTANT: `apiKey` here is sent to your app backend.
 * Do not pass raw Anthropic API keys from browser code.
 */
export class HttpAgentClient implements AgentClientInterface {
  private baseUrl: string;
  private apiKey: string;
  private activeStreams: Map<string, AbortController> = new Map();
  private static readonly RECONNECT_DELAY_MS = 250;

  constructor(config: AgentClientConfig) {
    this.baseUrl = config.baseUrl || "/api/agent";
    this.apiKey = config.apiKey;
  }

  async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: "create",
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create task: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.taskId,
      prompt: options.prompt,
    };
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    const abortController = new AbortController();
    this.activeStreams.set(taskId, abortController);
    let lastEventId = "";

    try {
      while (!abortController.signal.aborted) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${this.apiKey}`,
          };
          if (lastEventId) {
            headers["Last-Event-ID"] = lastEventId;
          }

          const response = await fetch(
            `${this.baseUrl}/stream?taskId=${taskId}`,
            {
              method: "GET",
              headers,
              signal: abortController.signal,
            },
          );

          if (!response.ok) {
            // 4xx errors are not recoverable for this stream.
            if (response.status >= 400 && response.status < 500) {
              throw new Error(
                `Failed to connect to event stream: ${response.status}`,
              );
            }
            await this.sleep(HttpAgentClient.RECONNECT_DELAY_MS);
            continue;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (!abortController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split(/\r?\n\r?\n/);
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              const parsedChunk = this.parseSSEChunk(chunk);
              if (!parsedChunk) continue;

              if (parsedChunk.id) {
                lastEventId = parsedChunk.id;
              }

              const data = parsedChunk.data;
              if (!data) continue;

              if (data === "[DONE]") {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (!parsed || typeof parsed !== "object" || !parsed.type) {
                  console.error("Invalid event format:", data);
                  continue;
                }
                parsed.timestamp = new Date(parsed.timestamp);
                yield parsed as SDKEvent;
              } catch (error) {
                console.error("Failed to parse event:", error);
              }
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) {
            return;
          }
          console.error(
            "Event stream connection dropped, reconnecting:",
            error,
          );
          await this.sleep(HttpAgentClient.RECONNECT_DELAY_MS);
        }
      }
    } finally {
      this.activeStreams.delete(taskId);
    }
  }

  private parseSSEChunk(
    chunk: string,
  ): { id?: string; data?: string } | undefined {
    const lines = chunk.split(/\r?\n/);
    let id: string | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;

      const separatorIndex = line.indexOf(":");
      const field =
        separatorIndex === -1 ? line : line.slice(0, separatorIndex);
      const rawValue =
        separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
      const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

      if (field === "id") {
        id = value;
      } else if (field === "data") {
        dataLines.push(value);
      }
    }

    if (!id && dataLines.length === 0) {
      return undefined;
    }

    const parsed: { id?: string; data?: string } = {};
    if (id !== undefined) {
      parsed.id = id;
    }
    if (dataLines.length > 0) {
      parsed.data = dataLines.join("\n");
    }
    return parsed;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async approveToolUse(
    taskId: string,
    approvalId: string,
    decision: "allow" | "deny",
  ): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: "approve",
        taskId,
        approvalId,
        decision,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit approval: ${error}`);
    }
  }

  async respondToUserInput(
    taskId: string,
    requestId: string,
    answers: Record<string, string>,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/tasks/${taskId}/user-input/${requestId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ answers }),
      },
    );
    if (!res.ok) throw new Error(`respondToUserInput failed: ${res.status}`);
  }

  async respondToPlan(
    taskId: string,
    planId: string,
    decision: "approve" | "reject",
    feedback?: string,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/tasks/${taskId}/plan/${planId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ decision, feedback }),
    });
    if (!res.ok) throw new Error(`respondToPlan failed: ${res.status}`);
  }

  async cancelTask(taskId: string): Promise<void> {
    // Abort the stream if active
    const controller = this.activeStreams.get(taskId);
    if (controller) {
      controller.abort();
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: "cancel",
        taskId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel task: ${error}`);
    }
  }
}
