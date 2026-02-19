/**
 * Runtime for managing individual agent state.
 */

import type { AgentEvent, AgentState } from "./types";

export class AgentRuntime {
  private state: AgentState;
  private listeners: Set<() => void> = new Set();
  private onChange: ((state: AgentState) => void) | undefined;

  constructor(state: AgentState, onChange?: (state: AgentState) => void) {
    this.state = state;
    this.onChange = onChange;
  }

  get id(): string {
    return this.state.id;
  }

  getState(): AgentState {
    return this.state;
  }

  updateState(update: Partial<AgentState>): void {
    this.state = { ...this.state, ...update };
    this.notify();
  }

  addEvent(event: AgentEvent): void {
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
    };
    this.notify();
  }

  addChildAgent(childAgentId: string): void {
    this.state = {
      ...this.state,
      childAgentIds: [...this.state.childAgentIds, childAgentId],
    };
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.onChange?.(this.state);
    this.listeners.forEach((cb) => cb());
  }
}
