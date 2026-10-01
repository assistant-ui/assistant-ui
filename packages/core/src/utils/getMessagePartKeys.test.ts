import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../types/message";
import {
  getMessagePartKeys,
  getMessagePartGroupIdentity,
} from "./getMessagePartKeys";

describe("getMessagePartKeys", () => {
  it("keys unique identities by type and id", () => {
    expect(
      getMessagePartKeys([
        { type: "text", id: "p1", text: "first" },
        { type: "reasoning", id: "r1", text: "thinking" },
        {
          type: "source",
          id: "s1",
          sourceType: "url",
          url: "https://example.com",
        },
        {
          type: "tool-call",
          toolCallId: "t1",
          toolName: "task",
          args: {},
          argsText: "{}",
        },
      ]),
    ).toEqual(["text:p1", "reasoning:r1", "source:s1", "tool-call:t1"]);
  });

  it("keys anonymous and empty ids by type and message position", () => {
    expect(
      getMessagePartKeys([
        { type: "text", text: "first" },
        { type: "text", id: "", text: "second" },
        { type: "image", image: "https://example.com/image.png" },
      ]),
    ).toEqual(["text@0", "text@1", "image@2"]);
  });

  it("keys every duplicate id and tool call id by message position", () => {
    expect(
      getMessagePartKeys([
        { type: "text", id: "p1", text: "first" },
        { type: "text", id: "p1", text: "second" },
        {
          type: "tool-call",
          toolCallId: "t1",
          toolName: "task",
          args: {},
          argsText: "{}",
        },
        {
          type: "tool-call",
          toolCallId: "t1",
          toolName: "task",
          args: {},
          argsText: "{}",
        },
        { type: "text", id: "p2", text: "unique" },
      ]),
    ).toEqual(["text@0", "text@1", "tool-call@2", "tool-call@3", "text:p2"]);
  });

  it("keys the same id on parts of different types by identity", () => {
    expect(
      getMessagePartKeys([
        { type: "text", id: "shared", text: "first" },
        { type: "reasoning", id: "shared", text: "thinking" },
        {
          type: "tool-call",
          toolCallId: "shared",
          toolName: "task",
          args: {},
          argsText: "{}",
        },
      ]),
    ).toEqual(["text:shared", "reasoning:shared", "tool-call:shared"]);
  });

  it("keys empty and missing tool call ids by message position", () => {
    const parts = [
      {
        type: "tool-call",
        toolCallId: "",
        toolName: "task",
        args: {},
        argsText: "{}",
      },
      { type: "tool-call", toolName: "task", args: {}, argsText: "{}" },
    ] as ThreadMessage["content"];
    expect(getMessagePartKeys(parts)).toEqual(["tool-call@0", "tool-call@1"]);
  });

  it("reuses the keys array for an unchanged parts array", () => {
    const parts = [{ type: "text" as const, text: "first" }];
    const keys = getMessagePartKeys(parts);

    expect(getMessagePartKeys(parts)).toBe(keys);
    expect(getMessagePartKeys([...parts])).not.toBe(keys);
  });
});

describe("getMessagePartGroupIdentity", () => {
  it("compares only identity keys, including their types", () => {
    expect(
      getMessagePartGroupIdentity([
        "image@0",
        "tool-call:a",
        "reasoning:z",
        "reasoning:b@1",
        undefined,
      ]),
    ).toBe("reasoning:b@1");
  });

  it("leaves groups without identified members to the ordinal fallback", () => {
    expect(
      getMessagePartGroupIdentity(["text@0", "reasoning@1", undefined]),
    ).toBeUndefined();
    expect(getMessagePartGroupIdentity([])).toBeUndefined();
  });
});
