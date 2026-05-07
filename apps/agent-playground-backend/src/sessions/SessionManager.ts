import { randomUUID } from "node:crypto";
import type { Harness, HarnessEvent } from "@mastra/core/harness";
import { EventBroker } from "../events/EventBroker.js";
import type { ServerEvent } from "../events/types.js";
import { createHarness } from "../harness.js";
import type { HarnessState } from "../schema.js";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";
import { registerWorkspaceEnvRuntime, unregisterWorkspaceEnvRuntime } from "../workspace-env/request-registry.js";
import type { AgentSession, CreateSessionOptions, SessionStateResponse } from "./types.js";

export interface ManagedSession {
  session: AgentSession;
  harness: Harness<HarnessState>;
  eventBroker: EventBroker;
  unsubscribe: () => void;
}

export class SessionManager {
  private sessions = new Map<string, ManagedSession>();

  async create(options: CreateSessionOptions = {}): Promise<AgentSession> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const { harness } = await createHarness({
      sessionId,
      defaultModelId: options.modelId,
      workspacePolicy: options.workspacePolicy,
      cleanupWorkspaceOnDestroy: options.cleanupWorkspaceOnDestroy ?? true,
      initialYolo: true,
    });
    const eventBroker = new EventBroker(sessionId);
    const unsubscribe = harness.subscribe((event: HarnessEvent) => {
      const serverEvent: ServerEvent = {
        id: randomUUID(),
        sessionId,
        threadId: harness.getCurrentThreadId(),
        type: event.type,
        payload: event,
        createdAt: new Date().toISOString(),
      };
      eventBroker.emit(serverEvent);
    });

    await harness.init();

    const session: AgentSession = {
      id: sessionId,
      threadId: harness.getCurrentThreadId(),
      status: "idle",
      modeId: options.modeId ?? harness.getCurrentModeId(),
      modelId: options.modelId ?? harness.getCurrentModelId(),
      thinkingLevel: "medium",
      workspacePolicy: options.workspacePolicy ?? "auto",
      createdAt: now,
      updatedAt: now,
    };

    const provisioned = sessionWorkspaceRegistry.get(sessionId);
    if (provisioned?.providerKind === "sandbox") {
      const sandboxId = String(
        provisioned.sandboxInstance?.id
          ?? provisioned.sandboxInstance?.name
          ?? sessionId,
      );
      session.workspace = {
        kind: "sandbox",
        sandboxId,
        provider: "blaxel",
      };
    }

    if (options.modeId && options.modeId !== harness.getCurrentModeId()) {
      await harness.switchMode({ modeId: options.modeId });
      session.modeId = options.modeId;
    }

    this.sessions.set(sessionId, {
      session,
      harness,
      eventBroker,
      unsubscribe,
    });
    registerWorkspaceEnvRuntime(sessionId, { harness, session, eventBroker });

    return session;
  }

  get(sessionId: string): ManagedSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  async getState(sessionId: string): Promise<SessionStateResponse | null> {
    const managed = this.sessions.get(sessionId);
    if (!managed) return null;
    const displayState = managed.harness.getDisplayState();
    return {
      session: managed.session,
      displayState: {
        ...displayState,
        activeTools: Object.fromEntries(displayState.activeTools),
        toolInputBuffers: Object.fromEntries(displayState.toolInputBuffers),
        activeSubagents: Object.fromEntries(displayState.activeSubagents),
        modifiedFiles: Object.fromEntries(displayState.modifiedFiles),
      },
      messages: await managed.harness.listMessages(),
      threads: (await managed.harness.listThreads()).map((thread) => ({
        ...thread,
        createdAt: thread.createdAt instanceof Date ? thread.createdAt.toISOString() : thread.createdAt,
        updatedAt: thread.updatedAt instanceof Date ? thread.updatedAt.toISOString() : thread.updatedAt,
      })),
    };
  }

  listSessions(): AgentSession[] {
    return [...this.sessions.values()].map((managed) => managed.session);
  }

  async destroy(sessionId: string): Promise<boolean> {
    const managed = this.sessions.get(sessionId);
    if (!managed) return false;
    managed.unsubscribe();
    managed.eventBroker.destroy();
    const provisioned = sessionWorkspaceRegistry.get(sessionId);
    if (provisioned?.cleanup) await provisioned.cleanup();
    sessionWorkspaceRegistry.delete(sessionId);
    unregisterWorkspaceEnvRuntime(sessionId);
    this.sessions.delete(sessionId);
    return true;
  }

  get size(): number {
    return this.sessions.size;
  }
}
