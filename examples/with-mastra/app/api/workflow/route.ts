import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateName, candidateEmail, resume, position } = body;

    console.log("Workflow API: Starting hiring workflow", { candidateName, position });

    // Get the hiring workflow
    const workflow = mastra.getWorkflow("hiringWorkflow");
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow 'hiringWorkflow' not found" },
        { status: 404 }
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

    console.log("Workflow API: Workflow started", {
      runId: run.runId,
      status: result.status,
    });
    console.log("Workflow API: Full result:", JSON.stringify(result, null, 2));

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
      { status: 500 }
    );
  }
}
