import { describe, expect, it, vi } from "vitest";
import { consumeSuggestionResult, createSuggestionAdapter } from "./suggestion";
import type { ThreadMessage } from "../types/message";
import type { ThreadSuggestion } from "../runtime/interfaces/thread-runtime-core";

const message = (
  role: "user" | "assistant" | "system",
  text: string,
  id = `${role}-${text}`,
): ThreadMessage =>
  ({
    id,
    role,
    content: text ? [{ type: "text", text }] : [],
    createdAt: new Date(),
    status:
      role === "assistant" ? { type: "complete", reason: "stop" } : undefined,
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      custom: {},
    },
  }) as unknown as ThreadMessage;

describe("createSuggestionAdapter", () => {
  it("builds a role-labeled transcript from recent messages and honors maxMessages", async () => {
    const complete = vi.fn().mockResolvedValue(["follow up"]);
    const adapter = createSuggestionAdapter({ complete, maxMessages: 2 });

    await adapter.generate({
      messages: [
        message("user", "first"),
        message("assistant", "second"),
        message("user", "third"),
        message("assistant", "fourth"),
      ],
    });

    expect(complete).toHaveBeenCalledTimes(1);
    const prompt = complete.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("user: third");
    expect(prompt).toContain("assistant: fourth");
    expect(prompt).not.toContain("user: first");
    expect(prompt).not.toContain("assistant: second");
  });

  it("skips messages with empty text in the transcript", async () => {
    const complete = vi.fn().mockResolvedValue(["follow up"]);
    const adapter = createSuggestionAdapter({ complete });

    await adapter.generate({
      messages: [
        message("user", "hello"),
        message("assistant", ""),
        message("user", "again"),
      ],
    });

    const prompt = complete.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("user: hello");
    expect(prompt).toContain("user: again");
    expect(prompt).not.toMatch(/^assistant:/m);
  });

  it("includes count and instructions in the prompt", async () => {
    const complete = vi.fn().mockResolvedValue(["a", "b", "c", "d", "e"]);
    const adapter = createSuggestionAdapter({
      complete,
      count: 5,
      instructions: "Prefer short product questions",
    });

    await adapter.generate({
      messages: [message("user", "hello")],
    });

    const prompt = complete.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("exactly 5");
    expect(prompt).toContain("Prefer short product questions");
  });

  it("trims, drops empties, and clamps results to count", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(["  one  ", "", "  ", "two", "three", "four"]);
    const adapter = createSuggestionAdapter({ complete, count: 2 });

    const result = await adapter.generate({
      messages: [message("user", "hello")],
    });

    expect(result).toEqual([{ prompt: "one" }, { prompt: "two" }]);
  });

  it("forwards the generate signal to complete when defined", async () => {
    const complete = vi.fn().mockResolvedValue(["ok"]);
    const adapter = createSuggestionAdapter({ complete });
    const controller = new AbortController();

    await adapter.generate({
      messages: [message("user", "hello")],
      signal: controller.signal,
    });

    expect(complete).toHaveBeenCalledWith({
      prompt: expect.any(String),
      signal: controller.signal,
    });
  });

  it("omits signal from complete options when generate has no signal", async () => {
    const complete = vi.fn().mockResolvedValue(["ok"]);
    const adapter = createSuggestionAdapter({ complete });

    await adapter.generate({
      messages: [message("user", "hello")],
    });

    expect(complete).toHaveBeenCalledWith({
      prompt: expect.any(String),
    });
    expect(complete.mock.calls[0]![0]).not.toHaveProperty("signal");
  });

  it("treats maxMessages 0 as an empty transcript while still calling complete", async () => {
    const complete = vi.fn().mockResolvedValue(["follow up"]);
    const adapter = createSuggestionAdapter({ complete, maxMessages: 0 });

    await adapter.generate({
      messages: [message("user", "first"), message("assistant", "second")],
    });

    expect(complete).toHaveBeenCalledTimes(1);
    const prompt = complete.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("Conversation:\n");
    expect(prompt).not.toContain("user: first");
    expect(prompt).not.toContain("assistant: second");
    expect(prompt).toContain("exactly 3");
  });
});

describe("consumeSuggestionResult", () => {
  it("calls onUpdate for each yield and stops after abort mid-stream", async () => {
    const controller = new AbortController();
    const updates: ThreadSuggestion[][] = [];
    const onUpdate = vi.fn((s: readonly ThreadSuggestion[]) => {
      updates.push([...s]);
    });

    async function* generate() {
      yield [{ prompt: "one" }];
      yield [{ prompt: "two" }];
      controller.abort();
      yield [{ prompt: "three" }];
      yield [{ prompt: "four" }];
    }

    await consumeSuggestionResult(generate(), {
      signal: controller.signal,
      onUpdate,
    });

    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(updates).toEqual([[{ prompt: "one" }], [{ prompt: "two" }]]);
  });

  it("drops the promise result when aborted before resolve", async () => {
    const controller = new AbortController();
    const onUpdate = vi.fn();
    let resolve!: (value: readonly ThreadSuggestion[]) => void;
    const promise = new Promise<readonly ThreadSuggestion[]>((r) => {
      resolve = r;
    });

    const consumption = consumeSuggestionResult(promise, {
      signal: controller.signal,
      onUpdate,
    });

    controller.abort();
    resolve([{ prompt: "late" }]);
    await consumption;

    expect(onUpdate).not.toHaveBeenCalled();
  });
});
