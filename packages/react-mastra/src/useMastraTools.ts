"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  MastraToolConfig,
  MastraToolExecution,
  MastraToolResult,
  MastraRetryPolicy,
} from "./types";

// Mock Mastra tools API - in real implementation, this would connect to actual Mastra APIs
const mastraTools = {
  execute: async (toolId: string, parameters: any): Promise<MastraToolResult> => {
    console.log("Mastra tool execute:", { toolId, parameters });
    return {
      success: true,
      data: `Tool ${toolId} executed with ${JSON.stringify(parameters)}`,
      executionTime: 100,
    };
  },
  cancel: async (executionId: string): Promise<void> => {
    console.log("Mastra tool cancel:", executionId);
  },
};

export const useMastraTools = () => {
  const [tools, setTools] = useState<Map<string, MastraToolConfig>>(new Map());
  const [executions, setExecutions] = useState<Map<string, MastraToolExecution>>(new Map());
  const [pendingTools, setPendingTools] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Register tools dynamically
  const registerTool = useCallback((tool: MastraToolConfig) => {
    setTools(prev => {
      const updated = new Map(prev);
      updated.set(tool.id, tool);
      return updated;
    });
  }, []);

  // Unregister tools
  const unregisterTool = useCallback((toolId: string) => {
    setTools(prev => {
      const updated = new Map(prev);
      updated.delete(toolId);
      return updated;
    });
  }, []);

  // Execute tool with real-time status updates
  const executeTool = useCallback(async (toolId: string, parameters: any): Promise<string> => {
    const tool = tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const executionId = uuidv4();
    const execution: MastraToolExecution = {
      id: executionId,
      toolId,
      parameters,
      status: 'pending',
      startTime: new Date().toISOString(),
    };

    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, execution);
      return updated;
    });

    setPendingTools(prev => [...prev, executionId]);

    // Update to executing status
    let progressInterval: NodeJS.Timeout | undefined;
    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, { ...updated.get(executionId)!, status: 'executing' });
      return updated;
    });

    try {
      // Simulate progress updates for long-running tools
      progressInterval = setInterval(() => {
        setExecutions(prev => {
          const updated = new Map(prev);
          const currentExecution = updated.get(executionId);
          if (currentExecution && currentExecution.status === 'executing') {
            const newProgress = Math.min((currentExecution.progress || 0) + 25, 100);
            updated.set(executionId, { ...currentExecution, progress: newProgress });
          }
          return updated;
        });
      }, 200);

      // Execute tool
      const result = await tool.execute(parameters);

      clearInterval(progressInterval);

      // Update to completed status
      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, {
          ...updated.get(executionId)!,
          status: 'completed',
          endTime: new Date().toISOString(),
          result,
          progress: 100,
        });
        return updated;
      });

      return executionId;
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Update to failed status
      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, {
          ...updated.get(executionId)!,
          status: 'failed',
          endTime: new Date().toISOString(),
          result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        });
        return updated;
      });
      throw error;
    } finally {
      setPendingTools(prev => prev.filter(id => id !== executionId));
    }
  }, [tools]);

  // Cancel tool execution
  const cancelExecution = useCallback(async (executionId: string) => {
    const execution = executions.get(executionId);
    if (!execution || execution.status !== 'executing') {
      return;
    }

    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, {
        ...updated.get(executionId)!,
        status: 'cancelled',
        endTime: new Date().toISOString(),
      });
      return updated;
    });

    setPendingTools(prev => prev.filter(id => id !== executionId));

    // Cancel actual tool execution via Mastra
    await mastraTools.cancel(executionId);
  }, [executions]);

  // Get pending tool calls (similar to LangGraph pattern)
  const getPendingToolCalls = useCallback(() => {
    return Array.from(executions.values())
      .filter(exec => exec.status === 'pending' || exec.status === 'executing')
      .map(exec => ({
        id: exec.id,
        name: tools.get(exec.toolId)?.name || 'unknown',
        parameters: exec.parameters
      }));
  }, [executions, tools]);

  // Get completed executions
  const getCompletedExecutions = useCallback(() => {
    return Array.from(executions.values())
      .filter(exec => exec.status === 'completed' || exec.status === 'failed' || exec.status === 'cancelled');
  }, [executions]);

  // Clear execution history
  const clearExecutions = useCallback(() => {
    setExecutions(new Map());
    setPendingTools([]);
  }, []);

  // Register multiple tools at once
  const registerTools = useCallback((toolsArray: MastraToolConfig[]) => {
    setTools(prev => {
      const updated = new Map(prev);
      toolsArray.forEach(tool => {
        updated.set(tool.id, tool);
      });
      return updated;
    });
  }, []);

  // Get tool by ID
  const getTool = useCallback((toolId: string) => {
    return tools.get(toolId);
  }, [tools]);

  // Get execution by ID
  const getExecution = useCallback((executionId: string) => {
    return executions.get(executionId);
  }, [executions]);

  const isExecuting = pendingTools.length > 0;

  return {
    tools,
    executions,
    pendingTools,
    isExecuting,
    error,
    registerTool,
    unregisterTool,
    registerTools,
    executeTool,
    cancelExecution,
    getPendingToolCalls,
    getCompletedExecutions,
    clearExecutions,
    getTool,
    getExecution,
  };
};

// Hook for tool management with retry policies
export const useMastraToolsWithRetry = () => {
  const toolsHook = useMastraTools();

  const executeToolWithRetry = useCallback(async (toolId: string, parameters: any, retryPolicy?: MastraRetryPolicy) => {
    const tool = toolsHook.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const policy = retryPolicy || tool.retryPolicy;
    if (!policy) {
      return toolsHook.executeTool(toolId, parameters);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return await toolsHook.executeTool(toolId, parameters);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < policy.maxAttempts) {
          const delay = policy.backoffStrategy === 'exponential'
            ? policy.baseDelay * Math.pow(2, attempt - 1)
            : policy.baseDelay * attempt;

          console.log(`Tool execution failed, retrying in ${delay}ms (attempt ${attempt}/${policy.maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }, [toolsHook]);

  return {
    ...toolsHook,
    executeToolWithRetry,
  };
};