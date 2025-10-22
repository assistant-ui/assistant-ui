import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Guard against non-object payloads
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: "Expected a JSON object",
        },
        { status: 400 },
      );
    }

    const { candidateName, candidateEmail, resume, position } = body;

    // Validate required fields
    if (!candidateName || !candidateEmail || !resume || !position) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["candidateName", "candidateEmail", "resume", "position"],
        },
        { status: 400 },
      );
    }

    // Get the hiring workflow
    const workflow = mastra.getWorkflow("hiringWorkflow");
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow 'hiringWorkflow' not found" },
        { status: 404 },
      );
    }

    // Create a workflow run
    const run = await workflow.createRunAsync();

    // Start the workflow
    const result = await run.start({
      inputData: {
        candidateName,
        candidateEmail,
        resume,
        position,
      },
    });

    // Return the workflow state
    return NextResponse.json({
      runId: run.runId,
      status: result.status,
      result: result,
      suspended: result.status === "suspended" ? result.suspended : undefined,
    });
  } catch (error) {
    console.error("Workflow API error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
