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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "create":
        return handleCreateTask(params as CreateTaskOptions);
      case "approve":
        return handleApproval(params);
      case "cancel":
        return handleCancel(params);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

async function handleCreateTask(options: CreateTaskOptions) {
  const taskId = `task_${nanoid()}`;

  // Create task controller
  const controller = new TaskController(taskId, options);
  taskStore.set(taskId, controller);

  // Start the task in the background
  controller.start();

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
  const controller = taskStore.get(taskId);
  if (!controller) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  controller.resolveApproval(approvalId, decision);
  return NextResponse.json({ success: true });
}

async function handleCancel({ taskId }: { taskId: string }) {
  const controller = taskStore.get(taskId);
  if (!controller) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  controller.cancel();
  return NextResponse.json({ success: true });
}
