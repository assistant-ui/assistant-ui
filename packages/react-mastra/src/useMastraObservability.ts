"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MastraObservabilityConfig,
  MastraTrace,
  MastraTraceEvent,
  MastraMetric,
} from "./types";

// Mock Mastra observability API - in real implementation, this would connect to actual observability systems
const mastraObservability = {
  createTrace: (traceId: string, operationName: string): MastraTrace => {
    console.log("Mastra create trace:", { traceId, operationName });
    return {
      id: traceId,
      traceId,
      spanId: `span-${Date.now()}`,
      operationName,
      startTime: new Date().toISOString(),
      status: "ok",
      attributes: {},
      events: [],
      metrics: [],
    };
  },
  addEvent: (traceId: string, event: MastraTraceEvent): void => {
    console.log("Mastra add event:", { traceId, event });
  },
  finishTrace: (traceId: string, status: "ok" | "error", error?: Error): void => {
    console.log("Mastra finish trace:", { traceId, status, error });
  },
  recordMetric: (metric: MastraMetric): void => {
    console.log("Mastra record metric:", metric);
  },
  getTraces: async (filters?: Record<string, any>): Promise<MastraTrace[]> => {
    console.log("Mastra get traces:", filters);
    return [];
  },
  getMetrics: async (filters?: Record<string, any>): Promise<MastraMetric[]> => {
    console.log("Mastra get metrics:", filters);
    return [];
  },
};

