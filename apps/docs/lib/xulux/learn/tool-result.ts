import { z } from "zod";
import type { LearnCourseStepResult } from "./types";

const fileChangeSchema = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted"]),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

export const learnCourseStepResultSchema = z.union([
  z.object({
    course: z.object({
      id: z.string(),
      status: z.literal("in_progress"),
    }),
    step: z.object({
      id: z.string(),
      title: z.string(),
      index: z.number().int().positive(),
      total: z.number().int().positive(),
      content: z.string(),
    }),
    stage: z.object({
      id: z.string(),
      previewPath: z.string(),
      downloadUrl: z.string(),
      focusFiles: z.array(z.string()),
    }),
    changes: z.object({
      files: z.array(fileChangeSchema),
      additions: z.number().int().nonnegative(),
      deletions: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    course: z.object({
      id: z.string(),
      status: z.literal("completed"),
    }),
    finalStage: z.object({
      id: z.string(),
      previewPath: z.string(),
      downloadUrl: z.string(),
    }),
  }),
]);

export function parseLearnCourseStepResult(
  value: unknown,
): LearnCourseStepResult | null {
  const parsed = learnCourseStepResultSchema.safeParse(value);
  return parsed.success ? (parsed.data as LearnCourseStepResult) : null;
}
