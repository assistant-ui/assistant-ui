import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;

  console.log("Workflow Events SSE: Client connected", { workflowId });

  try {
    // Get the hiring workflow
    const workflow = mastra.getWorkflow("hiringWorkflow");
    if (!workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Recreate the run with existing workflowId
    const run = await workflow.createRunAsync({ runId: workflowId });

    // Note: We don't check for completion state here since Mastra workflows
    // don't have a clear "success" status - they just stop being "running" or "suspended".
    // We'll rely on the watch() API to detect when the workflow is done.

    // Use Mastra's native streaming with streamVNext for better event types
    // Note: streamVNext requires the workflow to be actively running, so we use
    // a different approach - we'll watch for state changes instead
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error("Workflow Events SSE: Enqueue error:", error);
              isClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch (error) {
              console.error("Workflow Events SSE: Close error:", error);
            }
          }
        };

        try {
          // Note: getState() returns empty object for runs created with existing runId,
          // so we rely on the initial state being set from the /api/workflow response
          // and watch() for future changes

          // Watch for workflow state changes using Mastra's watch API
          const unwatch = run.watch((event) => {
            if (isClosed) return;

            const currentStep = event?.payload?.currentStep;
            const workflowState = event?.payload?.workflowState;

            if (!currentStep || !workflowState) return;

            // Send workflow state update event
            const updateEvent = {
              type: "workflow-state-update",
              data: {
                workflowId,
                currentStep: currentStep.id,
                status: workflowState["status"],
                suspended: workflowState["status"] === "suspended",
                steps: workflowState["steps"],
              },
              timestamp: new Date().toISOString(),
            };

            safeEnqueue(
              encoder.encode(`data: ${JSON.stringify(updateEvent)}\n\n`),
            );

            // Check if workflow is in a terminal state (not running, suspended, pending, or waiting)
            const isTerminal =
              workflowState["status"] !== "running" &&
              workflowState["status"] !== "suspended" &&
              workflowState["status"] !== "pending" &&
              workflowState["status"] !== "waiting";

            if (isTerminal) {
              const completeEvent = {
                type: "workflow-complete",
                data: {
                  workflowId,
                  status: workflowState["status"],
                  result: workflowState,
                },
                timestamp: new Date().toISOString(),
              };

              safeEnqueue(
                encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`),
              );
              safeEnqueue(encoder.encode("data: [DONE]\n\n"));
              unwatch();
              safeClose();
            }
          });

          // Send initial heartbeat to confirm connection
          const heartbeat = {
            type: "heartbeat",
            data: { workflowId, status: "connected" },
            timestamp: new Date().toISOString(),
          };
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));

          // Keep connection alive with periodic heartbeats
          const heartbeatInterval = setInterval(() => {
            if (isClosed) {
              clearInterval(heartbeatInterval);
              return;
            }

            const heartbeat = {
              type: "heartbeat",
              data: { workflowId },
              timestamp: new Date().toISOString(),
            };
            safeEnqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`),
            );
          }, 30000); // Every 30 seconds

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            console.log("Workflow Events SSE: Client disconnected", {
              workflowId,
            });
            clearInterval(heartbeatInterval);
            unwatch();
            safeClose();
          });
        } catch (error) {
          console.error("Workflow Events SSE: Stream error:", error);
          if (!isClosed) {
            const errorEvent = {
              type: "error",
              data: {
                workflowId,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              timestamp: new Date().toISOString(),
            };
            safeEnqueue(
              encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
            );
            safeClose();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Workflow Events SSE: Setup error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
