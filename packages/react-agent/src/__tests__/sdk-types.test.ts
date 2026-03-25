import { describe, expect, it } from "vitest";
import {
  HttpAgentClient,
  type AgentClientInterface,
  type CreateTaskOptions,
  type SDKEvent,
  type TaskHandle,
  type TaskStatus,
  type ToolExecutionStatus,
} from "../index";

describe("SDK and type contracts", () => {
  it("AgentClientInterface can be implemented", async () => {
    const client: AgentClientInterface = {
      async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
        return { id: "task-1", prompt: options.prompt };
      },
      async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
        yield {
          type: "task_started",
          taskId,
          data: { ok: true },
          timestamp: new Date(),
        };
      },
      async approveToolUse() {
        return;
      },
      async cancelTask() {
        return;
      },
    };

    const handle = await client.createTask({ prompt: "Run checks" });
    expect(handle.id).toBe("task-1");

    const event = await client.streamEvents(handle.id).next();
    expect(event.value?.type).toBe("task_started");
  });

  it("runtime status unions accept expected values", () => {
    const taskStatuses: TaskStatus[] = ["draft", "running", "completed"];
    const toolStatuses: ToolExecutionStatus[] = [
      "pending",
      "running",
      "completed",
      "failed",
    ];

    expect(taskStatuses).toContain("running");
    expect(toolStatuses).toContain("failed");
  });

  it("HttpAgentClient is constructable with config", () => {
    const client = new HttpAgentClient({
      apiKey: "test-key",
      baseUrl: "/api/agent",
    });

    expect(client).toBeInstanceOf(HttpAgentClient);
  });
});
