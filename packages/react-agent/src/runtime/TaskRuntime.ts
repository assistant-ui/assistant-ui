/**
 * Runtime for managing task state, including agents and approvals.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import { processSDKEvent } from "../sdk/converters";
import { AgentRuntime } from "./AgentRuntime";
import { ApprovalRuntime } from "./ApprovalRuntime";
import { UserInputRuntime } from "./UserInputRuntime";
import { PlanRuntime } from "./PlanRuntime";
import type {
  PermissionMode,
  PermissionStoreInterface,
} from "./PermissionStore";
import type {
  AgentEvent,
  AgentState,
  ApprovalStatus,
  CreateTaskOptions,
  PlanState,
  PlanStatus,
  TaskHandle,
  TaskState,
  UserInputStatus,
} from "./types";

export class TaskRuntime {
  private static readonly READ_ONLY_TOOLS = new Set(["Read", "Glob", "Grep"]);
  private state: TaskState;
  private client: AgentClientInterface;
  private permissionStore: PermissionStoreInterface;
  private agents: Map<string, AgentRuntime> = new Map();
  private approvals: Map<string, ApprovalRuntime> = new Map();
  private userInputs: Map<string, UserInputRuntime> = new Map();
  private plan: PlanRuntime | null = null;
  private eventSubscribers: Set<(event: AgentEvent) => void> = new Set();
  private listeners: Set<() => void> = new Set();
  private originalPrompt: string;
  private serverTaskId: string;
  private streamingPromise: Promise<void> | null = null;
  private streamGeneration = 0;
  private permissionModeOverride: PermissionMode | undefined;
  private requiresApproval: CreateTaskOptions["requiresApproval"];

  constructor(
    handle: TaskHandle,
    client: AgentClientInterface,
    permissionStore: PermissionStoreInterface,
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
      pendingUserInputs: [],
      proposedPlan: undefined,
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

  getUserInput(requestId: string): UserInputRuntime | undefined {
    return this.userInputs.get(requestId);
  }

  getPlan(): PlanRuntime | null {
    return this.plan;
  }

  subscribeToEvents(callback: (event: AgentEvent) => void): () => void {
    this.eventSubscribers.add(callback);
    return () => this.eventSubscribers.delete(callback);
  }

  setPermissionMode(mode: PermissionMode | undefined): void {
    this.permissionModeOverride = mode;
    if (mode !== undefined) {
      this.permissionStore.setMode(mode);
    }
    this.notify();
  }

  getPermissionMode(): PermissionMode | undefined {
    return this.permissionModeOverride ?? this.permissionStore.getMode();
  }

  async cancel(): Promise<void> {
    if (!["starting", "running", "waiting_input"].includes(this.state.status)) {
      return;
    }

    this.userInputs.clear();
    this.plan = null;

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
    this.userInputs.clear();
    this.plan = null;
    this.state = {
      ...this.state,
      status: "starting",
      cost: 0,
      agents: [],
      pendingApprovals: [],
      pendingUserInputs: [],
      proposedPlan: undefined,
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
      // Fire per-event subscribers (for bridge adapter)
      for (const sub of this.eventSubscribers) sub(result.newEvent);
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

    // Handle new user input
    if (result.newUserInput) {
      const userInputRuntime = new UserInputRuntime(
        result.newUserInput,
        this.client,
        (status: UserInputStatus) =>
          this.onUserInputResolved(result.newUserInput!.id, status),
      );
      this.userInputs.set(result.newUserInput.id, userInputRuntime);
      shouldNotify = true;
    }

    // Handle resolved user input
    if (result.resolvedUserInputId) {
      this.userInputs.delete(result.resolvedUserInputId);
      shouldNotify = true;
    }

    // Handle plan updates
    if (result.planUpdate) {
      if (result.planUpdate.isNew) {
        this.plan = new PlanRuntime(
          result.planUpdate.plan as PlanState,
          this.client,
          (status: PlanStatus) => this.onPlanResolved(status),
        );
        shouldNotify = true;
      } else if (this.plan) {
        if (result.planUpdate.plan.text !== undefined) {
          // Calculate delta by subtracting current plan text from the new accumulated text
          const currentText = this.plan.getState().text;
          const newText = result.planUpdate.plan.text;
          const delta = newText.startsWith(currentText)
            ? newText.slice(currentText.length)
            : newText;
          this.plan.appendText(delta);
        }
        if (result.planUpdate.plan.status !== undefined) {
          // Status updates come from server events (plan_approved, plan_rejected, plan_completed)
          // Update plan internal state by recreating with new status
          const currentPlanState = this.plan.getState();
          const updatedState: PlanState = {
            ...currentPlanState,
            status: result.planUpdate.plan.status,
          };
          this.plan = new PlanRuntime(
            updatedState,
            this.client,
            (status: PlanStatus) => this.onPlanResolved(status),
          );
          shouldNotify = true;
        }
      }
    }

    // Handle active item lifecycle (mutations on AgentRuntime)
    if (result.newActiveItem) {
      const agent = this.agents.get(result.newActiveItem.agentId);
      if (agent) {
        agent.addActiveItem(result.newActiveItem);
      }
    }
    if (result.updatedActiveItem) {
      const agentId = (event as { agentId?: string }).agentId;
      if (agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.updateActiveItem(
            result.updatedActiveItem.id,
            result.updatedActiveItem.update,
          );
        }
      }
    }
    if (result.completedActiveItemId) {
      const agentId = (event as { agentId?: string }).agentId;
      if (agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.removeActiveItem(result.completedActiveItemId);
        }
      }
    }

    if (shouldNotify) {
      this.notify();
    }
  }

  private onUserInputResolved(
    requestId: string,
    _status: UserInputStatus,
  ): void {
    this.userInputs.delete(requestId);
    this.state = {
      ...this.state,
      pendingUserInputs: this.state.pendingUserInputs.filter(
        (u) => u.id !== requestId,
      ),
    };
    this.notify();
  }

  private onPlanResolved(status: PlanStatus): void {
    if (this.plan) {
      const currentState = this.plan.getState();
      this.state = {
        ...this.state,
        proposedPlan: { ...currentState, status },
      };
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
    const storedPermission = this.permissionStore.getToolPermission(toolName);
    if (storedPermission) {
      return storedPermission.mode !== "allow";
    }

    const permissionMode = this.getPermissionMode();
    if (permissionMode === "auto-all") {
      return false;
    }

    if (
      permissionMode === "auto-reads" &&
      TaskRuntime.READ_ONLY_TOOLS.has(toolName)
    ) {
      return false;
    }

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
