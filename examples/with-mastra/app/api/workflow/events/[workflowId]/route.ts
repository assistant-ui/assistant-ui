import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type WorkflowWatchPayload = {
  currentStep?: { id: string };
  workflowState?: {
    status?: string;
    steps?: Record<string, unknown>;
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;

  try {
    const workflow = mastra.getWorkflow("hiringWorkflow");
    if (!workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const run = await workflow.createRun({ runId: workflowId });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch {
              isClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch {
              isClosed = true;
            }
          }
        };

        try {
          const unwatch = run.watch((event) => {
            if (isClosed) return;

            const payload = event?.payload as WorkflowWatchPayload | undefined;
            const currentStep = payload?.currentStep;
            const workflowState = payload?.workflowState;

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

          const heartbeat = {
            type: "heartbeat",
            data: { workflowId, status: "connected" },
            timestamp: new Date().toISOString(),
          };
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));

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
          }, 30000);

          request.signal.addEventListener("abort", () => {
            clearInterval(heartbeatInterval);
            unwatch();
            safeClose();
          });
        } catch (error) {
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
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
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
