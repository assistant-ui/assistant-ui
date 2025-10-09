"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MastraEvent,
  MastraEventHandler,
  MastraEventSubscription,
  MastraEventSubscriptionManager,
} from "./types";

// Mock Mastra event system API - in real implementation, this would connect to actual Mastra APIs
const mastraEvents = {
  subscribe: (eventTypes: string[], handler: MastraEventHandler): MastraEventSubscription & { unsubscribe: () => void } => {
    console.log("Mastra event subscribe:", eventTypes);
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Mock subscription - in real implementation, this would be a real-time connection
    const subscription: MastraEventSubscription & { unsubscribe: () => void } = {
      id: subscriptionId,
      eventTypes: eventTypes as any, // Convert to MastraKnownEventTypes[]
      handler,
      unsubscribe: () => {
        console.log("Mastra event unsubscribe:", subscriptionId);
      },
    };

    return subscription;
  },
  publish: async (event: MastraEvent): Promise<void> => {
    console.log("Mastra event publish:", event);
    // Mock publishing - in real implementation, this would send to the event system
  },
  getEventHistory: async (eventType?: string, limit?: number): Promise<MastraEvent[]> => {
    console.log("Mastra event get history:", { eventType, limit });
    // Mock history - in real implementation, this would query the event store
    return [];
  },
};

export const useMastraEvents = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, MastraEventSubscription>>(new Map());
  const [eventHistory, setEventHistory] = useState<MastraEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to events
  const subscribe = useCallback((eventType: string, handler: MastraEventHandler): string => {
    const subscription = mastraEvents.subscribe([eventType], handler);

    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.set(subscription.id, subscription);
      return updated;
    });

    return subscription.id;
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((subscriptionId: string): void => {
    const subscription = subscriptions.get(subscriptionId);
    if (subscription?.unsubscribe) {
      subscription.unsubscribe();
      setSubscriptions(prev => {
        const updated = new Map(prev);
        updated.delete(subscriptionId);
        return updated;
      });
    }
  }, [subscriptions]);

  // Publish events
  const publish = useCallback(async (event: MastraEvent): Promise<void> => {
    await mastraEvents.publish(event);

    // Add to local history
    setEventHistory(prev => [event, ...prev].slice(0, 1000)); // Keep last 1000 events
  }, []);

  // Subscribe to multiple event types
  const subscribeToMultiple = useCallback((
    eventTypes: string[],
    handler: MastraEventHandler
  ): string[] => {
    return eventTypes.map(eventType => subscribe(eventType, handler));
  }, [subscribe]);

  // Unsubscribe from multiple subscriptions
  const unsubscribeMultiple = useCallback((subscriptionIds: string[]): void => {
    subscriptionIds.forEach(id => unsubscribe(id));
  }, [unsubscribe]);

  // Get events by type
  const getEventsByType = useCallback((eventType: string): MastraEvent[] => {
    return eventHistory.filter(event => event.event === eventType);
  }, [eventHistory]);

  // Get events by time range
  const getEventsByTimeRange = useCallback((
    startTime: Date,
    endTime: Date
  ): MastraEvent[] => {
    const start = startTime.getTime();
    const end = endTime.getTime();

    return eventHistory.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= start && eventTime <= end;
    });
  }, [eventHistory]);

  // Clear event history
  const clearHistory = useCallback((): void => {
    setEventHistory([]);
  }, []);

  // Load event history from server
  const loadHistory = useCallback(async (eventType?: string, limit?: number): Promise<void> => {
    try {
      const history = await mastraEvents.getEventHistory(eventType, limit);
      setEventHistory(history);
    } catch (error) {
      console.error("Failed to load event history:", error);
    }
  }, []);

  // Connect to event system
  const connect = useCallback((): void => {
    setIsConnected(true);
    console.log("Connected to Mastra event system");
  }, []);

  // Disconnect from event system
  const disconnect = useCallback((): void => {
    // Unsubscribe from all subscriptions
    subscriptions.forEach(subscription => {
      subscription?.unsubscribe?.();
    });

    setSubscriptions(new Map());
    setIsConnected(false);
    console.log("Disconnected from Mastra event system");
  }, [subscriptions]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    subscriptions: Array.from(subscriptions.values()),
    eventHistory,
    isConnected,
    subscribe,
    unsubscribe,
    publish,
    subscribeToMultiple,
    unsubscribeMultiple,
    getEventsByType,
    getEventsByTimeRange,
    clearHistory,
    loadHistory,
    connect,
    disconnect,
  };
};

// Hook for event subscription management
export const useMastraEventSubscription = (
  eventType: string,
  handler: MastraEventHandler,
  dependencies: any[] = []
) => {
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const { subscribe, unsubscribe } = useMastraEvents();
  const dependenciesRef = useRef(dependencies);

  // Update dependencies ref when they change
  useEffect(() => {
    dependenciesRef.current = dependencies;
  }, [dependencies]);

  useEffect(() => {
    const id = subscribe(eventType, handler);
    setSubscriptionId(id);

    return () => {
      if (id) {
        unsubscribe(id);
      }
    };
  }, [eventType, handler, subscribe, unsubscribe]);

  return subscriptionId;
};

