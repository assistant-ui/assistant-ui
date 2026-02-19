/**
 * Runtime for managing individual approval requests.
 */

import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import type { ApprovalState, ApprovalStatus } from "./types";

export class ApprovalRuntime {
  private state: ApprovalState;
  private client: AgentClientInterface;
  private onResolve: (status: ApprovalStatus) => void;
  private listeners: Set<() => void> = new Set();
  private permissionStore: import("./PermissionStore").PermissionStoreInterface;

  constructor(
    state: ApprovalState,
    client: AgentClientInterface,
    onResolve: (status: ApprovalStatus) => void,
    permissionStore: import("./PermissionStore").PermissionStoreInterface,
  ) {
    this.state = state;
    this.client = client;
    this.onResolve = onResolve;
    this.permissionStore = permissionStore;
  }

  get id(): string {
    return this.state.id;
  }

  getState(): ApprovalState {
    return this.state;
  }

  async approve(
    mode: "once" | "session" | "always" | "timed" = "once",
    duration?: number,
  ): Promise<void> {
    if (this.state.status !== "pending") {
      throw new Error("Approval is not pending");
    }

    if (mode === "session") {
      this.permissionStore.setToolPermission(this.state.toolName, {
        toolName: this.state.toolName,
        mode: "allow",
      });
    } else if (mode === "always") {
      this.permissionStore.setToolPermission(this.state.toolName, {
        toolName: this.state.toolName,
        mode: "allow",
      });
      this.permissionStore.persistPermission(this.state.toolName);
    } else if (mode === "timed" && duration) {
      this.permissionStore.setToolPermission(this.state.toolName, {
        toolName: this.state.toolName,
        mode: "allow",
        expiresAt: Date.now() + duration,
      });
    }

    await this.client.approveToolUse(this.state.taskId, this.state.id, "allow");
    this.state = { ...this.state, status: "approved" };
    this.onResolve("approved");
    this.notify();
  }

  async deny(): Promise<void> {
    if (this.state.status !== "pending") {
      throw new Error("Approval is not pending");
    }

    await this.client.approveToolUse(this.state.taskId, this.state.id, "deny");
    this.state = { ...this.state, status: "denied" };
    this.onResolve("denied");
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
