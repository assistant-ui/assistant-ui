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

  execute: async ({ inputData, resumeData, suspend, mastra, suspendData }) => {
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

      // Parse the agent's response to extract scores and recommendation
      const responseText = agentResponse.text || "";

      // Extract score (look for patterns like "Score: 7.5" or "7.5/10")
      const scoreMatch = responseText.match(/(?:score|rating).*?(\d+(?:\.\d+)?)/i);
      const screeningScore = scoreMatch ? parseFloat(scoreMatch[1]) : 7.5;

      // Extract recommendation (look for keywords)
      const lowerResponse = responseText.toLowerCase();
      let recommendation = "needs_more_info";
      if (lowerResponse.includes("proceed_to_interview") || lowerResponse.includes("proceed to interview")) {
        recommendation = "proceed_to_interview";
      } else if (lowerResponse.includes("reject")) {
        recommendation = "reject";
      }

      const evaluation = {
        candidateName,
        screeningScore,
        recommendation,
        evaluationSummary:
          responseText ||
          `Evaluated ${candidateName} for ${position}. The AI agent has completed the screening assessment.`,
      };

      // Suspend workflow and wait for hiring manager approval
      return await suspend(evaluation);
    }

    // We have approval, proceed - use suspendData which contains the original evaluation
    const { approved } = resumeData;

    if (!approved) {
      throw new Error("Candidate rejected at screening stage");
    }

    // Return the screening data from the original suspend call
    return {
      candidateName: suspendData?.candidateName || candidateName,
      screeningScore: suspendData?.screeningScore || 7.5,
      recommendation: suspendData?.recommendation || "proceed_to_interview",
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

  execute: async ({ inputData, resumeData, suspend, mastra, suspendData }) => {
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

      // Parse the agent's response to extract scores and recommendation
      const responseText = agentResponse.text || "";

      // Extract technical score
      const techScoreMatch = responseText.match(/technical.*?(?:score|skills).*?(\d+(?:\.\d+)?)/i);
      const technicalScore = techScoreMatch ? parseFloat(techScoreMatch[1]) : 8.0;

      // Extract cultural score
      const culturalScoreMatch = responseText.match(/cultural.*?(?:score|fit).*?(\d+(?:\.\d+)?)/i);
      const culturalScore = culturalScoreMatch ? parseFloat(culturalScoreMatch[1]) : 9.0;

      // Extract recommendation
      const lowerResponse = responseText.toLowerCase();
      let recommendation = "undecided";
      if (lowerResponse.includes("strong_hire") || lowerResponse.includes("strong hire")) {
        recommendation = "strong_hire";
      } else if (lowerResponse.includes("hire") && !lowerResponse.includes("no_hire")) {
        recommendation = "hire";
      } else if (lowerResponse.includes("no_hire") || lowerResponse.includes("no hire")) {
        recommendation = "no_hire";
      }

      const interview = {
        candidateName,
        technicalScore,
        culturalScore,
        recommendation,
        interviewSummary:
          responseText ||
          `Interviewed ${candidateName}. The AI agent has completed the technical and behavioral assessment.`,
      };

      return await suspend(interview);
    }

    // We have a decision - use suspendData which contains the original interview scores
    const { hiringDecision } = resumeData;

    return {
      candidateName,
      technicalScore: suspendData?.technicalScore || 8.0,
      culturalScore: suspendData?.culturalScore || 9.0,
      overallScore: suspendData
        ? (suspendData.technicalScore + suspendData.culturalScore) / 2
        : 8.5,
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
