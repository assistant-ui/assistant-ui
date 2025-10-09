import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useMastraEvents,
  useMastraEventSubscription,
  useMastraEventPattern,
  useMastraEventAnalytics,
  useMastraEventSubscriptionManager,
} from "./useMastraEvents";
import { MastraEvent, MastraKnownEventTypes } from "./types";

// Mock event system API
const mastraEvents = {
  subscribe: vi.fn(),
  publish: vi.fn(),
  getEventHistory: vi.fn(),
};

describe("useMastraEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraEvents());

    expect(result.current.subscriptions).toEqual([]);
    expect(result.current.eventHistory).toEqual([]);
    expect(result.current.isConnected).toBe(true); // Auto-connects on mount
  });

  it("should subscribe to events", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(() => useMastraEvents());

    act(() => {
      const subscriptionId = result.current.subscribe(MastraKnownEventTypes.Message, mockHandler);
      expect(subscriptionId).toBe("sub-1");
    });

    expect(mastraEvents.subscribe).toHaveBeenCalledWith(MastraKnownEventTypes.Message, mockHandler);
    expect(result.current.subscriptions).toHaveLength(1);
  });

  it("should unsubscribe from events", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(() => useMastraEvents());

    act(() => {
      const subscriptionId = result.current.subscribe(MastraKnownEventTypes.Message, mockHandler);
      result.current.unsubscribe(subscriptionId);
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.subscriptions).toHaveLength(0);
  });

  it("should publish events", async () => {
    const mockEvent: MastraEvent = {
      id: MastraKnownEventTypes.Message,
      event: MastraKnownEventTypes.Message,
      data: { message: "test" },
      timestamp: new Date().toISOString(),
      metadata: { source: "test-source" },
    };

    mastraEvents.publish.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMastraEvents());

    await act(async () => {
      await result.current.publish(mockEvent);
    });

    expect(mastraEvents.publish).toHaveBeenCalledWith(mockEvent);
    expect(result.current.eventHistory).toHaveLength(1);
    expect(result.current.eventHistory[0]).toEqual(mockEvent);
  });

  it("should subscribe to multiple event types", () => {
    const mockHandler = vi.fn();
    const mockSubscription1 = {
      id: "sub-1",
      eventType: MastraKnownEventTypes.Message,
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };
    const mockSubscription2 = {
      id: "sub-2",
      eventType: MastraKnownEventTypes.AgentStarted,
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };

    mastraEvents.subscribe
      .mockReturnValueOnce(mockSubscription1)
      .mockReturnValueOnce(mockSubscription2);

    const { result } = renderHook(() => useMastraEvents());

    act(() => {
      const subscriptionIds = result.current.subscribeToMultiple(
        [MastraKnownEventTypes.Message, MastraKnownEventTypes.AgentStarted],
        mockHandler
      );
      expect(subscriptionIds).toEqual(["sub-1", "sub-2"]);
    });

    expect(result.current.subscriptions).toHaveLength(2);
  });

  it("should get events by type", () => {
    const { result } = renderHook(() => useMastraEvents());

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-1" },
      },
      {
        id: "2",
        event: MastraKnownEventTypes.AgentStarted,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-1" },
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-2" },
      },
    ];

    act(() => {
      events.forEach(event => result.current.eventHistory.push(event));
    });

    const typeAEvents = result.current.getEventsByType(MastraKnownEventTypes.Message);
    expect(typeAEvents).toHaveLength(2);
    expect(typeAEvents.map(e => e.id)).toEqual(["1", "3"]);
  });

  it("should get events by time range", () => {
    const { result } = renderHook(() => useMastraEvents());

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: twoHoursAgo.toISOString(),
        metadata: {},
      },
      {
        id: "2",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: oneHourAgo.toISOString(),
        metadata: {},
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: now.toISOString(),
        metadata: {},
      },
    ];

    act(() => {
      events.forEach(event => result.current.eventHistory.push(event));
    });

    const recentEvents = result.current.getEventsByTimeRange(oneHourAgo, now);
    expect(recentEvents).toHaveLength(2);
    expect(recentEvents.map(e => e.id)).toEqual(["2", "3"]);
  });

  it("should clear event history", () => {
    const { result } = renderHook(() => useMastraEvents());

    const event: MastraEvent = {
      id: "1",
      event: MastraKnownEventTypes.Message,
      data: { message: "test" },
      timestamp: new Date().toISOString(),
      metadata: { source: "source-1" },
    };

    act(() => {
      result.current.eventHistory.push(event);
      result.current.clearHistory();
    });

    expect(result.current.eventHistory).toHaveLength(0);
  });

  it("should connect and disconnect", () => {
    const { result } = renderHook(() => useMastraEvents());

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);

    act(() => {
      result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
  });
});

