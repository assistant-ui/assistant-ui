import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useMastraObservability,
  useMastraPerformanceMonitoring,
  useMastraErrorTracking,
  useMastraMetrics,
} from "./useMastraObservability";
import { MastraObservabilityConfig, MastraTrace } from "./types";

// Mock observability API
const mastraObservability = {
  createTrace: vi.fn(),
  addEvent: vi.fn(),
  finishTrace: vi.fn(),
  recordMetric: vi.fn(),
  getTraces: vi.fn(),
  getMetrics: vi.fn(),
};

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
};

describe("useMastraObservability", () => {
  const mockConfig: MastraObservabilityConfig = {
    serviceName: "test-service",
    environment: "development",
    exporters: [
      {
        type: "console",
        config: {},
      },
    ],
    sampling: {
      type: "all",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraObservability(mockConfig));

    expect(result.current.traces).toEqual([]);
    expect(result.current.metrics).toEqual([]);
    expect(result.current.activeTraces).toEqual([]);
    expect(result.current.isInitialized).toBe(true);
  });

  it("should create and manage traces", async () => {
    const mockTrace: MastraTrace = {
      id: "trace-1",
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "test-operation",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      const traceId = result.current.createTrace("test-operation", { tag: "value" });
      expect(mastraObservability.createTrace).toHaveBeenCalledWith("trace-1", "test-operation");
      expect(traceId).toBeDefined();
      expect(result.current.activeTraces).toHaveLength(1);
      expect(result.current.activeTraces[0]?.operationName).toBe("test-operation");
      expect(result.current.activeTraces[0]?.attributes?.['tag']).toBe("value");
    });
  });

  it("should add events to traces", async () => {
    const mockTrace: MastraTrace = {
      id: "trace-1",
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "test-operation",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      const traceId = result.current.createTrace("test-operation");
      result.current.addEvent(traceId, "test-event", { data: "value" });
    });

    expect(mastraObservability.addEvent).toHaveBeenCalledWith("trace-1", {
      name: "test-event",
      timestamp: expect.any(String),
      attributes: { data: "value" },
    });
  });

  it("should finish traces", async () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "test-operation",
      startTime: new Date(Date.now() - 1000).toISOString(), // 1 second ago
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      const traceId = result.current.createTrace("test-operation");
      result.current.finishTrace(traceId, "ok");
    });

    expect(mastraObservability.finishTrace).toHaveBeenCalledWith("trace-1", "ok", undefined);
    expect(result.current.traces).toHaveLength(1);
    expect(result.current.traces[0]?.status).toBe("ok");
    expect(result.current.traces[0]?.duration).toBeGreaterThan(0);
  });

  it("should record metrics", async () => {
    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      result.current.recordMetric("test-metric", 100, { tag: "value" }, "gauge");
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-metric",
      value: 100,
      unit: "count",
      timestamp: expect.any(String),
      attributes: { tag: "value" },
    });
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0]?.name).toBe("test-metric");
    expect(result.current.metrics[0]?.value).toBe(100);
  });

  it("should provide metric helpers", async () => {
    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      result.current.incrementCounter("test-counter", 5, { source: "test" });
      result.current.setGauge("test-gauge", 42, { type: "temperature" });
      result.current.recordTimer("test-timer", 150, { operation: "query" });
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-counter",
      value: 5,
      timestamp: expect.any(String),
      unit: "count",
      attributes: { source: "test" },
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-gauge",
      value: 42,
      timestamp: expect.any(String),
      unit: "celsius",
      attributes: { type: "temperature" },
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-timer",
      value: 150,
      timestamp: expect.any(String),
      unit: "milliseconds",
      attributes: { operation: "query" },
    });
  });

  it("should trace async functions", async () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "async-operation",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    const asyncFn = vi.fn().mockResolvedValue("success");

    const operationResult = await act(async () => {
      return await result.current.traceAsync("async-operation", async () => {
        return await asyncFn();
      });
    });

    expect(operationResult).toBe("success");
    expect(mastraObservability.createTrace).toHaveBeenCalled();
    expect(mastraObservability.addEvent).toHaveBeenCalledWith("trace-1", {
      name: "start",
      timestamp: expect.any(String),
      attributes: { operation: "async-operation" },
    });
    expect(mastraObservability.addEvent).toHaveBeenCalledWith("trace-1", {
      name: "complete",
      timestamp: expect.any(String),
      attributes: { success: true },
    });
    expect(mastraObservability.finishTrace).toHaveBeenCalledWith("trace-1", "ok");
  });

  it("should trace async function errors", async () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "failing-operation",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    const error = new Error("Test error");
    const asyncFn = vi.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.traceAsync("failing-operation", async () => {
          return await asyncFn();
        });
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    expect(mastraObservability.addEvent).toHaveBeenCalledWith("trace-1", {
      name: "error",
      timestamp: expect.any(String),
      attributes: { error: "Test error" },
    });
    expect(mastraObservability.finishTrace).toHaveBeenCalledWith("trace-1", "error", error);
  });

  it("should calculate trace statistics", async () => {
    const mockTrace1 = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "operation-1",
      startTime: new Date(Date.now() - 2000).toISOString(),
      endTime: new Date(Date.now() - 1000).toISOString(),
      duration: 1000,
      status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    const mockTrace2 = {
      traceId: "trace-2",
      spanId: "span-2",
      operationName: "operation-2",
      startTime: new Date(Date.now() - 1500).toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    const mockTrace3 = {
      traceId: "trace-3",
      spanId: "span-3",
      operationName: "operation-3",
      startTime: new Date(Date.now() - 3000).toISOString(),
      endTime: new Date(Date.now() - 2000).toISOString(),
      duration: 1000,
      status: "error" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace
      .mockReturnValueOnce(mockTrace1)
      .mockReturnValueOnce(mockTrace2)
      .mockReturnValueOnce(mockTrace3);

    const { result } = renderHook(() => useMastraObservability(mockConfig));

    await act(async () => {
      const traceId1 = result.current.createTrace("operation-1");
      result.current.finishTrace(traceId1, "ok");

      result.current.createTrace("operation-2");
      // Don't finish this one to keep it active

      const traceId3 = result.current.createTrace("operation-3");
      result.current.finishTrace(traceId3, "error");
    });

    const stats = result.current.getTraceStats();

    expect(stats.total).toBe(2); // Only completed traces
    expect(stats.active).toBe(1);
    expect(stats.success).toBe(1);
    expect(stats.error).toBe(1);
    expect(stats.averageDuration).toBe(1000);
  });
});

