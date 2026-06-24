import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";
import { isNonEmptyString, readJsonObject } from "./requestBody";

export async function POST(request: NextRequest) {
  try {
    if (!process.env["OPENAI_API_KEY"]) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is required to run Mastra workflows" },
        { status: 500 },
      );
    }

    const parsed = await readJsonObject(request);
    if ("response" in parsed) return parsed.response;

    const body = parsed.body;
    const { candidateName, candidateEmail, resume, position } = body;

    if (
      !isNonEmptyString(candidateName) ||
      !isNonEmptyString(candidateEmail) ||
      !isNonEmptyString(resume) ||
      !isNonEmptyString(position)
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["candidateName", "candidateEmail", "resume", "position"],
        },
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

    const run = await workflow.createRun();

    const result = await run.start({
      inputData: {
        candidateName,
        candidateEmail,
        resume,
        position,
      },
    });

    return NextResponse.json({
      runId: run.runId,
      status: result.status,
      result,
      suspended: result.status === "suspended" ? result.suspended : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
