/**
 * Codex Agent Client for @assistant-ui/react-agent.
 *
 * Node.js-only adapter that wraps the Codex CLI subprocess (`codex app-server`)
 * via JSON-RPC over stdio.
 *
 * NOTE: This client requires Node.js runtime and CANNOT run in the browser.
 * Use HttpAgentClient for browser environments.
 */

import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import { nanoid } from "nanoid";
import type { AgentClientInterface } from "./HttpAgentClient";
import type {
  CodexClientConfig,
  CreateTaskOptions,
  SDKEvent,
  TaskHandle,
} from "../runtime/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APPROVAL_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileRead/requestApproval",
  "item/fileChange/requestApproval",
]);

const TOOL_ITEM_TYPES = new Set([
  "command_execution",
  "file_change",
  "file_read",
  "mcp_tool_call",
  "dynamic_tool_call",
  "web_search",
]);

const JSON_RPC_TIMEOUT_MS = 20_000;
const SIGKILL_DELAY_MS = 5_000;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface JsonRpcConnectionHandlers {
  onNotification: (method: string, params: unknown) => void;
  onServerRequest: (
    method: string,
    params: unknown,
    id: string | number,
  ) => void;
}

// ---------------------------------------------------------------------------
// JsonRpcConnection — JSON-RPC send/receive/correlate over stdio
// ---------------------------------------------------------------------------

class JsonRpcConnection {
  private child: ChildProcess;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId = 1;
  private handlers: JsonRpcConnectionHandlers;

