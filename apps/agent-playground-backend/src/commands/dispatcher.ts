import { randomBytes } from "node:crypto";
import type { Harness } from "@mastra/core/harness";
import { RequestContext } from "@mastra/core/request-context";
import type { EventBroker } from "../events/EventBroker.js";
import type { HarnessState } from "../schema.js";
import type { AgentSession } from "../sessions/types.js";
import {
  skipWorkspaceEnvRequest,
  submitWorkspaceEnv,
} from "../workspace-env/request-registry.js";
import type { CommandResult, SessionCommand } from "./types.js";

export async function dispatchCommand(
  harness: Harness<HarnessState>,
  command: SessionCommand,
  session: AgentSession,
  _eventBroker: EventBroker,
): Promise<CommandResult> {
  try {
    switch (command.type) {
      case "sendMessage": {
        session.status = "running";
        session.updatedAt = new Date().toISOString();
        await harness.selectOrCreateThread();
        session.threadId = harness.getCurrentThreadId();
        const traceId = randomBytes(16).toString("hex");
        const requestContext = new RequestContext();
        requestContext.set("augmentTrace", {
          traceId,
          sessionId: session.id,
          threadId: session.threadId,
        });

        harness
          .sendMessage({
            content: command.payload.content,
            files: command.payload.files,
            requestContext,
            tracingOptions: {
              traceId,
              metadata: {
                sessionId: session.id,
                threadId: session.threadId,
              },
              tags: [`session:${session.id}`],
            },
          })
          .finally(() => {
            session.status = "idle";
            session.updatedAt = new Date().toISOString();
          });

        return { accepted: true, traceId };
      }

      case "abort": {
        harness.abort();
        session.status = "idle";
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }

      case "switchModel": {
        await harness.switchModel({
          modelId: command.payload.modelId,
          scope: command.payload.scope,
        });
        session.modelId = command.payload.modelId;
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }

      case "switchMode": {
        await harness.switchMode({ modeId: command.payload.modeId });
        session.modeId = command.payload.modeId;
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }

      case "setThinkingLevel": {
        await harness.setState({ thinkingLevel: command.payload.level } as any);
        session.thinkingLevel = command.payload.level;
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }

      case "approveToolCall": {
        harness.respondToToolApproval({ decision: command.payload.decision });
        return { accepted: true };
      }

      case "respondToToolSuspension": {
        await harness.respondToToolSuspension({
          resumeData: command.payload.resumeData,
        });
        return { accepted: true };
      }

      case "submitWorkspaceEnv": {
        const result = await submitWorkspaceEnv(session.id, {
          requestId: command.payload.requestId,
          appPath: command.payload.appPath,
          values: command.payload.values,
        });
        session.updatedAt = new Date().toISOString();
        return result;
      }

      case "skipWorkspaceEnv": {
        const result = await skipWorkspaceEnvRequest(session.id, {
          requestId: command.payload.requestId,
        });
        session.updatedAt = new Date().toISOString();
        return result;
      }

      case "respondToQuestion": {
        harness.respondToQuestion({
          questionId: command.payload.questionId,
          answer: command.payload.answer,
        });
        return { accepted: true };
      }

      case "respondToPlanApproval": {
        await harness.respondToPlanApproval({
          planId: command.payload.planId,
          response: {
            action: command.payload.action,
            feedback: command.payload.feedback,
          },
        });
        return { accepted: true };
      }

      case "createThread": {
        await harness.createThread();
        session.threadId = harness.getCurrentThreadId();
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }

      case "switchThread": {
        await harness.switchThread({ threadId: command.payload.threadId });
        session.threadId = command.payload.threadId;
        session.updatedAt = new Date().toISOString();
        return { accepted: true };
      }
    }
  } catch (error) {
    return {
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
