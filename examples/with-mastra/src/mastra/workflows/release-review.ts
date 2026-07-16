import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod/v4";

const briefSchema = z.object({
  project: z.string().min(1),
  summary: z.string().min(1),
});

const reviewResultSchema = briefSchema.extend({
  reviewApproved: z.boolean(),
  reviewNote: z.string(),
});

const finalResultSchema = reviewResultSchema.extend({
  publishApproved: z.boolean(),
  publishNote: z.string(),
  outcome: z.enum(["published", "changes-requested"]),
});

const resumeSchema = z.object({
  approved: z.boolean(),
  note: z.string(),
});

const suspendSchema = z.object({
  stage: z.enum(["review", "publish"]),
  title: z.string(),
  description: z.string(),
});

const reviewStep = createStep({
  id: "review-brief",
  inputSchema: briefSchema,
  outputSchema: reviewResultSchema,
  resumeSchema,
  suspendSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData) {
      return suspend({
        stage: "review",
        title: `Review ${inputData.project}`,
        description: inputData.summary,
      });
    }

    return {
      ...inputData,
      reviewApproved: resumeData.approved,
      reviewNote: resumeData.note,
    };
  },
});

const publishStep = createStep({
  id: "approve-publish",
  inputSchema: reviewResultSchema,
  outputSchema: finalResultSchema,
  resumeSchema,
  suspendSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData) {
      return suspend({
        stage: "publish",
        title: `Publish ${inputData.project}`,
        description: inputData.reviewApproved
          ? "Review passed. Confirm the release window."
          : "Review requested changes. Confirm whether to publish anyway.",
      });
    }

    return {
      ...inputData,
      publishApproved: resumeData.approved,
      publishNote: resumeData.note,
      outcome: resumeData.approved
        ? ("published" as const)
        : ("changes-requested" as const),
    };
  },
});

export const releaseReviewWorkflow = createWorkflow({
  id: "release-review",
  inputSchema: briefSchema,
  outputSchema: finalResultSchema,
})
  .then(reviewStep)
  .then(publishStep)
  .commit();
