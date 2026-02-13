import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimingTracker } from "./TimingTracker";

describe("TimingTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should record stream start time", () => {
    const tracker = new TimingTracker();
    const timing = tracker.getTiming();
    expect(timing.streamStartTime).toBe(1000);
  });

  it("should count chunks", () => {
    const tracker = new TimingTracker();
    tracker.recordChunk();
    tracker.recordChunk();
    tracker.recordChunk();
    const timing = tracker.getTiming();
    expect(timing.totalChunks).toBe(3);
  });

  it("should record first token time", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(50);
    tracker.recordFirstToken();
    vi.advanceTimersByTime(100);
    tracker.recordFirstToken(); // should not overwrite
    const timing = tracker.getTiming();
    expect(timing.firstTokenTime).toBe(50);
  });

  it("should not set firstTokenTime if no text tokens", () => {
    const tracker = new TimingTracker();
    const timing = tracker.getTiming();
    expect(timing.firstTokenTime).toBeUndefined();
  });

  it("should track unique tool calls", () => {
    const tracker = new TimingTracker();
    tracker.recordToolCallStart("tc-1");
    tracker.recordToolCallStart("tc-2");
    tracker.recordToolCallStart("tc-1"); // duplicate
    const timing = tracker.getTiming();
    expect(timing.toolCallCount).toBe(2);
  });

  it("should compute totalStreamTime", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(200);
    const timing = tracker.getTiming();
    expect(timing.totalStreamTime).toBe(200);
  });

  it("should use completionTokens when available", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(1000);
    const timing = tracker.getTiming(42, "some text");
    expect(timing.tokenCount).toBe(42);
    expect(timing.tokensPerSecond).toBe(42);
  });

  it("should estimate tokens from text when no completionTokens", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(1000);
    // 20 chars / 4 = 5 tokens
    const timing = tracker.getTiming(undefined, "12345678901234567890");
    expect(timing.tokenCount).toBe(5);
    expect(timing.tokensPerSecond).toBe(5);
  });

  it("should handle zero completionTokens by falling back to text", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(1000);
    const timing = tracker.getTiming(0, "1234567890"); // 10 chars -> 3 tokens
    expect(timing.tokenCount).toBe(3);
  });

  it("should handle no tokens and no text", () => {
    const tracker = new TimingTracker();
    vi.advanceTimersByTime(100);
    const timing = tracker.getTiming();
    expect(timing.tokenCount).toBeUndefined();
    expect(timing.tokensPerSecond).toBeUndefined();
  });

  it("should handle zero stream time (no division by zero)", () => {
    const tracker = new TimingTracker();
    // Don't advance time — totalStreamTime = 0
    const timing = tracker.getTiming(100, "text");
    expect(timing.totalStreamTime).toBe(0);
    expect(timing.tokensPerSecond).toBeUndefined();
  });
});
