import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EventBroker } from "../events/EventBroker.js";
import {
  createWorkspaceEnvRequest,
  registerWorkspaceEnvRuntime,
  skipWorkspaceEnvRequest,
  unregisterWorkspaceEnvRuntime,
} from "../workspace-env/request-registry.js";

describe("workspace env request registry", () => {
  it("skips an env request without sending a synthetic agent message", async () => {
    const sessionId = "env-skip-session";
    const events: unknown[] = [];
    const agentMessages: string[] = [];
    const eventBroker = new EventBroker(sessionId);
    eventBroker.subscribe((event) => events.push(event));
    const session = {
      id: sessionId,
      status: "idle",
      updatedAt: new Date().toISOString(),
    };
    const harness = {
      getCurrentThreadId: () => "thread-1",
      isRunning: () => false,
      sendMessage: async ({ content }: { content: string }) => {
        agentMessages.push(content);
      },
      followUp: async ({ content }: { content: string }) => {
        agentMessages.push(`follow-up:${content}`);
      },
    };

    registerWorkspaceEnvRuntime(sessionId, {
      harness: harness as any,
      session: session as any,
      eventBroker,
    });

    try {
      const request = createWorkspaceEnvRequest({
        sessionId,
        appPath: "/workspace/app",
        reason: "Need key.",
        required: [
          {
            name: "OPENAI_API_KEY",
            required: true,
            secret: true,
            envFile: ".env.local",
          },
        ],
        optional: [],
      });

      await skipWorkspaceEnvRequest(sessionId, {
        requestId: request.requestId,
      });

      assert.equal(
        events.some((event: any) => event.type === "workspace_env_skipped"),
        true,
      );
      assert.equal(agentMessages.length, 0);
    } finally {
      unregisterWorkspaceEnvRuntime(sessionId);
    }
  });
});
