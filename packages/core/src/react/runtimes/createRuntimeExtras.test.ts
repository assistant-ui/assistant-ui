import { describe, it, expect } from "vitest";
import type { AssistantClient } from "@assistant-ui/store";
import { createRuntimeExtras } from "./createRuntimeExtras";

type Extras = { value: number; greet: () => string };

const clientWith = (extras: unknown) =>
  ({
    thread: () => ({ getState: () => ({ extras }) }),
  }) as unknown as AssistantClient;

describe("createRuntimeExtras", () => {
  it("brands a value so its own guards recognize it", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");
    const branded = channel.provide({ value: 1, greet: () => "hi" });

    expect(channel.is(branded)).toBe(true);
    expect(channel.tryGet(branded)).toBe(branded);
  });

  it("returns the same object reference from provide (stable identity)", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");
    const value = { value: 1, greet: () => "hi" };
    expect(channel.provide(value)).toBe(value);
  });

  it("keeps the brand non-enumerable so it stays out of serialization", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");
    const branded = channel.provide({ value: 1, greet: () => "hi" });

    expect(Object.keys(branded)).toEqual(["value", "greet"]);
    expect(JSON.parse(JSON.stringify(branded))).toEqual({ value: 1 });
  });

  it("rejects unbranded and foreign values", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");
    const other = createRuntimeExtras<Extras>("useOtherRuntime");
    const foreign = other.provide({ value: 2, greet: () => "yo" });

    expect(channel.is(undefined)).toBe(false);
    expect(channel.is({ value: 1 })).toBe(false);
    expect(channel.is(foreign)).toBe(false);
    expect(channel.tryGet(foreign)).toBeUndefined();
  });

  it("get reads the current snapshot off an AssistantClient", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");
    const branded = channel.provide({ value: 7, greet: () => "hi" });

    expect(channel.get(clientWith(branded)).value).toBe(7);
  });

  it("get throws with the runtime name when the thread is not backed by it", () => {
    const channel = createRuntimeExtras<Extras>("useTestRuntime");

    expect(() => channel.get(clientWith(undefined))).toThrow("useTestRuntime");
  });
});
