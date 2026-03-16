/**
 * Runtime for managing individual agent state.
 */

import type { ActiveItem, AgentEvent, AgentState } from "./types";

export class AgentRuntime {
  private state: AgentState;
  private listeners: Set<() => void> = new Set();
  private onChange: ((state: AgentState) => void) | undefined;
  private notifyScheduled = false;

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
    this.scheduleNotify();
  }

  addEvent(event: AgentEvent): void {
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
    };
    this.scheduleNotify();
  }

  addChildAgent(childAgentId: string): void {
    this.state = {
      ...this.state,
      childAgentIds: [...this.state.childAgentIds, childAgentId],
    };
    this.scheduleNotify();
  }

  getActiveItems(): ActiveItem[] {
    return this.state.activeItems;
  }

  addActiveItem(item: ActiveItem): void {
    this.state = {
      ...this.state,
      activeItems: [...this.state.activeItems, item],
    };
    this.scheduleNotify();
  }

  updateActiveItem(itemId: string, update: Partial<ActiveItem>): void {
    this.state = {
      ...this.state,
      activeItems: this.state.activeItems.map((item) =>
        item.id === itemId ? { ...item, ...update } : item,
      ),
    };
    this.scheduleNotify();
  }

  removeActiveItem(itemId: string): void {
    this.state = {
      ...this.state,
      activeItems: this.state.activeItems.filter((item) => item.id !== itemId),
    };
    this.scheduleNotify();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Batch notifications using queueMicrotask to prevent
   * "Maximum update depth exceeded" when many events arrive rapidly.
   */
  private scheduleNotify(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.onChange?.(this.state);
      this.listeners.forEach((cb) => cb());
    });
  }
}
