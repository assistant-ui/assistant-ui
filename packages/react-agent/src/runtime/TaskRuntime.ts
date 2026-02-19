/**
 * Runtime for managing task state, including agents and approvals.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import { processSDKEvent } from "../sdk/converters";
import { AgentRuntime } from "./AgentRuntime";
import { ApprovalRuntime } from "./ApprovalRuntime";
import type {
  AgentState,
  ApprovalStatus,
  CreateTaskOptions,
  TaskHandle,
  TaskState,
} from "./types";

export class TaskRuntime {
  private state: TaskState;
  private client: AgentClientInterface;
  private permissionStore: import("./PermissionStore").PermissionStoreInterface;
  private agents: Map<string, AgentRuntime> = new Map();
  private approvals: Map<string, ApprovalRuntime> = new Map();
  private listeners: Set<() => void> = new Set();
  private originalPrompt: string;
  private serverTaskId: string;
  private streamingPromise: Promise<void> | null = null;
  private streamGeneration = 0;
  private permissionModeOverride:
    | import("./PermissionStore").PermissionMode
    | undefined;
  private requiresApproval: CreateTaskOptions["requiresApproval"];

  constructor(
    handle: TaskHandle,
    client: AgentClientInterface,
    permissionStore: import("./PermissionStore").PermissionStoreInterface,
    options?: {
      requiresApproval?: CreateTaskOptions["requiresApproval"];
    },
  ) {
    this.client = client;
    this.permissionStore = permissionStore;
    this.requiresApproval = options?.requiresApproval;
    this.originalPrompt = handle.prompt;
    this.serverTaskId = handle.id;
    this.state = {
      id: handle.id,
      title: handle.prompt.slice(0, 100),
      status: "starting",
      cost: 0,
      agents: [],
      pendingApprovals: [],
      createdAt: new Date(),
      completedAt: undefined,
    };

    this.startStreaming();
  }

  get id(): string {
    return this.state.id;
  }

  getState(): TaskState {
    return this.state;
  }

  getAgent(agentId: string): AgentRuntime | undefined {
    return this.agents.get(agentId);
  }

  getApproval(approvalId: string): ApprovalRuntime | undefined {
    return this.approvals.get(approvalId);
  }

  setPermissionMode(
    mode: import("./PermissionStore").PermissionMode | undefined,
  ): void {
    this.permissionModeOverride = mode;
    this.notify();
  }

  getPermissionMode(): import("./PermissionStore").PermissionMode | undefined {
    return this.permissionModeOverride;
  }

  async cancel(): Promise<void> {
    if (!["starting", "running", "waiting_input"].includes(this.state.status)) {
      return;
    }

    await this.client.cancelTask(this.serverTaskId);
  }

  async retry(): Promise<void> {
    if (this.state.status !== "failed" && this.state.status !== "completed") {
      return;
    }

    // Increment generation to invalidate any in-flight stream events
    this.streamGeneration++;

    // Wait for old stream to finish before starting a new one
    if (this.streamingPromise) {
      await this.streamingPromise;
    }

    const handle = await this.client.createTask({
      prompt: this.originalPrompt,
    });

    this.serverTaskId = handle.id;
    this.agents.clear();
    this.approvals.clear();
    this.state = {
      ...this.state,
      status: "starting",
      cost: 0,
      agents: [],
      pendingApprovals: [],
      createdAt: new Date(),
      completedAt: undefined,
    };
    this.notify();

    this.startStreaming();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private async startStreaming(): Promise<void> {
    if (this.streamingPromise) return this.streamingPromise;

    this.streamingPromise = this._doStream();
    try {
      await this.streamingPromise;
    } finally {
      this.streamingPromise = null;
    }
  }

  private async _doStream(): Promise<void> {
    const generation = this.streamGeneration;
    try {
      for await (const event of this.client.streamEvents(this.serverTaskId)) {
        // Discard events from a previous stream if retry() was called
        if (this.streamGeneration !== generation) return;
        // Skip events that don't belong to the current server task
        const e = event as { taskId?: string };
        if (e.taskId && e.taskId !== this.serverTaskId) continue;
        this.processEvent(event);
      }
    } catch (error) {
      if (this.streamGeneration !== generation) return;
      console.error("Error streaming task events:", error);
      this.state = { ...this.state, status: "failed" };
      this.notify();
    }
  }

  private processEvent(event: Parameters<typeof processSDKEvent>[0]): void {
    const result = processSDKEvent(event, this.state);
    let shouldNotify = false;

    // Apply task updates
    if (result.taskUpdate) {
      this.state = { ...this.state, ...result.taskUpdate };
      shouldNotify = true;
    }

    // Handle new agent
    if (result.newAgent) {
      const agentRuntime = new AgentRuntime(result.newAgent, (state) =>
        this.syncAgentState(state),
      );
      this.agents.set(result.newAgent.id, agentRuntime);

      // Update parent agent if exists
      if (result.newAgent.parentAgentId) {
        const parentAgent = this.agents.get(result.newAgent.parentAgentId);
        if (parentAgent) {
          parentAgent.addChildAgent(result.newAgent.id);
        }
      }

      this.state = {
        ...this.state,
        agents: [...this.state.agents, agentRuntime.getState()],
      };
      shouldNotify = true;
    }

    // Handle agent updates
    if (result.agentUpdate) {
      const agent = this.agents.get(result.agentUpdate.id);
      if (agent) {
        agent.updateState(result.agentUpdate.update);
      }
    }

    // Handle new event
    if (result.newEvent) {
      const agent = this.agents.get(result.newEvent.agentId);
      if (agent) {
        agent.addEvent(result.newEvent);
      }
    }

    // Handle new approval
    if (result.newApproval) {
      const requiresApproval = this.shouldRequireApproval(
        result.newApproval.toolName,
        result.newApproval.toolInput,
      );

      if (!requiresApproval) {
        void this.client
          .approveToolUse(
            result.newApproval.taskId,
            result.newApproval.id,
            "allow",
          )
          .catch((error) => {
            console.error(
              "Failed to auto-approve filtered tool request:",
              error,
            );
          });
      } else {
        const approvalRuntime = new ApprovalRuntime(
          result.newApproval,
          this.client,
          (status: ApprovalStatus) =>
            this.onApprovalResolved(result.newApproval!.id, status),
          this.permissionStore,
        );
        this.approvals.set(result.newApproval.id, approvalRuntime);
        this.state = {
          ...this.state,
          pendingApprovals: [
            ...this.state.pendingApprovals,
            result.newApproval,
          ],
        };
        shouldNotify = true;
      }
    }

    // Handle resolved approval
    if (result.resolvedApprovalId) {
      this.removeApproval(result.resolvedApprovalId);
      shouldNotify = true;
    }

    if (shouldNotify) {
      this.notify();
    }
  }

  private onApprovalResolved(approvalId: string, status: ApprovalStatus): void {
    // Update the approval status in state
    this.state = {
      ...this.state,
      pendingApprovals: this.state.pendingApprovals.map((a) =>
        a.id === approvalId ? { ...a, status } : a,
      ),
    };
    this.notify();
  }

  private removeApproval(approvalId: string): void {
    this.approvals.delete(approvalId);
    this.state = {
      ...this.state,
      pendingApprovals: this.state.pendingApprovals.filter(
        (a) => a.id !== approvalId,
      ),
    };
  }

  private syncAgentState(state: AgentState): void {
    this.state = {
      ...this.state,
      agents: this.state.agents.some((agent) => agent.id === state.id)
        ? this.state.agents.map((agent) =>
            agent.id === state.id ? state : agent,
          )
        : [...this.state.agents, state],
    };
    this.notify();
  }

  private shouldRequireApproval(toolName: string, toolInput: unknown): boolean {
    if (!this.requiresApproval) return true;

    try {
      return this.requiresApproval(toolName, toolInput);
    } catch (error) {
      console.error("requiresApproval callback failed:", error);
      return true;
    }
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
