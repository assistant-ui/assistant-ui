import { z } from "zod";

export const conductInterviewTool = {
  description:
    "Submit an interview assessment with technical evaluation and hiring recommendation",
  parameters: z.object({
    candidateName: z.string().describe("The candidate's full name"),
    technicalScore: z
      .number()
      .min(1)
      .max(10)
      .describe("Technical skills score from 1-10"),
    culturalScore: z
      .number()
      .min(1)
      .max(10)
      .describe("Cultural fit score from 1-10"),
    recommendation: z
      .enum(["strong_hire", "hire", "no_hire", "undecided"])
      .describe("Hiring recommendation"),
    technicalNotes: z.string().describe("Notes on technical assessment"),
    behavioralNotes: z.string().describe("Notes on behavioral assessment"),
    nextSteps: z.string().optional().describe("Recommended next steps"),
  }),
  execute: async ({
    candidateName,
    technicalScore,
    culturalScore,
    recommendation,
    technicalNotes,
    behavioralNotes,
    nextSteps,
  }: {
    candidateName: string;
    technicalScore: number;
    culturalScore: number;
    recommendation: "strong_hire" | "hire" | "no_hire" | "undecided";
    technicalNotes: string;
    behavioralNotes: string;
    nextSteps?: string;
  }) => {
    // Mock interview submission
    const interview = {
      candidateName,
      scores: {
        technical: technicalScore,
        cultural: culturalScore,
        overall: Math.round((technicalScore + culturalScore) / 2),
      },
      recommendation,
      technicalNotes,
      behavioralNotes,
      nextSteps,
      interviewedBy: "interview-agent",
      interviewedAt: new Date().toISOString(),
    };

    return {
      success: true,
      interview,
      message: `Interview assessment submitted for ${candidateName}. Recommendation: ${recommendation}`,
    };
  },
};