export const useMastraObservability = (config: MastraObservabilityConfig) => {
  const [traces, setTraces] = useState<MastraTrace[]>([]);
  const [metrics, setMetrics] = useState<MastraMetric[]>([]);
  const [activeTraces, setActiveTraces] = useState<Map<string, MastraTrace>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize observability system
  const initialize = useCallback(async (): Promise<void> => {
    try {
      // Mock initialization - in real implementation, would configure exporters
      console.log("Initializing observability with config:", config);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize observability:", error);
      throw error;
    }
  }, [config]);

  // Create a new trace
  const createTrace = useCallback((
    operationName: string,
    tags?: Record<string, any>
  ): string => {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trace = mastraObservability.createTrace(traceId, operationName);

    if (tags) {
      trace.attributes = { ...trace.attributes, ...tags };
    }

    setActiveTraces(prev => {
      const updated = new Map(prev);
      updated.set(traceId, trace);
      return updated;
    });

    return traceId;
  }, []);

  // Add event to trace
  const addEvent = useCallback((
    traceId: string,
    eventName: string,
    attributes?: Record<string, any>
  ): void => {
    const event: MastraTraceEvent = {
      name: eventName,
      timestamp: new Date().toISOString(),
      attributes: attributes || {},
    };

    mastraObservability.addEvent(traceId, event);

    setActiveTraces(prev => {
      const updated = new Map(prev);
      const trace = updated.get(traceId);
      if (trace) {
        trace.events.push(event);
        updated.set(traceId, trace);
      }
      return updated;
    });
  }, []);

  // Finish a trace
  const finishTrace = useCallback((
    traceId: string,
    status: "ok" | "error" = "ok",
    error?: Error
  ): void => {
    mastraObservability.finishTrace(traceId, status, error);

    setActiveTraces(prev => {
      const updated = new Map(prev);
      const trace = updated.get(traceId);
      if (trace) {
        const endTime = new Date().toISOString();
        const startTimeMs = new Date(trace.startTime).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const duration = endTimeMs - startTimeMs;

        const finishedTrace: MastraTrace = {
          ...trace,
          endTime,
          duration,
          status: status,
          attributes: {
            ...trace.attributes,
            ...(error && { error: error.message }),
          },
        };

        setTraces(prevTraces => [finishedTrace, ...prevTraces]);
        updated.delete(traceId);
      }
      return updated;
    });
  }, []);

  // Record a metric
  const recordMetric = useCallback((
    name: string,
    value: number,
    tags?: Record<string, any>,
    type?: "counter" | "gauge" | "histogram" | "timer"
  ): void => {
    const metric: MastraMetric = {
      name,
      value,
      unit: type === "timer" ? "ms" : "count",
      timestamp: new Date().toISOString(),
      attributes: tags || {},
    };

    mastraObservability.recordMetric(metric);
    setMetrics(prev => [metric, ...prev].slice(0, 10000)); // Keep last 10k metrics
  }, []);

  // Increment a counter metric
  const incrementCounter = useCallback((
    name: string,
    value: number = 1,
    tags?: Record<string, any>
  ): void => {
    recordMetric(name, value, tags, "counter");
  }, [recordMetric]);

  // Set a gauge metric
  const setGauge = useCallback((
    name: string,
    value: number,
    tags?: Record<string, any>
  ): void => {
    recordMetric(name, value, tags, "gauge");
  }, [recordMetric]);

  // Record a timer metric
  const recordTimer = useCallback((
    name: string,
    duration: number,
    tags?: Record<string, any>
  ): void => {
    recordMetric(name, duration, tags, "timer");
  }, [recordMetric]);

  // Execute function with tracing
  const traceAsync = useCallback(async <T>(
    operationName: string,
    fn: (traceId: string) => Promise<T>,
    tags?: Record<string, any>
  ): Promise<T> => {
    const traceId = createTrace(operationName, tags);

    try {
      addEvent(traceId, "start", { operation: operationName });
      const result = await fn(traceId);
      addEvent(traceId, "complete", { success: true });
      finishTrace(traceId, "ok");
      return result;
    } catch (error) {
      addEvent(traceId, "error", { error: (error as Error).message });
      finishTrace(traceId, "error", error as Error);
      throw error;
    }
  }, [createTrace, addEvent, finishTrace]);

  // Execute synchronous function with tracing
  const traceSync = useCallback(<T>(
    operationName: string,
    fn: (traceId: string) => T,
    tags?: Record<string, any>
  ): T => {
    const traceId = createTrace(operationName, tags);

    try {
      addEvent(traceId, "start", { operation: operationName });
      const result = fn(traceId);
      addEvent(traceId, "complete", { success: true });
      finishTrace(traceId, "ok");
      return result;
    } catch (error) {
      addEvent(traceId, "error", { error: (error as Error).message });
      finishTrace(traceId, "error", error as Error);
      throw error;
    }
  }, [createTrace, addEvent, finishTrace]);

  // Get traces with optional filtering
  const getTraces = useCallback(async (filters?: Record<string, any>): Promise<MastraTrace[]> => {
    try {
      const apiTraces = await mastraObservability.getTraces(filters);
      return [...traces, ...apiTraces];
    } catch (error) {
      console.error("Failed to get traces:", error);
      return traces;
    }
  }, [traces]);

  // Get metrics with optional filtering
  const getMetrics = useCallback(async (filters?: Record<string, any>): Promise<MastraMetric[]> => {
    try {
      const apiMetrics = await mastraObservability.getMetrics(filters);
      return [...metrics, ...apiMetrics];
    } catch (error) {
      console.error("Failed to get metrics:", error);
      return metrics;
    }
  }, [metrics]);

  // Clear traces and metrics
  const clearData = useCallback((): void => {
    setTraces([]);
    setMetrics([]);
    setActiveTraces(new Map());
  }, []);

  // Get trace statistics
  const getTraceStats = useCallback((): {
    total: number;
    active: number;
    success: number;
    error: number;
    averageDuration: number;
  } => {
    const total = traces.length;
    const active = activeTraces.size;
    const success = traces.filter(t => t.status === "ok").length;
    const error = traces.filter(t => t.status === "error").length;

    const completedTraces = traces.filter(t => t.duration !== undefined);
    const averageDuration = completedTraces.length > 0
      ? completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTraces.length
      : 0;

    return { total, active, success, error, averageDuration };
  }, [traces, activeTraces]);

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return {
    traces,
    metrics,
    activeTraces: Array.from(activeTraces.values()),
    isInitialized,
    createTrace,
    addEvent,
    finishTrace,
    recordMetric,
    incrementCounter,
    setGauge,
    recordTimer,
    traceAsync,
    traceSync,
    getTraces,
    getMetrics,
    clearData,
    getTraceStats,
  };
};

// Hook for performance monitoring
export const useMastraPerformanceMonitoring = (config: MastraObservabilityConfig) => {
  const { recordTimer, incrementCounter, setGauge } = useMastraObservability(config);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    requestCount: 0,
    errorRate: 0,
    memoryUsage: 0,
  });

  // Measure execution time
  const measureTime = useCallback(async <T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    incrementCounter(`${operationName}_requests`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      recordTimer(`${operationName}_duration`, duration);
      return result;
    } catch (error) {
      incrementCounter(`${operationName}_errors`);
      throw error;
    }
  }, [incrementCounter, recordTimer]);

  // Monitor memory usage
  const monitorMemory = useCallback((): void => {
    if (typeof window !== "undefined" && "performance" in window) {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setGauge("memory_usage_mb", usedMB);
        setPerformanceMetrics(prev => ({ ...prev, memoryUsage: usedMB }));
      }
    }
  }, [setGauge]);

  // Update performance metrics
  const updatePerformanceMetrics = useCallback((): void => {
    // In a real implementation, this would calculate actual metrics from observability data
    monitorMemory();
  }, [monitorMemory]);

  // Auto-update metrics periodically
  useEffect(() => {
    const interval = setInterval(updatePerformanceMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updatePerformanceMetrics]);

  return {
    performanceMetrics,
    measureTime,
    monitorMemory,
    updatePerformanceMetrics,
  };
};

