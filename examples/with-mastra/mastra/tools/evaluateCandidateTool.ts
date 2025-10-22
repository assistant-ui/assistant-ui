import { z } from "zod";

export const evaluateCandidateTool = {
  description: "Submit a candidate screening evaluation with score and recommendation",
  parameters: z.object({
    candidateName: z.string().describe("The candidate's full name"),
    score: z.number().min(1).max(10).describe("Screening score from 1-10"),
    recommendation: z.enum(["proceed_to_interview", "reject", "needs_more_info"])
      .describe("Recommendation: proceed to interview, reject, or request more information"),
    strengths: z.array(z.string()).describe("Key strengths observed"),
    concerns: z.array(z.string()).describe("Any concerns or red flags"),
    notes: z.string().describe("Additional notes or context"),
  }),
  execute: async ({ candidateName, score, recommendation, strengths, concerns, notes }: {
    candidateName: string;
    score: number;
    recommendation: "proceed_to_interview" | "reject" | "needs_more_info";
    strengths: string[];
    concerns: string[];
    notes: string;
  }) => {
    // Mock evaluation submission
    const evaluation = {
      candidateName,
      score,
      recommendation,
      strengths,
      concerns,
      notes,
      evaluatedBy: "screening-agent",
      evaluatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      evaluation,
      message: `Screening evaluation submitted for ${candidateName}. Recommendation: ${recommendation}`,
    };
  },
};
