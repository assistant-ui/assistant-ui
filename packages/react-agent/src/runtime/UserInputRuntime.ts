/**
 * Runtime for managing structured user input requests from agents.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import type { UserInputState, UserInputStatus } from "./types";

export class UserInputRuntime {
  private state: UserInputState;
  private client: AgentClientInterface;
  private onResolve: (status: UserInputStatus) => void;
  private listeners: Set<() => void> = new Set();

  constructor(
    state: UserInputState,
    client: AgentClientInterface,
    onResolve: (status: UserInputStatus) => void,
  ) {
    this.state = state;
    this.client = client;
    this.onResolve = onResolve;
  }

  get id(): string {
    return this.state.id;
  }

  getState(): UserInputState {
    return this.state;
  }

  async respond(answers: Record<string, string>): Promise<void> {
    if (this.state.status !== "pending") {
      throw new Error("User input request is not pending");
    }

    this.state = { ...this.state, status: "processing" };
    this.notify();

    try {
      if (!this.client.respondToUserInput) {
        this.state = { ...this.state, status: "pending" };
        this.notify();
        throw new Error("respondToUserInput not implemented by this client");
      }

      await this.client.respondToUserInput(
        this.state.taskId,
        this.state.id,
        answers,
      );

      this.state = { ...this.state, status: "resolved" };
      this.onResolve("resolved");
      this.notify();
    } catch (error) {
      if (this.state.status === "processing") {
        this.state = { ...this.state, status: "pending" };
        this.notify();
      }
      throw error;
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
