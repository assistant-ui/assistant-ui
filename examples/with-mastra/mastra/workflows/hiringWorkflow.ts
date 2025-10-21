import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Step 1: Screening Step
const screeningStep = createStep({
  id: "screening-step",
  description: "Initial candidate screening and evaluation",

  inputSchema: z.object({
    candidateName: z.string(),
    candidateEmail: z.string().email(),
    resume: z.string(),
    position: z.string(),
  }),

  outputSchema: z.object({
    candidateName: z.string(),
    screeningScore: z.number(),
    recommendation: z.string(),
    proceedToInterview: z.boolean(),
  }),

  resumeSchema: z.object({
    approved: z.boolean(),
    approverNotes: z.string().optional(),
  }),

  suspendSchema: z.object({
    candidateName: z.string(),
    screeningScore: z.number(),
    recommendation: z.string(),
    evaluationSummary: z.string(),
  }),

  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    const { candidateName, candidateEmail, resume, position } = inputData;

    // If we don't have approval yet, suspend for human review
    if (!resumeData) {
      // Call the screening agent to evaluate the candidate
      const screeningAgent = mastra.getAgent("screeningAgent");

      const evaluationPrompt = `Please evaluate this candidate for the ${position} role:

Name: ${candidateName}
Email: ${candidateEmail}

Resume/Background:
${resume}

Provide a comprehensive screening evaluation including:
1. A score from 1-10 based on qualifications
2. Key strengths you observe
3. Any concerns or areas needing clarification
4. A clear recommendation: proceed_to_interview, reject, or needs_more_info

Format your response clearly with these sections.`;

      const agentResponse = await screeningAgent.generate(evaluationPrompt);

      console.log("Screening Agent Response:", {
        text: agentResponse.text,
        textLength: agentResponse.text?.length || 0,
        hasToolCalls: !!agentResponse.toolCalls,
        toolCallsLength: agentResponse.toolCalls?.length || 0,
      });

      // Use the agent's text response directly
      const evaluation = {
        candidateName,
        screeningScore: 7.5,
        recommendation: "proceed_to_interview",
        evaluationSummary: agentResponse.text || `Evaluated ${candidateName} for ${position}. The AI agent has completed the screening assessment.`,
      };

      console.log("Screening evaluation to suspend:", evaluation);

      // Suspend workflow and wait for hiring manager approval
      return await suspend(evaluation);
    }

    // We have approval, proceed
    const { approved } = resumeData;

    if (!approved) {
      throw new Error("Candidate rejected at screening stage");
    }

    return {
      candidateName,
      screeningScore: 7.5,
      recommendation: "proceed_to_interview",
      proceedToInterview: true,
    };
  },
});

// Step 2: Interview Step
const interviewStep = createStep({
  id: "interview-step",
  description: "Technical and behavioral interview",

  inputSchema: z.object({
    candidateName: z.string(),
    screeningScore: z.number(),
    recommendation: z.string(),
    proceedToInterview: z.boolean(),
  }),

  outputSchema: z.object({
    candidateName: z.string(),
    technicalScore: z.number(),
    culturalScore: z.number(),
    overallScore: z.number(),
    hiringDecision: z.string(),
  }),

  resumeSchema: z.object({
    hiringDecision: z.enum(["hire", "reject", "second_interview"]),
    decisionNotes: z.string().optional(),
  }),

  suspendSchema: z.object({
    candidateName: z.string(),
    technicalScore: z.number(),
    culturalScore: z.number(),
    recommendation: z.string(),
    interviewSummary: z.string(),
  }),

  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    const { candidateName } = inputData;

    // If we don't have a hiring decision yet, suspend
    if (!resumeData) {
      const interviewAgent = mastra.getAgent("interviewAgent");

      const interviewPrompt = `Conduct a technical interview for ${candidateName}.

Previous screening score: ${inputData.screeningScore}/10
Screening recommendation: ${inputData.recommendation}

Based on the candidate's background and screening results, conduct a thorough interview assessment covering:
1. Technical skills and expertise
2. Cultural fit and team compatibility
3. Problem-solving approach
4. Communication abilities

Provide:
- Technical skills score (1-10)
- Cultural fit score (1-10)
- Overall hiring recommendation: strong_hire, hire, no_hire, or undecided
- Detailed reasoning for your assessment

Format your response clearly with these sections.`;

      const agentResponse = await interviewAgent.generate(interviewPrompt);

      console.log("Interview Agent Response:", {
        text: agentResponse.text,
        textLength: agentResponse.text?.length || 0,
      });

      // Use the agent's text response directly
      const interview = {
        candidateName,
        technicalScore: 8.0,
        culturalScore: 9.0,
        recommendation: "hire",
        interviewSummary: agentResponse.text || `Interviewed ${candidateName}. The AI agent has completed the technical and behavioral assessment.`,
      };

      return await suspend(interview);
    }

    // We have a decision
    const { hiringDecision } = resumeData;

    return {
      candidateName,
      technicalScore: 8.0,
      culturalScore: 9.0,
      overallScore: 8.5,
      hiringDecision,
    };
  },
});

// Compose workflow
export const hiringWorkflow = createWorkflow({
  id: "hiring-workflow",
  description: "Complete hiring process from screening to final decision",

  inputSchema: z.object({
    candidateName: z.string(),
    candidateEmail: z.string().email(),
    resume: z.string(),
    position: z.string(),
  }),

  outputSchema: z.object({
    candidateName: z.string(),
    hiringDecision: z.string(),
    overallScore: z.number(),
  }),
})
  .then(screeningStep)
  .then(interviewStep)
  .commit();
