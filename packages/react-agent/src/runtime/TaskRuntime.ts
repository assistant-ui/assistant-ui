/**
 * Runtime for managing task state, including agents and approvals.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import { processSDKEvent } from "../sdk/converters";
import { AgentRuntime } from "./AgentRuntime";
import { ApprovalRuntime } from "./ApprovalRuntime";
import type { ApprovalStatus, TaskHandle, TaskState } from "./types";

export class TaskRuntime {
  private state: TaskState;
  private client: AgentClientInterface;
  private agents: Map<string, AgentRuntime> = new Map();
  private approvals: Map<string, ApprovalRuntime> = new Map();
  private listeners: Set<() => void> = new Set();
  private isStreaming = false;

  constructor(handle: TaskHandle, client: AgentClientInterface) {
    this.client = client;
    this.state = {
      id: handle.id,
      title: handle.prompt.slice(0, 100),
      status: "queued",
      cost: 0,
      agents: [],
      pendingApprovals: [],
      createdAt: new Date(),
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

  async cancel(): Promise<void> {
    if (this.state.status !== "running" && this.state.status !== "queued") {
      return;
    }

    await this.client.cancelTask(this.state.id);
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private async startStreaming(): Promise<void> {
    if (this.isStreaming) return;
    this.isStreaming = true;

    try {
      for await (const event of this.client.streamEvents(this.state.id)) {
        this.processEvent(event);
      }
    } catch (error) {
      console.error("Error streaming task events:", error);
      this.state = { ...this.state, status: "failed" };
      this.notify();
    } finally {
      this.isStreaming = false;
    }
  }

  private processEvent(event: Parameters<typeof processSDKEvent>[0]): void {
    const result = processSDKEvent(event, this.state);

    // Apply task updates
    if (result.taskUpdate) {
      this.state = { ...this.state, ...result.taskUpdate };
    }

    // Handle new agent
    if (result.newAgent) {
      const agentRuntime = new AgentRuntime(result.newAgent);
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
        agents: [...this.state.agents, result.newAgent],
      };
    }

    // Handle agent updates
    if (result.agentUpdate) {
      const agent = this.agents.get(result.agentUpdate.id);
      if (agent) {
        agent.updateState(result.agentUpdate.update);

        // Update state array
        this.state = {
          ...this.state,
          agents: this.state.agents.map((a) =>
            a.id === result.agentUpdate!.id
              ? { ...a, ...result.agentUpdate!.update }
              : a,
          ),
        };
      }
    }

    // Handle new event
    if (result.newEvent) {
      const agent = this.agents.get(result.newEvent.agentId);
      if (agent) {
        agent.addEvent(result.newEvent);

        // Update state array
        this.state = {
          ...this.state,
          agents: this.state.agents.map((a) =>
            a.id === result.newEvent!.agentId
              ? { ...a, events: [...a.events, result.newEvent!] }
              : a,
          ),
        };
      }
    }

    // Handle new approval
    if (result.newApproval) {
      const approvalRuntime = new ApprovalRuntime(
        result.newApproval,
        this.client,
        (status: ApprovalStatus) =>
          this.onApprovalResolved(result.newApproval!.id, status),
      );
      this.approvals.set(result.newApproval.id, approvalRuntime);
      this.state = {
        ...this.state,
        pendingApprovals: [...this.state.pendingApprovals, result.newApproval],
      };
    }

    // Handle resolved approval
    if (result.resolvedApprovalId) {
      this.removeApproval(result.resolvedApprovalId);
    }

    this.notify();
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

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