// Hook for error tracking
export const useMastraErrorTracking = (config: MastraObservabilityConfig) => {
  const { createTrace, addEvent, finishTrace, incrementCounter } = useMastraObservability(config);
  const [errors, setErrors] = useState<Array<{
    error: Error;
    traceId: string;
    timestamp: string;
    context?: Record<string, any>;
  }>>([]);

  // Track an error
  const trackError = useCallback((
    error: Error,
    context?: Record<string, any>
  ): string => {
    const traceId = createTrace("error", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      ...context
    });

    addEvent(traceId, "error", {
      stack: error.stack,
      message: error.message,
      name: error.name,
      ...context,
    });

    finishTrace(traceId, "error", error);
    incrementCounter("errors_total");

    const errorRecord = {
      error,
      traceId,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };

    setErrors(prev => [errorRecord, ...prev].slice(0, 1000)); // Keep last 1000 errors

    return traceId;
  }, [createTrace, addEvent, finishTrace, incrementCounter]);

  // Track error with user-friendly information
  const trackUserError = useCallback((
    message: string,
    context?: Record<string, any>
  ): string => {
    const error = new Error(message);
    return trackError(error, { userFacing: true, ...context });
  }, [trackError]);

  // Execute function with error tracking
  const withErrorTracking = useCallback(async <T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      trackError(error as Error, { operationName, ...context });
      throw error;
    }
  }, [trackError]);

  // Clear error history
  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  return {
    errors,
    trackError,
    trackUserError,
    withErrorTracking,
    clearErrors,
  };
};

// Hook for custom metrics and dashboards
export const useMastraMetrics = (config: MastraObservabilityConfig) => {
  const { recordMetric, incrementCounter, setGauge, recordTimer, getMetrics } = useMastraObservability(config);
  const [customMetrics, setCustomMetrics] = useState<Map<string, number>>(new Map());

  // Create a custom counter
  const createCounter = useCallback((name: string) => {
    return {
      increment: (value: number = 1, tags?: Record<string, any>) => {
        incrementCounter(name, value, tags);
      },
    };
  }, [incrementCounter]);

  // Create a custom gauge
  const createGauge = useCallback((name: string) => {
    return {
      set: (value: number, tags?: Record<string, any>) => {
        setGauge(name, value, tags);
        setCustomMetrics(prev => {
          const updated = new Map(prev);
          updated.set(name, value);
          return updated;
        });
      },
      get: () => customMetrics.get(name) || 0,
    };
  }, [setGauge, customMetrics]);

  // Create a custom timer
  const createTimer = useCallback((name: string) => {
    return {
      record: (duration: number, tags?: Record<string, any>) => {
        recordTimer(name, duration, tags);
      },
      time: async <T>(fn: () => Promise<T>): Promise<T> => {
        const start = Date.now();
        try {
          const result = await fn();
          const duration = Date.now() - start;
          recordTimer(name, duration);
          return result;
        } catch (error) {
          const duration = Date.now() - start;
          recordTimer(name, duration, { error: true });
          throw error;
        }
      },
    };
  }, [recordTimer]);

  // Create a custom histogram
  const createHistogram = useCallback((name: string, _buckets?: number[]) => {
    const observations: number[] = [];

    return {
      observe: (value: number, tags?: Record<string, any>) => {
        observations.push(value);
        recordMetric(`${name}_sum`, observations.reduce((a, b) => a + b, 0), tags);
        recordMetric(`${name}_count`, observations.length, tags);
        recordMetric(`${name}_bucket`, value, { ...tags, le: "+Inf" });
      },
      getObservations: () => [...observations],
    };
  }, [recordMetric]);

  return {
    customMetrics: Array.from(customMetrics.entries()),
    createCounter,
    createGauge,
    createTimer,
    createHistogram,
    getMetrics,
  };
};