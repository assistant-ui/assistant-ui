/**
 * API route for agent task management.
 * Handles creating tasks, approvals, and cancellations.
 *
 * This runs on the server and uses the real Claude Agent SDK.
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { CreateTaskOptions } from "@assistant-ui/react-agent";
import { TaskController } from "./TaskController";
import { taskStore } from "./store";
import { logger } from "./logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    logger.info("api", `Received request: ${action}`);

    switch (action) {
      case "create":
        return handleCreateTask(params as CreateTaskOptions);
      case "message":
        return handleMessage(params);
      case "approve":
        return handleApproval(params);
      case "cancel":
        return handleCancel(params);
      default:
        logger.warn("api", `Unknown action: ${action}`);
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("api", "API error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

async function handleCreateTask(options: CreateTaskOptions) {
  const taskId = `task_${nanoid()}`;

  logger.info("task", "Creating new task", { taskId, prompt: options.prompt });

  const controller = new TaskController(taskId, options);
  taskStore.set(taskId, controller);

  controller.start();

  logger.info("task", "Task started successfully", { taskId });

  return NextResponse.json({ taskId });
}

async function handleApproval({
  taskId,
  approvalId,
  decision,
}: {
  taskId: string;
  approvalId: string;
  decision: "allow" | "deny";
}) {
  logger.info("approval", `Processing ${decision} decision`, {
    taskId,
    approvalId,
  });

  const controller = taskStore.get(taskId);
  if (!controller) {
    logger.error("approval", "Task not found", { taskId });
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  controller.resolveApproval(approvalId, decision);
  logger.info("approval", "Approval resolved", {
    taskId,
    approvalId,
    decision,
  });

  return NextResponse.json({ success: true });
}

async function handleMessage({
  taskId,
  message,
}: {
  taskId: string;
  message: string;
}) {
  logger.info("task", "User message received", {
    taskId,
    messageLength: message.length,
  });

  const controller = taskStore.get(taskId);
  if (!controller) {
    logger.error("task", "Task not found for message", { taskId });
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  controller.sendUserMessage(message);
  logger.info("task", "User message sent to controller", { taskId });

  return NextResponse.json({ success: true });
}

async function handleCancel({ taskId }: { taskId: string }) {
  logger.info("task", "Cancellation requested", { taskId });

  const controller = taskStore.get(taskId);
  if (!controller) {
    logger.error("task", "Task not found for cancellation", { taskId });
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  controller.cancel();
  logger.info("task", "Task cancelled", { taskId });

  return NextResponse.json({ success: true });
}