describe("useMastraPerformanceMonitoring", () => {
  const mockConfig: MastraObservabilityConfig = {
    serviceName: "test-service",
    environment: "development",
    exporters: [
      {
        type: "console",
        config: {},
      },
    ],
    sampling: {
      type: "all",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: mockPerformance,
      writable: true,
    });
  });

  it("should measure execution time", async () => {
    const { result } = renderHook(() => useMastraPerformanceMonitoring(mockConfig));

    const mockFn = vi.fn().mockResolvedValue("result");

    const operationResult = await act(async () => {
      return await result.current.measureTime("test-operation", mockFn);
    });

    expect(operationResult).toBe("result");
    expect(mockFn).toHaveBeenCalled();
    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-operation_duration",
      value: expect.any(Number),
      timestamp: expect.any(String),
      unit: "milliseconds",
      attributes: undefined,
    });
  });

  it("should monitor memory usage", () => {
    const { result } = renderHook(() => useMastraPerformanceMonitoring(mockConfig));

    act(() => {
      result.current.monitorMemory();
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "memory_usage_mb",
      value: 50,
      timestamp: expect.any(String),
      unit: "percent",
      attributes: undefined,
    });

    expect(result.current.performanceMetrics.memoryUsage).toBe(50);
  });

  it("should auto-update metrics", () => {
    renderHook(() => useMastraPerformanceMonitoring(mockConfig));

    // Fast-forward time to trigger auto-update
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "memory_usage_mb",
        value: expect.any(Number),
      })
    );
  });
});

