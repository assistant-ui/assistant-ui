import { describe, expect, it } from "vitest";
import type { AssistantClient } from "../types/client";
import {
  bindClientDestroySignal,
  getClientDestroySignal,
} from "./tap-assistant-context";

describe("client destroy signals", () => {
  it("resolves the nearest signal through the client prototype chain", () => {
    const parent = {} as AssistantClient;
    const child = Object.create(parent) as AssistantClient;
    const signal = new AbortController().signal;

    bindClientDestroySignal(parent, signal);

    expect(getClientDestroySignal(child)).toBe(signal);
  });

  it("does not retain a cleared binding", () => {
    const client = {} as AssistantClient;
    const signal = new AbortController().signal;

    bindClientDestroySignal(client, signal);
    bindClientDestroySignal(client, undefined);

    expect(getClientDestroySignal(client)).toBeUndefined();
  });
});