describe("useMastraEventSubscription", () => {
  it("should auto-subscribe and cleanup", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { unmount } = renderHook(
      () => useMastraEventSubscription(MastraKnownEventTypes.Message, mockHandler)
    );

    expect(mastraEvents.subscribe).toHaveBeenCalledWith(MastraKnownEventTypes.Message, mockHandler);

    unmount();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it("should resubscribe when dependencies change", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription1 = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };
    const mockSubscription2 = {
      id: "sub-2",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe
      .mockReturnValueOnce(mockSubscription1)
      .mockReturnValueOnce(mockSubscription2);

    const { rerender } = renderHook(
      ({ deps }) => useMastraEventSubscription(MastraKnownEventTypes.Message, mockHandler, deps),
      { initialProps: { deps: [1] } }
    );

    expect(mockSubscription1.unsubscribe).not.toHaveBeenCalled();

    rerender({ deps: [2] });

    expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
    expect(mastraEvents.subscribe).toHaveBeenCalledTimes(2);
  });
});

describe("useMastraEventPattern", () => {
  it("should filter events by type", () => {
    const mockHandler = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: ["*"],
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(
      () => useMastraEventPattern({ types: [MastraKnownEventTypes.Message, MastraKnownEventTypes.AgentStarted] })
    );

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        metadata: { source: "source-1" },
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        event: MastraKnownEventTypes.AgentStarted,
        data: {},
        metadata: { source: "source-1" },
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-2" },
      },
    ];

    act(() => {
      events.forEach(event => mockHandler(event));
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.map(e => e.id)).toEqual(["1", "3"]);
  });

  it("should filter events by source", () => {
    const mockHandler = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: ["*"],
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(
      () => useMastraEventPattern({ source: "source-1" })
    );

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-1" },
      },
      {
        id: "2",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-1" },
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "source-2" },
      },
    ];

    act(() => {
      events.forEach(event => mockHandler(event));
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.map(e => e.id)).toEqual(["1", "3"]);
  });

  it("should filter events by data", () => {
    const mockHandler = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: ["*"],
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const dataFilter = vi.fn((data) => data.priority === "high");

    const { result } = renderHook(
      () => useMastraEventPattern({ dataFilter })
    );

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: { priority: "high" },
        timestamp: new Date().toISOString(),
        metadata: {},
      },
      {
        id: "2",
        event: MastraKnownEventTypes.Message,
        data: { priority: "low" },
        timestamp: new Date().toISOString(),
        metadata: {},
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: { priority: "high" },
        timestamp: new Date().toISOString(),
        metadata: {},
      },
    ];

    act(() => {
      events.forEach(event => mockHandler(event));
    });

    expect(dataFilter).toHaveBeenCalledTimes(3);
    expect(result.current).toHaveLength(2);
    expect(result.current.map(e => e.id)).toEqual(["1", "3"]);
  });
});

