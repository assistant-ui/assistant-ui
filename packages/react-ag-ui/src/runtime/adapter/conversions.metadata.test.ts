import { describe, expect, it } from "vitest";
import { fromAgUiMessages, toAgUiMessages } from "./conversions";

describe("AG-UI message metadata", () => {
  it("round-trips message metadata through AG-UI snapshots", () => {
    const interrupts = [{ id: "int-1", reason: "confirmation" }];
    const imported = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: "Hello",
        metadata: { record: "r-1" },
      },
      {
        id: "a-1",
        role: "assistant",
        content: "Waiting",
        metadata: { stopped: true, agui: { interrupts } },
      },
      {
        id: "d-1",
        role: "developer",
        content: "Hidden",
        metadata: { source: "app" },
      },
    ] as any);

    expect(imported.map((message) => message.metadata?.custom)).toEqual([
      { record: "r-1" },
      {
        stopped: true,
        agui: { messageMetadata: { stopped: true, agui: { interrupts } } },
      },
      { source: "app", agui: { role: "developer" } },
    ]);
    expect(toAgUiMessages(imported)).toEqual([
      {
        id: "u-1",
        role: "user",
        content: "Hello",
        metadata: { record: "r-1" },
      },
      {
        id: "a-1",
        role: "assistant",
        content: "Waiting",
        metadata: { stopped: true, agui: { interrupts } },
      },
      {
        id: "d-1",
        role: "developer",
        content: "Hidden",
        metadata: { source: "app" },
      },
    ]);
  });

  it("round-trips tool and reasoning message metadata on their parts", () => {
    const imported = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "tool-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "result",
        metadata: { source: "tool" },
      },
      {
        id: "reasoning-1",
        role: "reasoning",
        content: "Thinking",
        metadata: { source: "reasoning" },
      },
      { id: "a-2", role: "assistant", content: "Done" },
    ] as any);

    expect(toAgUiMessages(imported)).toMatchObject([
      { id: "a-1", role: "assistant" },
      {
        id: "tool-1",
        role: "tool",
        metadata: { source: "tool" },
      },
      {
        id: "reasoning-1",
        role: "reasoning",
        metadata: { source: "reasoning" },
      },
      { id: "a-2", role: "assistant" },
    ]);
  });

  it("round-trips metadata on encrypted reasoning records", () => {
    const imported = fromAgUiMessages([
      {
        id: "reasoning-1",
        role: "reasoning",
        content: "",
        encryptedValue: "signed",
        metadata: { source: "reasoning" },
      },
      { id: "a-1", role: "assistant", content: "Done" },
    ] as any);

    expect(toAgUiMessages(imported)).toEqual([
      {
        id: "reasoning-1",
        role: "reasoning",
        content: "",
        encryptedValue: "signed",
        metadata: { source: "reasoning" },
      },
      { id: "a-1", role: "assistant", content: "Done" },
    ]);
  });

  it("preserves a wire agui key", () => {
    const source = [
      {
        id: "u-1",
        role: "user",
        content: "Hello",
        metadata: { agui: { app: 1 } },
      },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("preserves nested custom.agui wire metadata", () => {
    const source = [
      {
        id: "u-1",
        role: "user",
        content: "Hello",
        metadata: { custom: { agui: { app: 1 }, keep: 2 }, other: 3 },
      },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("keeps an empty assistant record with wire metadata", () => {
    const source = [
      {
        id: "a-1",
        role: "assistant",
        content: "",
        metadata: { stopped: true },
      },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("preserves colliding metadata across every wire role", () => {
    const metadata = {
      agui: { custom: { agui: [1, { custom: null }] } },
      custom: { agui: { app: 1 }, keep: 2 },
      nested: { custom: { agui: { value: true } } },
    };
    const source = [
      { id: "u-1", role: "user", content: "Hi", metadata },
      { id: "s-1", role: "system", content: "Be brief", metadata },
      { id: "d-1", role: "developer", content: "Internal", metadata },
      {
        id: "a-1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "c-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
        metadata,
      },
      { id: "t-1", role: "tool", toolCallId: "c-1", content: "done", metadata },
      { id: "r-1", role: "reasoning", content: "Thinking", metadata },
      { id: "a-2", role: "assistant", content: "Done", metadata },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("preserves an explicit empty metadata object", () => {
    const source = [
      { id: "u-1", role: "user", content: "Hi", metadata: {} },
      { id: "a-1", role: "assistant", content: "", metadata: {} },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("does not treat state-like nested wire keys as the adapter's state", () => {
    const source = [
      {
        id: "s-1",
        role: "system",
        content: "Be brief",
        metadata: { custom: { agui: { role: "developer" } } },
      },
      {
        id: "a-1",
        role: "assistant",
        content: "Done",
        metadata: {
          custom: {
            agui: {
              role: "developer",
              interrupts: [{ id: "app-1", reason: "app" }],
              opaqueReasoning: [{ id: "app-2", encryptedValue: "app" }],
            },
          },
        },
      },
    ];
    expect(toAgUiMessages(fromAgUiMessages(source))).toEqual(source);
  });

  it("decodes adapter state in the legacy ThreadMessage custom.agui slot", () => {
    expect(
      toAgUiMessages([
        {
          id: "s-1",
          role: "system",
          content: "Internal",
          metadata: { custom: { agui: { role: "developer" } } },
        },
        {
          id: "a-1",
          role: "assistant",
          content: "Done",
          metadata: {
            custom: {
              agui: {
                opaqueReasoning: [{ id: "r-1", encryptedValue: "signed" }],
              },
            },
          },
        },
      ]),
    ).toEqual([
      { id: "s-1", role: "developer", content: "Internal" },
      { id: "r-1", role: "reasoning", content: "", encryptedValue: "signed" },
      { id: "a-1", role: "assistant", content: "Done" },
    ]);
  });
});
