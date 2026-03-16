/**
 * Runtime for managing proposed plan review and approval.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import type { PlanState, PlanStatus } from "./types";

export class PlanRuntime {
  private state: PlanState;
  private client: AgentClientInterface;
  private onResolve: (status: PlanStatus) => void;
  private listeners: Set<() => void> = new Set();

  constructor(
    state: PlanState,
    client: AgentClientInterface,
    onResolve: (status: PlanStatus) => void,
  ) {
    this.state = state;
    this.client = client;
    this.onResolve = onResolve;
  }

  get id(): string {
    return this.state.id;
  }

  getState(): PlanState {
    return this.state;
  }

  appendText(delta: string): void {
    this.state = { ...this.state, text: this.state.text + delta };
    this.notify();
  }

  async approve(): Promise<void> {
    if (this.state.status !== "proposed") {
      throw new Error("Plan is not in proposed state");
    }

    if (!this.client.respondToPlan) {
      throw new Error("respondToPlan not implemented by this client");
    }

    await this.client.respondToPlan(
      this.state.taskId,
      this.state.id,
      "approve",
    );

    this.onResolve("approved");
  }

  async reject(feedback?: string): Promise<void> {
    if (this.state.status !== "proposed") {
      throw new Error("Plan is not in proposed state");
    }

    if (!this.client.respondToPlan) {
      throw new Error("respondToPlan not implemented by this client");
    }

    await this.client.respondToPlan(
      this.state.taskId,
      this.state.id,
      "reject",
      feedback,
    );

    this.onResolve("rejected");
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