describe("useMastraEventAnalytics", () => {
  it("should calculate analytics correctly", () => {
    const { result: mainResult } = renderHook(() => useMastraEvents());
    const { result } = renderHook(() => useMastraEventAnalytics());

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        metadata: { source: "source-1" },
        timestamp: "2023-01-01T10:00:00Z",
      },
      {
        id: "2",
        event: MastraKnownEventTypes.AgentStarted,
        data: {},
        metadata: { source: "source-1" },
        timestamp: "2023-01-01T11:00:00Z",
      },
      {
        id: "3",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: "2023-01-01T10:00:00Z",
        metadata: { source: "source-2" },
      },
    ];

    // Manually add events to the main events hook since analytics reads from it
    act(() => {
      events.forEach(event => mainResult.current.eventHistory.push(event));
    });

    const analytics = result.current;

    expect(analytics.totalEvents).toBe(3);
    expect(analytics.eventTypeCounts).toEqual({
      [MastraKnownEventTypes.Message]: 2,
      [MastraKnownEventTypes.AgentStarted]: 1,
    });
    expect(analytics.sourceCounts).toEqual({
      "source-1": 2,
      "source-2": 1,
    });
    expect(analytics.timeSeriesData).toHaveLength(2);
    expect(analytics.timeSeriesData[0]).toEqual({
      timestamp: "2023-01-01T10",
      count: 2,
    });
    expect(analytics.timeSeriesData[1]).toEqual({
      timestamp: "2023-01-01T11",
      count: 1,
    });
  });

  it("should apply time window filter", () => {
    const { result: mainResult } = renderHook(() => useMastraEvents());
    const { result } = renderHook(() => useMastraEventAnalytics(60 * 60 * 1000)); // 1 hour

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const events: MastraEvent[] = [
      {
        id: "1",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: twoHoursAgo.toISOString(),
        metadata: {},
      },
      {
        id: "2",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: now.toISOString(),
        metadata: {},
      },
    ];

    act(() => {
      events.forEach(event => mainResult.current.eventHistory.push(event));
    });

    expect(result.current.totalEvents).toBe(1);
  });
});

describe("useMastraEventSubscriptionManager", () => {
  it("should manage subscriptions correctly", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(() => useMastraEventSubscriptionManager());

    act(() => {
      const subscriptionId = result.current.subscribe(MastraKnownEventTypes.Message, mockHandler);
      expect(subscriptionId).toBe("sub-1");
    });

    expect(result.current.getActiveSubscriptions()).toHaveLength(1);

    act(() => {
      result.current.unsubscribe("sub-1");
    });

    expect(result.current.getActiveSubscriptions()).toHaveLength(0);
  });

  it("should handle once-only subscriptions", () => {
    const mockHandler = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: mockUnsubscribe,
    };

    mastraEvents.subscribe.mockReturnValue(mockSubscription);

    const { result } = renderHook(() => useMastraEventSubscriptionManager());

    let wrappedHandler: any;

    // Capture the wrapped handler
    mastraEvents.subscribe.mockImplementation((_, handler) => {
      wrappedHandler = handler;
      return mockSubscription;
    });

    act(() => {
      result.current.subscribe(MastraKnownEventTypes.Message, mockHandler, { once: true });
    });

    // Simulate event
    act(() => {
      wrappedHandler({
        id: "test-event",
        event: MastraKnownEventTypes.Message,
        data: {},
        timestamp: new Date().toISOString(),
        metadata: { source: "test" },
      });
    });

    expect(mockHandler).toHaveBeenCalled();
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it("should unsubscribe all subscriptions", () => {
    const mockHandler = vi.fn();
    const mockSubscription1 = {
      id: "sub-1",
      eventTypes: [MastraKnownEventTypes.Message],
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };
    const mockSubscription2 = {
      id: "sub-2",
      eventTypes: [MastraKnownEventTypes.AgentStarted],
      handler: mockHandler,
      unsubscribe: vi.fn(),
    };

    mastraEvents.subscribe
      .mockReturnValueOnce(mockSubscription1)
      .mockReturnValueOnce(mockSubscription2);

    const { result } = renderHook(() => useMastraEventSubscriptionManager());

    act(() => {
      result.current.subscribe(MastraKnownEventTypes.Message, mockHandler);
      result.current.subscribe(MastraKnownEventTypes.AgentStarted, mockHandler);
    });

    expect(result.current.getActiveSubscriptions()).toHaveLength(2);

    act(() => {
      result.current.unsubscribeAll();
    });

    expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
    expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
    expect(result.current.getActiveSubscriptions()).toHaveLength(0);
  });
});