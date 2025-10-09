"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MastraWorkflowConfig,
  MastraWorkflowState,
  MastraWorkflowCommand,
  MastraWorkflowInterrupt,
} from "./types";

// Mock Mastra workflow API - in real implementation, this would connect to actual Mastra APIs
const mastraWorkflow = {
  start: async (workflowConfig: MastraWorkflowConfig & { context?: Record<string, any> }) => {
    console.log("Mastra workflow start:", workflowConfig);
    return {
      id: `workflow-${workflowConfig.workflowId}`,
      current: workflowConfig.initialState || "gathering",
      status: "running" as const,
      context: workflowConfig.context || {},
      history: [{
        from: "none",
        to: workflowConfig.initialState || "gathering",
        event: "start",
        timestamp: new Date().toISOString(),
      }],
      timestamp: new Date().toISOString(),
    };
  },
  suspend: async (workflowId: string) => {
    console.log("Mastra workflow suspend:", workflowId);
    return {
      id: workflowId,
      status: "suspended" as const,
      timestamp: new Date().toISOString(),
    };
  },
  resume: async (workflowId: string, input?: any) => {
    console.log("Mastra workflow resume:", { workflowId, input });
    return {
      id: workflowId,
      status: "running" as const,
      timestamp: new Date().toISOString(),
    };
  },
  sendCommand: async (workflowId: string, command: MastraWorkflowCommand) => {
    console.log("Mastra workflow command:", { workflowId, command });
    return {
      id: workflowId,
      status: "running" as const,
      timestamp: new Date().toISOString(),
    };
  },
  subscribe: (workflowId: string) => {
    console.log("Mastra workflow subscribe:", workflowId);
    // Mock subscription - in real implementation, this would be a real-time connection
    const unsubscribe = () => {
      console.log("Mastra workflow unsubscribe:", workflowId);
    };
    return unsubscribe;
  },
};

export const useMastraWorkflows = (config: MastraWorkflowConfig) => {
  const [workflowState, setWorkflowState] = useState<MastraWorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const startWorkflow = useCallback(async (initialContext?: Record<string, any>) => {
    setIsRunning(true);
    setIsSuspended(false);

    try {
      const workflow = await mastraWorkflow.start({
        ...config,
        context: { ...config.context, ...initialContext }
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
      config.onStateChange?.(fullWorkflowState);
      return fullWorkflowState;
    } catch (error) {
      console.error("Workflow start failed:", error);
      setIsRunning(false);
      throw error;
    }
  }, [config]);

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

  const resumeWorkflow = useCallback(async (input?: any) => {
    if (!workflowState || !isSuspended) return;

    try {
      await mastraWorkflow.resume(workflowState.id, input);

      const updatedState: MastraWorkflowState = {
        ...workflowState,
        status: "running",
        context: { ...workflowState.context, ...(input && { resumeInput: input }) },
        history: [
          ...workflowState.history,
          {
            from: "suspended",
            to: "running",
            event: "resume",
            timestamp: new Date().toISOString(),
          }
        ],
      };

      setWorkflowState(updatedState);
      setIsSuspended(false);
      setIsRunning(true);
      config.onStateChange?.(updatedState);
      return updatedState;
    } catch (error) {
      console.error("Workflow resume failed:", error);
      throw error;
    }
  }, [workflowState, isSuspended, config]);

  const sendCommand = useCallback(async (command: MastraWorkflowCommand) => {
    if (!workflowState) return;

    try {
      await mastraWorkflow.sendCommand(workflowState.id, command);

      const updatedState: MastraWorkflowState = {
        ...workflowState,
        status: "running",
        context: { ...workflowState.context, ...(command.context || {}) },
        history: [
          ...workflowState.history,
          {
            from: workflowState.current,
            to: command.transition || workflowState.current,
            event: `command: ${command.transition || 'unknown'}`,
            timestamp: new Date().toISOString(),
          }
        ],
      };

      if (command.transition) {
        updatedState.current = command.transition;
      }

      setWorkflowState(updatedState);
      setIsRunning(true);
      setIsSuspended(false);
      config.onStateChange?.(updatedState);
      return updatedState;
    } catch (error) {
      console.error("Workflow command failed:", error);
      throw error;
    }
  }, [workflowState, config]);

  const transitionTo = useCallback(async (targetState: string, context?: Record<string, any>) => {
    return sendCommand({
      transition: targetState,
      ...(context && { context }),
    });
  }, [sendCommand]);

  // Handle workflow state updates via streaming
  useEffect(() => {
    if (!workflowState) return;

    // Mock subscription for now - in real implementation, this would be handled by Mastra's real-time system
    const unsubscribe = mastraWorkflow.subscribe(workflowState.id);

    return () => unsubscribe();
  }, [workflowState, config]);

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
  const [interrupt, setInterrupt] = useState<MastraWorkflowInterrupt | null>(null);

  const setWorkflowInterrupt = useCallback((newInterrupt: MastraWorkflowInterrupt | null) => {
    setInterrupt(newInterrupt);
  }, []);

  return {
    interrupt,
    setWorkflowInterrupt,
  };
};

// Hook for sending workflow commands (following LangGraph pattern)
export const useMastraSendWorkflowCommand = () => {
  // This would integrate with the main workflow hook in a real implementation
  // For now, we'll create a placeholder that can be connected later
  const sendCommand = useCallback(async (command: MastraWorkflowCommand) => {
    console.log("Send workflow command:", command);
    // In real implementation, this would call the actual workflow system
  }, []);

  return sendCommand;
};