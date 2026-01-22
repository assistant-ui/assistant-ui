import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TimingTracker } from "./TimingTracker";

describe("TimingTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should initialize with current time", () => {
      const tracker = new TimingTracker();
      expect(tracker.streamStartTime).toBe(1000);
    });
  });

  describe("recordChunk", () => {
    it("should record first chunk time", () => {
      const tracker = new TimingTracker();
      vi.advanceTimersByTime(100);
      tracker.recordChunk();

      const timing = tracker.getTiming();
      expect(timing.timeToFirstChunk).toBe(100);
      expect(timing.totalChunks).toBe(1);
    });

    it("should track largest chunk gap", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(50);
      tracker.recordChunk();

      vi.advanceTimersByTime(200);
      tracker.recordChunk();

      vi.advanceTimersByTime(100);
      tracker.recordChunk();

      const timing = tracker.getTiming();
      expect(timing.largestChunkGap).toBe(200);
      expect(timing.totalChunks).toBe(3);
    });

    it("should not update first chunk time after first chunk", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(100);
      tracker.recordChunk();

      vi.advanceTimersByTime(100);
      tracker.recordChunk();

      const timing = tracker.getTiming();
      expect(timing.timeToFirstChunk).toBe(100);
    });
  });

  describe("recordFirstToken", () => {
    it("should record first token time", () => {
      const tracker = new TimingTracker();
      vi.advanceTimersByTime(150);
      tracker.recordFirstToken();

      const timing = tracker.getTiming();
      expect(timing.timeToFirstToken).toBe(150);
    });

    it("should not update after first call", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(100);
      tracker.recordFirstToken();

      vi.advanceTimersByTime(100);
      tracker.recordFirstToken();

      const timing = tracker.getTiming();
      expect(timing.timeToFirstToken).toBe(100);
    });
  });

  describe("tool call tracking", () => {
    it("should track tool call duration", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(100);
      tracker.recordToolCallStart("tool-1");

      vi.advanceTimersByTime(500);
      tracker.recordToolCallEnd("tool-1");

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBe(1);
      expect(timing.toolCallTotalTime).toBe(500);
    });

    it("should track multiple tool calls", () => {
      const tracker = new TimingTracker();

      tracker.recordToolCallStart("tool-1");
      vi.advanceTimersByTime(200);
      tracker.recordToolCallEnd("tool-1");

      tracker.recordToolCallStart("tool-2");
      vi.advanceTimersByTime(300);
      tracker.recordToolCallEnd("tool-2");

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBe(2);
      expect(timing.toolCallTotalTime).toBe(500);
    });

    it("should handle concurrent tool calls", () => {
      const tracker = new TimingTracker();

      tracker.recordToolCallStart("tool-1");
      vi.advanceTimersByTime(100);

      tracker.recordToolCallStart("tool-2");
      vi.advanceTimersByTime(200);

      tracker.recordToolCallEnd("tool-1");
      vi.advanceTimersByTime(100);

      tracker.recordToolCallEnd("tool-2");

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBe(2);
      expect(timing.toolCallTotalTime).toBe(600); // 300 + 300
    });

    it("should ignore end for unknown tool call", () => {
      const tracker = new TimingTracker();
      tracker.recordToolCallEnd("unknown-tool");

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBeUndefined();
      expect(timing.toolCallTotalTime).toBeUndefined();
    });

    it("should ignore duplicate start events for same tool call", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(100);
      tracker.recordToolCallStart("tool-1");

      vi.advanceTimersByTime(200);
      tracker.recordToolCallStart("tool-1"); // duplicate - should be ignored

      vi.advanceTimersByTime(300);
      tracker.recordToolCallEnd("tool-1");

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBe(1); // not 2
      expect(timing.toolCallTotalTime).toBe(500); // 200 + 300, not 300
    });

    it("should ignore start event for already completed tool call", () => {
      const tracker = new TimingTracker();

      tracker.recordToolCallStart("tool-1");
      vi.advanceTimersByTime(200);
      tracker.recordToolCallEnd("tool-1");

      vi.advanceTimersByTime(100);
      tracker.recordToolCallStart("tool-1"); // already completed - should be ignored

      const timing = tracker.getTiming();
      expect(timing.toolCallCount).toBe(1); // not 2
      expect(timing.toolCallTotalTime).toBe(200);
    });
  });

  describe("server timing", () => {
    it("should store server timing", () => {
      const tracker = new TimingTracker();
      const serverTiming = {
        processingTime: 100,
        queueTime: 50,
      };

      tracker.setServerTiming(serverTiming);

      const timing = tracker.getTiming();
      expect(timing.server).toEqual(serverTiming);
    });

    it("should include custom server timing data", () => {
      const tracker = new TimingTracker();
      const serverTiming = {
        processingTime: 100,
        custom: { region: "us-east-1", model: "gpt-4" },
      };

      tracker.setServerTiming(serverTiming);

      const timing = tracker.getTiming();
      expect(timing.server?.custom).toEqual({
        region: "us-east-1",
        model: "gpt-4",
      });
    });
  });

  describe("getTiming", () => {
    it("should calculate tokens per second", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(1000); // 1 second

      const timing = tracker.getTiming(100); // 100 tokens
      expect(timing.tokensPerSecond).toBe(100);
    });

    it("should return null tokensPerSecond when no completion tokens", () => {
      const tracker = new TimingTracker();
      vi.advanceTimersByTime(1000);

      const timing = tracker.getTiming();
      expect(timing.tokensPerSecond).toBeUndefined();
    });

    it("should return complete timing object", () => {
      const tracker = new TimingTracker();

      vi.advanceTimersByTime(50);
      tracker.recordChunk();
      tracker.recordFirstToken();

      vi.advanceTimersByTime(100);
      tracker.recordChunk();

      tracker.recordToolCallStart("tool-1");
      vi.advanceTimersByTime(200);
      tracker.recordToolCallEnd("tool-1");

      tracker.setServerTiming({ processingTime: 10 });

      vi.advanceTimersByTime(50);

      const timing = tracker.getTiming(80);

      expect(timing.streamStartTime).toBe(1000);
      expect(timing.timeToFirstChunk).toBe(50);
      expect(timing.timeToFirstToken).toBe(50);
      expect(timing.totalStreamTime).toBe(400);
      expect(timing.totalChunks).toBe(2);
      expect(timing.largestChunkGap).toBe(100);
      expect(timing.toolCallCount).toBe(1);
      expect(timing.toolCallTotalTime).toBe(200);
      expect(timing.server?.processingTime).toBe(10);
      expect(timing.tokensPerSecond).toBe(200); // 80 tokens / 0.4s = 200 tok/s
    });
  });
});
