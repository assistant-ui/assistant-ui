import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const draftReleaseBrief = createTool({
  id: "draft-release-brief",
  description:
    "Turn a product change into a structured release brief before drafting release notes.",
  inputSchema: z.object({
    change: z.string().describe("The product or engineering change to release"),
    audience: z
      .enum(["developers", "operators", "end-users"])
      .describe("The primary audience for the release"),
  }),
  outputSchema: z.object({
    headline: z.string(),
    audience: z.string(),
    sections: z.array(z.string()),
  }),
  execute: async ({ change, audience }) => ({
    headline: change.trim().replace(/[.!?]+$/, ""),
    audience,
    sections: ["What changed", "Why it matters", "Upgrade notes"],
  }),
});

export const assessRolloutRisk = createTool({
  id: "assess-rollout-risk",
  description:
    "Classify rollout risk and return the checks required before deployment.",
  inputSchema: z.object({
    change: z.string().describe("The change being evaluated"),
    touchesPersistence: z
      .boolean()
      .describe("Whether the change reads or writes persistent state"),
    hasRollback: z
      .boolean()
      .describe("Whether a tested rollback path is available"),
  }),
  outputSchema: z.object({
    level: z.enum(["low", "medium", "high"]),
    checks: z.array(z.string()),
  }),
  execute: async ({ touchesPersistence, hasRollback }) => {
    const level: "low" | "medium" | "high" = touchesPersistence
      ? hasRollback
        ? "medium"
        : "high"
      : hasRollback
        ? "low"
        : "medium";
    const checks = ["canary deployment", "error-rate alert", "owner sign-off"];
    if (touchesPersistence) checks.push("backup and restore verification");
    if (!hasRollback) checks.push("forward-fix runbook");
    return { level, checks };
  },
});