// Hook for event pattern matching
export const useMastraEventPattern = (pattern: {
  types?: string[];
  source?: string;
  dataFilter?: (data: any) => boolean;
}) => {
  const [matchedEvents, setMatchedEvents] = useState<MastraEvent[]>([]);
  const { subscribe, eventHistory } = useMastraEvents();

  const handler = useCallback((event: MastraEvent) => {
    let matches = true;

    if (pattern.types && !pattern.types.includes(event.event)) {
      matches = false;
    }

    if (pattern.source && event.metadata?.['source'] !== pattern.source) {
      matches = false;
    }

    if (pattern.dataFilter && !pattern.dataFilter(event.data)) {
      matches = false;
    }

    if (matches) {
      setMatchedEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 matches
    }
  }, [pattern]);

  // Subscribe to relevant event types
  useEffect(() => {
    const eventTypes = pattern.types || ["*"];
    const subscriptionIds = eventTypes.map(type => subscribe(type, handler));

    return () => {
      subscriptionIds.forEach(id => {
        if (id) {
          // Unsubscribe logic would go here
        }
      });
    };
  }, [pattern.types, handler, subscribe]);

  // Filter existing history
  useEffect(() => {
    const filtered = eventHistory.filter(event => {
      let matches = true;

      if (pattern.types && !pattern.types.includes(event.event)) {
        matches = false;
      }

      if (pattern.source && event.metadata?.['source'] !== pattern.source) {
        matches = false;
      }

      if (pattern.dataFilter && !pattern.dataFilter(event.data)) {
        matches = false;
      }

      return matches;
    });

    setMatchedEvents(filtered);
  }, [eventHistory, pattern]);

  return matchedEvents;
};

// Hook for event aggregation and analytics
export const useMastraEventAnalytics = (timeWindow?: number) => {
  const { eventHistory } = useMastraEvents();
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    eventTypeCounts: {} as Record<string, number>,
    sourceCounts: {} as Record<string, number>,
    timeSeriesData: [] as Array<{ timestamp: string; count: number }>,
  });

  useEffect(() => {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;

    const filteredEvents = timeWindow
      ? eventHistory.filter(event => new Date(event.timestamp).getTime() >= windowStart)
      : eventHistory;

    const eventTypeCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const timeSeriesData: Record<string, number> = {};

    filteredEvents.forEach(event => {
      // Count by type
      eventTypeCounts[event.event] = (eventTypeCounts[event.event] || 0) + 1;

      // Count by source
      const source = event.metadata?.['source'] || "unknown";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;

      // Group by time (hourly buckets)
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      timeSeriesData[hour] = (timeSeriesData[hour] || 0) + 1;
    });

    const sortedTimeSeries = Object.entries(timeSeriesData)
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    setAnalytics({
      totalEvents: filteredEvents.length,
      eventTypeCounts,
      sourceCounts,
      timeSeriesData: sortedTimeSeries,
    });
  }, [eventHistory, timeWindow]);

  return analytics;
};

// Event subscription manager for complex scenarios
export const useMastraEventSubscriptionManager = (): MastraEventSubscriptionManager => {
  const [subscriptions, setSubscriptions] = useState<Map<string, MastraEventSubscription>>(new Map());
  const { subscribe: baseSubscribe, unsubscribe: baseUnsubscribe } = useMastraEvents();

  const subscribe = useCallback((
    eventType: string,
    handler: MastraEventHandler,
    options?: { once?: boolean; priority?: number }
  ): string => {
    const wrappedHandler: MastraEventHandler = options?.once
      ? (event) => {
          handler(event);
          // Auto-unsubscribe after first event
          setTimeout(() => {
            // Find and remove subscription
            const subId = Array.from(subscriptions.entries())
              .find(([_, sub]) => sub.eventTypes.includes(eventType as any) && sub.handler === wrappedHandler)?.[0];
            if (subId) {
              baseUnsubscribe(subId);
              setSubscriptions(prev => {
                const updated = new Map(prev);
                updated.delete(subId);
                return updated;
              });
            }
          }, 0);
        }
      : handler;

    const subscriptionId = baseSubscribe(eventType, wrappedHandler);

    const subscription: MastraEventSubscription = {
      id: subscriptionId,
      eventTypes: [eventType as any], // Convert to MastraKnownEventTypes[]
      handler: wrappedHandler,
    };

    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.set(subscriptionId, subscription);
      return updated;
    });

    return subscriptionId;
  }, [baseSubscribe, baseUnsubscribe, subscriptions]);

  const unsubscribe = useCallback((subscriptionId: string): void => {
    baseUnsubscribe(subscriptionId);
    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.delete(subscriptionId);
      return updated;
    });
  }, [baseUnsubscribe]);

  const unsubscribeAll = useCallback((): void => {
    subscriptions.forEach((_, id) => {
      baseUnsubscribe(id);
    });
    setSubscriptions(new Map());
  }, [subscriptions, baseUnsubscribe]);

  const getActiveSubscriptions = useCallback((): MastraEventSubscription[] => {
    return Array.from(subscriptions.values());
  }, [subscriptions]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getActiveSubscriptions,
  };
};