/**
 * Harness state schema.
 *
 * Defines the shape of per-session state managed by the Harness.
 * Adapted from mastracode/src/schema.ts — stripped browser settings,
 * kept full permission/thinking/task/workspace interfaces.
 */

import { z } from "zod";

export const stateSchema = z.object({
  // Project info
  sessionId: z.string().optional(),
  projectPath: z.string().optional(),
  projectName: z.string().optional(),
  gitBranch: z.string().optional(),

  // Current model
  lastCommand: z.string().optional(),
  currentModelId: z.string().default(""),

  // Subagent model override (per-thread)
  subagentModelId: z.string().optional(),

  // Thinking level for model reasoning effort
  thinkingLevel: z
    .enum(["off", "low", "medium", "high", "xhigh"])
    .default("medium"),

  // YOLO mode — auto-approve all tool calls
  yolo: z.boolean().default(true),

  // Permission rules — per-category and per-tool approval policies
  permissionRules: z
    .object({
      categories: z
        .record(z.string(), z.enum(["allow", "ask", "deny"]))
        .default({}),
      tools: z.record(z.string(), z.enum(["allow", "ask", "deny"])).default({}),
    })
    .default({ categories: {}, tools: {} }),

  // Workspace provisioning — lazy by default
  workspacePolicy: z.enum(["auto", "none", "required"]).default("auto"),
  workspaceProvisioned: z.boolean().default(false),

  // Workspace provider — 'local' (session folder) or 'sandbox' (cloud)
  workspaceProvider: z.enum(["sandbox"]).default("sandbox"),
  // Absolute path to the agent's writable workspace folder (set by provider at session start)
  workspacePath: z.string().optional(),
  // How the workspace was provisioned
  workspaceProvisionMode: z.enum(["empty"]).optional(),
  // Cloud sandbox provider (only relevant when workspaceProvider === 'sandbox')
  sandboxProvider: z.enum(["blaxel"]).optional(),
  // Cloud sandbox instance identifier
  sandboxId: z.string().optional(),

  // Task list (persisted per-thread)
  tasks: z
    .array(
      z.object({
        content: z.string(),
        status: z.enum(["pending", "in_progress", "completed"]),
        activeForm: z.string(),
      }),
    )
    .default([]),

  // Sandbox allowed paths (per-thread, absolute paths allowed in addition to project root)
  sandboxAllowedPaths: z.array(z.string()).default([]),

  // Active plan (set when a plan is approved in Plan mode)
  activePlan: z
    .object({
      title: z.string(),
      plan: z.string(),
      approvedAt: z.string(),
    })
    .nullable()
    .default(null),
});

export type HarnessState = z.infer<typeof stateSchema>;
