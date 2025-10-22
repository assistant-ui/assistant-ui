import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, stepId, resumeData } = body;

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    // Get the hiring workflow
    const workflow = mastra.getWorkflow("hiring-workflow");
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow 'hiring-workflow' not found" },
        { status: 404 },
      );
    }

    // Recreate the run with the existing runId
    const run = await workflow.createRunAsync({ runId });

    // Resume the workflow with the provided data
    const result = await run.resume({
      step: stepId,
      resumeData,
    });

    return NextResponse.json({
      runId,
      status: result.status,
      result: result,
      suspended: result.status === "suspended" ? result.suspended : undefined,
    });
  } catch (error) {
    console.error("Workflow Resume API error:", error);
    return NextResponse.json(
      {
        error: "Failed to resume workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