describe("useMastraErrorTracking", () => {
  const mockConfig: MastraObservabilityConfig = {
    serviceName: "test-service",
    environment: "development",
    exporters: [
      {
        type: "console",
        config: {},
      },
    ],
    sampling: {
      type: "all",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track errors", () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "error",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraErrorTracking(mockConfig));

    const error = new Error("Test error");

    act(() => {
      const traceId = result.current.trackError(error, { context: "test" });
      expect(traceId).toBeDefined();
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]?.error).toBe(error);
      expect(result.current.errors[0]?.context).toEqual({ context: "test" });
    });

    expect(mastraObservability.createTrace).toHaveBeenCalledWith("error", {
      errorType: "Error",
      errorMessage: "Test error",
      context: "test",
    });
  });

  it("should track user errors", () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "error",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraErrorTracking(mockConfig));

    act(() => {
      result.current.trackUserError("Something went wrong", { component: "Button" });
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]?.error.message).toBe("Something went wrong");
    expect(result.current.errors[0]?.context).toEqual({
      userFacing: true,
      component: "Button",
    });
  });

  it("should execute functions with error tracking", async () => {
    const mockTrace = {
      traceId: "trace-1",
      spanId: "span-1",
      operationName: "error",
      startTime: new Date().toISOString(),
            status: "ok" as const,
      events: [],
      attributes: {},
      metrics: [],
    };

    mastraObservability.createTrace.mockReturnValue(mockTrace);

    const { result } = renderHook(() => useMastraErrorTracking(mockConfig));

    const error = new Error("Function failed");
    const failingFn = vi.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.withErrorTracking("test-operation", failingFn);
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]?.context?.['operationName']).toBe("test-operation");
  });
});

describe("useMastraMetrics", () => {
  const mockConfig: MastraObservabilityConfig = {
    serviceName: "test-service",
    environment: "development",
    exporters: [
      {
        type: "console",
        config: {},
      },
    ],
    sampling: {
      type: "all",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create and use counters", () => {
    const { result } = renderHook(() => useMastraMetrics(mockConfig));

    const counter = result.current.createCounter("test-counter");

    act(() => {
      counter.increment(5, { source: "api" });
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "test-counter",
      value: 5,
      timestamp: expect.any(String),
      unit: "count",
      attributes: { source: "api" },
    });
  });

  it("should create and use gauges", () => {
    const { result } = renderHook(() => useMastraMetrics(mockConfig));

    const gauge = result.current.createGauge("temperature");

    act(() => {
      gauge.set(23.5, { location: "room-1" });
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "temperature",
      value: 23.5,
      timestamp: expect.any(String),
      unit: "celsius",
      attributes: { location: "room-1" },
    });

    expect(gauge.get()).toBe(23.5);
  });

  it("should create and use timers", async () => {
    const { result } = renderHook(() => useMastraMetrics(mockConfig));

    const timer = result.current.createTimer("request-duration");

    const mockFn = vi.fn().mockResolvedValue("success");

    const operationResult = await act(async () => {
      return await timer.time(mockFn);
    });

    expect(operationResult).toBe("success");
    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "request-duration",
      value: expect.any(Number),
      timestamp: expect.any(String),
      unit: "milliseconds",
      attributes: undefined,
    });
  });

  it("should create and use histograms", () => {
    const { result } = renderHook(() => useMastraMetrics(mockConfig));

    const histogram = result.current.createHistogram("response-size");

    act(() => {
      histogram.observe(1024, { endpoint: "/api/data" });
      histogram.observe(2048, { endpoint: "/api/data" });
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "response-size_sum",
      value: 3072,
      timestamp: expect.any(String),
      attributes: { endpoint: "/api/data" },
    });

    expect(mastraObservability.recordMetric).toHaveBeenCalledWith({
      name: "response-size_count",
      value: 2,
      timestamp: expect.any(String),
      attributes: { endpoint: "/api/data" },
    });

    const observations = histogram.getObservations();
    expect(observations).toEqual([1024, 2048]);
  });
});