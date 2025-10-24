"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MastraWorkflowConfig,
  MastraWorkflowState,
  MastraWorkflowCommand,
  MastraWorkflowInterrupt,
} from "./types";

// Real Mastra workflow API - connects to Next.js API routes
const mastraWorkflow = {
  start: async (
    workflowConfig: MastraWorkflowConfig & {
      context?: Record<string, any>;
      candidateData?: any;
    },
  ) => {
    // Call the workflow API
    const response = await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        workflowConfig.candidateData || {
          candidateName: "Test Candidate",
          candidateEmail: "test@example.com",
          resume: "Sample resume text",
          position: "Software Engineer",
        },
      ),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to start workflow");
    }

    const data = await response.json();

    // Transform API response to internal format
    return {
      id: data.runId,
      current: data.suspended?.[0] || "screening-step",
      status:
        data.status === "suspended"
          ? ("suspended" as const)
          : ("running" as const),
      context: workflowConfig.context || {},
      history: [
        {
          from: "none",
          to: "screening-step",
          event: "start",
          timestamp: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
      suspendData: data.status === "suspended" ? data.result : undefined,
    };
  },
  suspend: async (workflowId: string) => {
    // Suspend is handled automatically by the workflow when it calls suspend()
    return {
      id: workflowId,
      status: "suspended" as const,
      timestamp: new Date().toISOString(),
    };
  },
  resume: async (workflowId: string, input?: any) => {
    const response = await fetch("/api/workflow/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: workflowId,
        stepId: undefined, // Let the API determine which step
        resumeData: input,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to resume workflow");
    }

    const data = await response.json();

    return {
      id: data.runId,
      status:
        data.status === "suspended"
          ? ("suspended" as const)
          : data.status === "success"
            ? ("completed" as const)
            : ("running" as const),
      timestamp: new Date().toISOString(),
      suspendData: data.status === "suspended" ? data.result : undefined,
    };
  },
  sendCommand: async (workflowId: string, command: MastraWorkflowCommand) => {
    // Commands are handled via resume with specific resumeData
    if (command.transition) {
      return await mastraWorkflow.resume(workflowId, {
        transition: command.transition,
        context: command.context,
      });
    }
    return {
      id: workflowId,
      status: "running" as const,
      timestamp: new Date().toISOString(),
    };
  },
  subscribe: (
    workflowId: string,
    onUpdate: (event: { type: string; data: any; timestamp: string }) => void,
    onError?: (error: Error) => void,
  ) => {
    let isActive = true;
    const abortController = new AbortController();

    const connect = async () => {
      try {
        // Use fetch with GET request for SSE endpoint
        const response = await fetch(`/api/workflow/events/${workflowId}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to connect to workflow stream: ${response.status}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        // Read stream exactly like chat implementation
        while (isActive) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              // Handle [DONE] marker
              if (data === "[DONE]") {
                isActive = false;
                return;
              }

              try {
                const event = JSON.parse(data);

                // Ignore heartbeats (no action needed)
                if (event.type === "heartbeat") {
                  continue;
                }

                // Handle error events from server
                if (event.type === "error") {
                  const error = new Error(
                    event.data?.error || "Workflow stream error",
                  );
                  onError?.(error);
                  continue;
                }

                // Call update handler with parsed event
                onUpdate(event);
              } catch (error) {
                console.error("Workflow subscribe: Parse error:", error);
                onError?.(
                  error instanceof Error
                    ? error
                    : new Error("Failed to parse workflow event"),
                );
              }
            }
          }
        }
      } catch (error) {
        if (!isActive) return; // Ignore errors after unsubscribe

        console.error("Workflow subscribe error:", error);
        onError?.(
          error instanceof Error
            ? error
            : new Error("Workflow subscription failed"),
        );
      }
    };

    // Start connection
    connect();

    // Return cleanup function
    const unsubscribe = () => {
      isActive = false;
      abortController.abort();
    };

    return unsubscribe;
  },
};

export const useMastraWorkflows = (config: MastraWorkflowConfig) => {
  const [workflowState, setWorkflowState] =
    useState<MastraWorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const startWorkflow = useCallback(
    async (initialContext?: Record<string, any>) => {
      try {
        const workflow = await mastraWorkflow.start({
          ...config,
          context: { ...config.context, ...initialContext },
          candidateData: initialContext,
        });

        const fullWorkflowState: MastraWorkflowState = {
          id: workflow.id,
          current: workflow.current,
          status: workflow.status,
          context: workflow.context,
          history: workflow.history || [],
          timestamp: workflow.timestamp,
        };

        setWorkflowState(fullWorkflowState);
        setIsRunning(workflow.status === "running");
        setIsSuspended(workflow.status === "suspended");
        config.onStateChange?.(fullWorkflowState);
        return fullWorkflowState;
      } catch (error) {
        console.error("Workflow start failed:", error);
        setIsRunning(false);
        setIsSuspended(false);
        throw error;
      }
    },
    [config],
  );

  const suspendWorkflow = useCallback(async () => {
    if (!workflowState || !isRunning) return;

    try {
      await mastraWorkflow.suspend(workflowState.id);
      setIsSuspended(true);
      setIsRunning(false);

      const updatedState: MastraWorkflowState = {
        ...workflowState,
        status: "suspended",
      };

      setWorkflowState(updatedState);
      config.onStateChange?.(updatedState);
    } catch (error) {
      console.error("Workflow suspend failed:", error);
      throw error;
    }
  }, [workflowState, isRunning, config]);

  const resumeWorkflow = useCallback(
    async (input?: any) => {
      if (!workflowState || !isSuspended) return;

      try {
        const resumeResult = await mastraWorkflow.resume(
          workflowState.id,
          input,
        );

        const updatedState: MastraWorkflowState = {
          ...workflowState,
          status: resumeResult.status,
          context: {
            ...workflowState.context,
            ...(input && { resumeInput: input }),
          },
          history: [
            ...workflowState.history,
            {
              from: "suspended",
              to: resumeResult.status === "suspended" ? "suspended" : "running",
              event: "resume",
              timestamp: new Date().toISOString(),
            },
          ],
        };

        setWorkflowState(updatedState);
        setIsSuspended(resumeResult.status === "suspended");
        setIsRunning(resumeResult.status === "running");
        config.onStateChange?.(updatedState);
        return updatedState;
      } catch (error) {
        console.error("Workflow resume failed:", error);
        throw error;
      }
    },
    [workflowState, isSuspended, config],
  );

  const sendCommand = useCallback(
    async (command: MastraWorkflowCommand) => {
      if (!workflowState) return;

      try {
        const result = await mastraWorkflow.sendCommand(
          workflowState.id,
          command,
        );

        const updatedState: MastraWorkflowState = {
          ...workflowState,
          status: result.status,
          context: { ...workflowState.context, ...(command.context || {}) },
          history: [
            ...workflowState.history,
            {
              from: workflowState.current,
              to: command.transition || workflowState.current,
              event: `command: ${command.transition || "unknown"}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };

        if (command.transition) {
          updatedState.current = command.transition;
        }

        setWorkflowState(updatedState);
        setIsRunning(result.status === "running");
        setIsSuspended(result.status === "suspended");
        config.onStateChange?.(updatedState);
        return updatedState;
      } catch (error) {
        console.error("Workflow command failed:", error);
        throw error;
      }
    },
    [workflowState, config],
  );

  const transitionTo = useCallback(
    async (targetState: string, context?: Record<string, any>) => {
      return sendCommand({
        transition: targetState,
        ...(context && { context }),
      });
    },
    [sendCommand],
  );

  // Handle workflow state updates via streaming
  useEffect(() => {
    if (!workflowState) return;

    const handleWorkflowEvent = (event: {
      type: string;
      data: any;
      timestamp: string;
    }) => {
      switch (event.type) {
        case "workflow-state-update": {
          // Use functional setState to get current state
          setWorkflowState((currentState) => {
            if (!currentState) return currentState;

            const updatedState: MastraWorkflowState = {
              ...currentState, // Always current, never stale
              current: event.data.currentStep,
              status: event.data.status,
              timestamp: event.timestamp,
            };

            // Check if suspended and add interrupt data
            if (event.data.suspended && event.data.steps) {
              const suspendedStep = event.data.steps[event.data.currentStep];
              if (suspendedStep?.result) {
                updatedState.interrupt = {
                  id: currentState.id, // Current state
                  state: event.data.currentStep,
                  context: suspendedStep.result,
                  requiresInput: true,
                  prompt:
                    event.data.currentStep === "screening-step"
                      ? "Should we proceed with this candidate to interview?"
                      : "What is your hiring decision?",
                  allowedActions:
                    event.data.currentStep === "screening-step"
                      ? ["approve", "reject"]
                      : ["hire", "reject", "second_interview"],
                };
              }
            }

            return updatedState;
          });

          // Update local flags based on current state
          setIsSuspended(event.data.suspended);
          setIsRunning(
            !event.data.suspended && event.data.status === "running",
          );

          // Call config callback with the updated state
          setWorkflowState((currentState) => {
            if (currentState) {
              config.onStateChange?.(currentState);
            }
            return currentState;
          });

          break;
        }

        case "workflow-complete": {
          setWorkflowState((currentState) => {
            if (!currentState) return currentState;

            const completedState: MastraWorkflowState = {
              ...currentState, // Current state
              status: "completed",
              timestamp: event.timestamp,
            };

            setIsRunning(false);
            setIsSuspended(false);
            config.onStateChange?.(completedState);

            return completedState;
          });

          break;
        }

        case "error": {
          console.error("Workflow error event:", event.data);
          setWorkflowState((currentState) => {
            if (!currentState) return currentState;

            const errorState: MastraWorkflowState = {
              ...currentState, // Current state
              status: "error",
              timestamp: event.timestamp,
            };

            setIsRunning(false);
            setIsSuspended(false);
            config.onStateChange?.(errorState);

            return errorState;
          });

          break;
        }

        default:
          // Ignore unknown event types
          break;
      }
    };

    // Subscribe to workflow events with callbacks
    const unsubscribe = mastraWorkflow.subscribe(
      workflowState.id,
      handleWorkflowEvent,
      (error) => {
        console.error("Workflow subscription error:", error);
        config.onError?.(error);

        setWorkflowState((currentState) => {
          if (!currentState) return currentState;

          const errorState: MastraWorkflowState = {
            ...currentState, // Current state
            status: "error",
            timestamp: new Date().toISOString(),
          };

          setIsRunning(false);
          setIsSuspended(false);

          return errorState;
        });
      },
    );

    return () => unsubscribe();
  }, [workflowState?.id, config]);

  return {
    workflowState,
    isRunning,
    isSuspended,
    startWorkflow,
    suspendWorkflow,
    resumeWorkflow,
    sendCommand,
    transitionTo,
  };
};

// Hook for accessing workflow interrupt state (following LangGraph pattern)
export const useMastraWorkflowInterrupt = () => {
  // In a real implementation, this would access runtime extras
  // For now, we'll create a simple hook that can be integrated later
  const [interrupt, setInterrupt] = useState<MastraWorkflowInterrupt | null>(
    null,
  );

  const setWorkflowInterrupt = useCallback(
    (newInterrupt: MastraWorkflowInterrupt | null) => {
      setInterrupt(newInterrupt);
    },
    [],
  );

  return {
    interrupt,
    setWorkflowInterrupt,
  };
};
