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
}

/**
 * HTTP client that communicates with a server-side agent API.
 * Use this when the real Claude Agent SDK cannot run in the browser.
 */
export class HttpAgentClient implements AgentClientInterface {
  private baseUrl: string;
  private apiKey: string;
  private activeStreams: Map<string, AbortController> = new Map();

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

    try {
      const response = await fetch(`${this.baseUrl}/stream?taskId=${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to connect to event stream: ${response.status}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const event = JSON.parse(data) as SDKEvent;
              // Convert timestamp back to Date
              event.timestamp = new Date(event.timestamp);
              yield event;
            } catch (e) {
              console.error("Failed to parse event:", e);
            }
          }
        }
      }
    } finally {
      this.activeStreams.delete(taskId);
    }
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
