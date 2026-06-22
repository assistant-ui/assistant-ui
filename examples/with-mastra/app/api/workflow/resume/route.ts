import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";
import { isNonEmptyString, readJsonObject } from "../requestBody";

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonObject(request);
    if ("response" in parsed) return parsed.response;

    const body = parsed.body;
    const { runId, stepId, resumeData } = body;

    if (!isNonEmptyString(runId)) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    if (!isNonEmptyString(stepId)) {
      return NextResponse.json(
        { error: "stepId is required" },
        { status: 400 },
      );
    }

    const workflow = mastra.getWorkflow("hiringWorkflow");
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow 'hiringWorkflow' not found" },
        { status: 404 },
      );
    }

    const run = await workflow.createRun({ runId });

    const result = await run.resume({
      step: stepId,
      resumeData,
    });

    return NextResponse.json({
      runId,
      status: result.status,
      result,
      suspended: result.status === "suspended" ? result.suspended : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to resume workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