  constructor(child: ChildProcess, handlers: JsonRpcConnectionHandlers) {
    this.child = child;
    this.handlers = handlers;

    const rl = createInterface({
      input: child.stdout!,
      crlfDelay: Infinity,
    });

    rl.on("line", (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let msg: unknown;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        console.warn("[CodexAgentClient] Failed to parse JSON line:", trimmed);
        return;
      }

      this.handleMessage(msg);
    });
  }

  private handleMessage(msg: unknown): void {
    if (typeof msg !== "object" || msg === null) return;

    const m = msg as Record<string, unknown>;

    // JSON-RPC response (has numeric id + result/error, no method)
    if (typeof m["id"] === "number" && "result" in m && !("method" in m)) {
      const resp = m as unknown as JsonRpcResponse;
      const pending = this.pendingRequests.get(resp.id);
      if (!pending) return;
      this.pendingRequests.delete(resp.id);
      clearTimeout(pending.timer);

      if (resp.error) {
        pending.reject(
          new Error(`JSON-RPC error ${resp.error.code}: ${resp.error.message}`),
        );
      } else {
        pending.resolve(resp.result);
      }
      return;
    }

    // Server-initiated request (has id + method)
    if ("method" in m && "id" in m) {
      const id = m["id"] as string | number;
      const method = m["method"] as string;
      const params = m["params"];
      this.handlers.onServerRequest(method, params, id);
      return;
    }

    // Notification (has method, no id)
    if ("method" in m && !("id" in m)) {
      const method = m["method"] as string;
      const params = m["params"];
      this.handlers.onNotification(method, params);
      return;
    }
  }

  sendRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `JSON-RPC request timed out after ${JSON_RPC_TIMEOUT_MS}ms: ${method}`,
          ),
        );
      }, JSON_RPC_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const msg: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        ...(params !== undefined ? { params } : {}),
      };
      this.writeLine(msg);
    });
  }

  sendNotification(method: string, params?: unknown): void {
    const msg: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      ...(params !== undefined ? { params } : {}),
    };
    this.writeLine(msg);
  }

  sendResponse(id: string | number, result: unknown): void {
    this.writeLine({ jsonrpc: "2.0", id, result });
  }

  sendErrorResponse(id: string | number, code: number, message: string): void {
    this.writeLine({ jsonrpc: "2.0", id, error: { code, message } });
  }

  destroy(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("JsonRpcConnection destroyed"));
      this.pendingRequests.delete(id);
    }
  }

  private writeLine(obj: unknown): void {
    try {
      const line = JSON.stringify(obj) + "\n";
      this.child.stdin?.write(line);
    } catch (err) {
      console.warn("[CodexAgentClient] Failed to write to stdin:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// CodexTaskController — manages one task lifecycle
// ---------------------------------------------------------------------------

class CodexTaskController {
  private taskId: string;
  /** CRITICAL: set on every SDKEvent via pushEvent */
  readonly agentId: string;
  private config: CodexClientConfig;
  private options: CreateTaskOptions;
  private connection: JsonRpcConnection | null = null;
  private child: ChildProcess | null = null;
  private eventQueue: SDKEvent[] = [];
  private eventListeners: Set<() => void> = new Set();
  private pendingApprovals: Map<string, { jsonRpcId: string | number }> =
    new Map();
  private pendingUserInputs: Map<string, { jsonRpcId: string | number }> =
    new Map();
  private threadId: string | null = null;
  // activeTurnId stored for future multi-turn support
  isRunning = false;
  private isCancelled = false;

  constructor(
    taskId: string,
    options: CreateTaskOptions,
    config: CodexClientConfig,
  ) {
    this.taskId = taskId;
    this.options = options;
    this.config = config;
    this.agentId = `agent_${nanoid()}`;
  }

  start(): void {
    this.isRunning = true;
    // Fire and forget — errors are surfaced as task_failed events
    void this.runTask();
  }

  async *events(): AsyncGenerator<SDKEvent> {
    while (this.isRunning || this.eventQueue.length > 0) {
      if (this.eventQueue.length > 0) {
        yield this.eventQueue.shift()!;
      } else {
        await this.waitForEvent();
      }
    }
  }

  resolveApproval(approvalId: string, decision: "allow" | "deny"): void {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending) throw new Error(`No pending approval: ${approvalId}`);
    this.pendingApprovals.delete(approvalId);
    this.connection?.sendResponse(pending.jsonRpcId, {
      decision: decision === "allow" ? "approve" : "deny",
    });
    this.pushEvent({
      type: decision === "allow" ? "tool_use_approved" : "tool_use_denied",
      taskId: this.taskId,
      data: { approvalId },
    });
  }

  resolveUserInput(requestId: string, answers: Record<string, string>): void {
    const pending = this.pendingUserInputs.get(requestId);
    if (!pending) throw new Error(`No pending user input: ${requestId}`);
    this.pendingUserInputs.delete(requestId);

    // Format answers for Codex protocol
    const codexAnswers: Record<string, { answers: string[] }> = {};
    for (const [key, value] of Object.entries(answers)) {
      codexAnswers[key] = { answers: [value] };
    }
    this.connection?.sendResponse(pending.jsonRpcId, {
      answers: codexAnswers,
    });
    this.pushEvent({
      type: "user_input_resolved",
      taskId: this.taskId,
      data: { requestId, answers },
    });
  }

  respondToPlan(planId: string, decision: "approve" | "reject"): void {
    // Codex protocol does not support plan approval/rejection — plans are informational.
    // However, the converter sets task.status = "waiting_input" on plan_completed,
    // so we must emit a local plan_approved/plan_rejected SDKEvent to transition
    // the task back to "running". The Codex agent proceeds regardless.
    console.warn(
      "[CodexAgentClient] Codex plans are informational. Emitting local",
      decision === "approve" ? "plan_approved" : "plan_rejected",
      "to unblock task state.",
    );
    this.pushEvent({
      type: decision === "approve" ? "plan_approved" : "plan_rejected",
      taskId: this.taskId,
      data: { planId },
    });
  }

  cancel(): void {
    if (this.isCancelled) return;
    this.isCancelled = true;
    this.isRunning = false;
    this.connection?.destroy();
    if (this.child) {
      this.child.kill("SIGTERM");
      const child = this.child;
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, SIGKILL_DELAY_MS);
    }
    this.pushEvent({
      type: "task_failed",
      taskId: this.taskId,
      data: { reason: "cancelled" },
    });
    // Wake all waiters so the generator can drain and exit
    for (const listener of this.eventListeners) listener();
  }

  private async runTask(): Promise<void> {
    try {
      // 1. Spawn subprocess
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...(this.config.apiKey ? { OPENAI_API_KEY: this.config.apiKey } : {}),
      };

      const child = spawn(this.config.codexPath ?? "codex", ["app-server"], {
        cwd: this.config.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env,
      });

      this.child = child;

      // Handle ENOENT (binary not found)
      child.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") {
          this.pushEvent({
            type: "task_failed",
            taskId: this.taskId,
            data: {
              reason:
                "codex binary not found. Install via: npm install -g @openai/codex",
            },
          });
        } else {
          this.pushEvent({
            type: "task_failed",
            taskId: this.taskId,
            data: { reason: `Subprocess error: ${err.message}` },
          });
        }
        this.isRunning = false;
        for (const listener of this.eventListeners) listener();
      });

      // Attach exit handler before anything else
      child.on("exit", (code: number | null) => {
        if (!this.isCancelled) {
          this.pushEvent({
            type: "task_failed",
            taskId: this.taskId,
            data: {
              reason: `Subprocess exited unexpectedly with code ${code ?? "null"}`,
            },
          });
        }
        this.isRunning = false;
        for (const listener of this.eventListeners) listener();
      });

      // Attach stderr handler (debug level — not fatal)
      child.stderr?.on("data", (chunk: Buffer) => {
        console.debug("[CodexAgentClient] stderr:", chunk.toString());
      });

      // 2. Create JSON-RPC connection
      this.connection = new JsonRpcConnection(child, {
        onNotification: (method, params) => {
          const events = this.mapNotificationToEvents(method, params);
          for (const partial of events) {
            this.pushEvent(partial);
          }
        },
        onServerRequest: (method, params, id) => {
          this.handleServerRequest(method, params, id);
        },
      });

      // 3. Push agent_spawned event
      this.pushEvent({
        type: "agent_spawned",
        taskId: this.taskId,
        data: { name: "Codex", parentAgentId: null },
      });

      // 4. Initialize handshake
      await this.connection.sendRequest("initialize", {
        clientInfo: { name: "assistant-ui", version: "0.0.1" },
        capabilities: { experimentalApi: true },
      });
      this.connection.sendNotification("initialized");

      // 5. thread/start — NO approvalPolicy or sandbox
      const threadResult = (await this.connection.sendRequest("thread/start", {
        cwd: this.config.cwd,
        experimentalRawEvents: false,
        ...(this.config.model ? { model: this.config.model } : {}),
      })) as { thread: { id: string } };
      this.threadId = threadResult.thread.id;

      // 6. turn/start — include model ONLY if defined
      const turnParams: Record<string, unknown> = {
        threadId: this.threadId,
        input: [
          {
            type: "text",
            text: this.options.prompt,
            text_elements: [],
          },
        ],
      };
      if (this.config.model !== undefined) {
        turnParams["model"] = this.config.model;
      }

      const turnResult = (await this.connection.sendRequest(
        "turn/start",
        turnParams,
      )) as { turn: { id: string } };
      // Store turn id (retained for future multi-turn support)
      const _activeTurnId = turnResult.turn.id;
      void _activeTurnId;

      // 7. Push task_started
      this.pushEvent({
        type: "task_started",
        taskId: this.taskId,
        data: { prompt: this.options.prompt },
      });

      // From here on, events arrive via notifications handled by onNotification/onServerRequest.
      // runTask completes — isRunning stays true until exit/cancel/task_completed.
    } catch (err) {
      this.pushEvent({
        type: "task_failed",
        taskId: this.taskId,
        data: {
          reason: err instanceof Error ? err.message : "Unknown error",
        },
      });
      this.isRunning = false;
      for (const listener of this.eventListeners) listener();
    }
  }

  /**
   * CRITICAL: every SDKEvent goes through this method, which injects agentId + timestamp.
   * Without agentId, the converter silently discards the event.
   */
  private pushEvent(
    partial: Omit<SDKEvent, "agentId" | "timestamp"> & { agentId?: string },
  ): void {
    const event: SDKEvent = {
      ...partial,
      agentId: partial.agentId ?? this.agentId,
      timestamp: new Date(),
    };
    this.eventQueue.push(event);
    for (const listener of this.eventListeners) listener();
  }

  private waitForEvent(): Promise<void> {
    return new Promise((resolve) => {
      const listener = () => {
        this.eventListeners.delete(listener);
        resolve();
      };
      this.eventListeners.add(listener);
      // Timeout to prevent infinite wait if no event arrives
      setTimeout(listener, 100);
    });
  }

  private isToolItemType(itemType: string): boolean {
    return TOOL_ITEM_TYPES.has(itemType);
  }

  private mapNotificationToEvents(
    method: string,
    params: unknown,
  ): Array<Omit<SDKEvent, "agentId" | "timestamp">> {
    const p = (params ?? {}) as Record<string, unknown>;

    switch (method) {
      case "turn/started":
        return [
          {
            type: "task_started",
            taskId: this.taskId,
            data: { prompt: "" },
          },
        ];

      case "turn/completed": {
        const totalCost =
          typeof (p["usage"] as Record<string, unknown> | undefined)?.[
            "totalCostUsd"
          ] === "number"
            ? ((p["usage"] as Record<string, unknown>)[
                "totalCostUsd"
              ] as number)
            : 0;
        return [
          {
            type: "agent_completed",
            taskId: this.taskId,
            data: { name: "Codex", finalCost: totalCost },
          },
          {
            type: "task_completed",
            taskId: this.taskId,
            data: { totalCost },
          },
        ];
      }

      case "turn/aborted":
        return [
          {
            type: "task_failed",
            taskId: this.taskId,
            data: { reason: (p["reason"] as string | undefined) ?? "aborted" },
          },
        ];

      case "item/agentMessage/delta":
        return [
          {
            type: "message_delta",
            taskId: this.taskId,
            data: { text: (p["delta"] as string | undefined) ?? "" },
          },
        ];

      case "item/reasoning/textDelta":
      case "item/reasoning/summaryTextDelta":
        return [
          {
            type: "reasoning",
            taskId: this.taskId,
            data: { text: (p["delta"] as string | undefined) ?? "" },
          },
        ];

      case "item/commandExecution/outputDelta":
        return [
          {
            type: "message_delta",
            taskId: this.taskId,
            data: { text: (p["delta"] as string | undefined) ?? "" },
          },
        ];

      case "item/started": {
        const item = (p["item"] ?? {}) as Record<string, unknown>;
        const itemType = (item["type"] as string | undefined) ?? "";
        if (this.isToolItemType(itemType)) {
          return [
            {
              type: "tool_use",
              taskId: this.taskId,
              data: {
                toolCallId: item["id"],
                toolName: itemType,
                toolInput: (item["data"] as unknown) ?? {},
              },
            },
          ];
        }
        return [
          {
            type: "item_started",
            taskId: this.taskId,
            data: {
              itemId: item["id"],
              itemType,
              title: item["title"],
            },
          },
        ];
      }

      case "item/completed": {
        const item = (p["item"] ?? {}) as Record<string, unknown>;
        const itemType = (item["type"] as string | undefined) ?? "";
        if (this.isToolItemType(itemType)) {
          return [
            {
              type: "tool_result",
              taskId: this.taskId,
              data: {
                toolCallId: item["id"],
                result: item["output"],
                isError: item["status"] === "failed",
              },
            },
          ];
        }
        if (itemType === "plan") {
          return [
            {
              type: "plan_completed",
              taskId: this.taskId,
              data: { planId: item["id"] },
            },
          ];
        }
        return [
          {
            type: "item_completed",
            taskId: this.taskId,
            data: {
              itemId: item["id"],
              status: (item["status"] as string | undefined) ?? "completed",
            },
          },
        ];
      }

      case "item/reasoning/summaryPartAdded": {
        const itemId = p["itemId"] as string | undefined;
        return [
          {
            type: "item_updated",
            taskId: this.taskId,
            data: { itemId, detail: p["summary"] },
          },
        ];
      }

      case "item/commandExecution/terminalInteraction": {
        const itemId = p["itemId"] as string | undefined;
        return [
          {
            type: "item_updated",
            taskId: this.taskId,
            data: { itemId, detail: p["output"] },
          },
        ];
      }

      case "item/plan/delta":
        return [
          {
            type: "plan_delta",
            taskId: this.taskId,
            data: {
              planId: (p["planId"] as string | undefined) ?? "plan",
              text: (p["delta"] as string | undefined) ?? "",
            },
          },
        ];

      case "item/mcpToolCall/progress": {
        const toolUseId = p["toolUseId"] as string | undefined;
        const toolName = p["toolName"] as string | undefined;
        const elapsedSeconds = p["elapsedSeconds"] as number | undefined;
        return [
          {
            type: "tool_progress",
            taskId: this.taskId,
            data: { toolUseId, toolName, elapsedSeconds },
          },
        ];
      }

      case "error": {
        if (p["willRetry"] === true) {
          console.warn(
            `[CodexAgentClient] Retryable error: ${p["message"] as string | undefined}`,
          );
          return [];
        }
        return [
          {
            type: "task_failed",
            taskId: this.taskId,
            data: {
              reason: (p["message"] as string | undefined) ?? "Unknown error",
            },
          },
        ];
      }

      default:
        console.debug(
          `[CodexAgentClient] Unmapped notification method: ${method}`,
        );
        return [];
    }
  }

  private handleServerRequest(
    method: string,
    params: unknown,
    jsonRpcId: string | number,
  ): void {
    const p = (params ?? {}) as Record<string, unknown>;

    if (method === "item/tool/requestUserInput") {
      const requestId = `input_${nanoid()}`;
      this.pendingUserInputs.set(requestId, { jsonRpcId });
      this.pushEvent({
        type: "user_input_requested",
        taskId: this.taskId,
        data: {
          requestId,
          questions: (p["questions"] as unknown[]) ?? [],
        },
      });
    } else if (APPROVAL_METHODS.has(method)) {
      const approvalId = `approval_${nanoid()}`;
      const toolCallId = `tool_${nanoid()}`;
      this.pendingApprovals.set(approvalId, { jsonRpcId });
      this.pushEvent({
        type: "tool_use_requested",
        taskId: this.taskId,
        data: {
          approvalId,
          toolCallId,
          toolName:
            (p["command"] as string | undefined) ??
            (p["path"] as string | undefined) ??
            method,
          toolInput: params,
          reason: (p["reason"] as string | undefined) ?? "",
        },
      });
    } else {
      // Unknown server request — respond with JSON-RPC error
      this.connection?.sendErrorResponse(
        jsonRpcId,
        -32601,
        `Unsupported: ${method}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CodexAgentClient — exported adapter implementing AgentClientInterface
// ---------------------------------------------------------------------------

export class CodexAgentClient implements AgentClientInterface {
  private config: CodexClientConfig;
  private activeTasks: Map<string, CodexTaskController> = new Map();

  constructor(config: CodexClientConfig) {
    this.config = config;
  }

  async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
    const taskId = `task_${nanoid()}`;
    const handle: TaskHandle = {
      id: taskId,
      prompt: options.prompt,
    };

    const controller = new CodexTaskController(taskId, options, this.config);
    this.activeTasks.set(taskId, controller);
    controller.start();

    return handle;
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) {
      throw new Error(`Task not found: ${taskId}`);
    }

    for await (const event of controller.events()) {
      yield event;
    }
  }

  async approveToolUse(
    taskId: string,
    approvalId: string,
    decision: "allow" | "deny",
  ): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) throw new Error(`No active task: ${taskId}`);
    controller.resolveApproval(approvalId, decision);
  }

  async respondToUserInput(
    taskId: string,
    requestId: string,
    answers: Record<string, string>,
  ): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) throw new Error(`No active task: ${taskId}`);
    controller.resolveUserInput(requestId, answers);
  }

  async respondToPlan(
    taskId: string,
    planId: string,
    decision: "approve" | "reject",
    _feedback?: string,
  ): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) throw new Error(`No active task: ${taskId}`);
    controller.respondToPlan(planId, decision);
  }

  async cancelTask(taskId: string): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (controller) {
      controller.cancel();
      this.activeTasks.delete(taskId);
    }
  }
}
