import type { ThreadMessage } from "@assistant-ui/react";
import { describe, expect, it } from "vitest";
import { inspectToolCalls } from "./tool-calls";

type Message = Pick<ThreadMessage, "role" | "content">;

const call = (
  toolCallId: string,
  toolName: string,
  args: Record<string, string>,
  result?: unknown,
) => ({
  type: "tool-call" as const,
  toolCallId,
  toolName,
  args,
  argsText: toolName === "search_images" ? JSON.stringify(args) : "",
  ...(result !== undefined ? { result } : {}),
});

describe("inspectToolCalls", () => {
  it("shows the patches, widget code, or arguments of each call in the latest answer, with every result", () => {
    const messages: Message[] = [
      { role: "assistant", content: [call("old", "render_spec", {})] },
      { role: "user", content: [{ type: "text", text: "Plan a road trip" }] },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Here is a plan." },
          call(
            "images",
            "search_images",
            { query: "Bixby Bridge" },
            { results: [{ query: "Bixby Bridge", images: [] }] },
          ),
          call(
            "spec",
            "render_spec",
            { patches: '{"op":"add"}' },
            { ok: true },
          ),
          call("widget", "show_widget", { widget_code: "<p>Hi</p>" }),
          call("lookup", "lookup", { city: "Monterey" }, "Sunny"),
        ],
      },
    ];

    expect(inspectToolCalls(messages)).toEqual([
      {
        id: "images",
        name: "search_images",
        body: '{"query":"Bixby Bridge"}',
        result: JSON.stringify(
          { results: [{ query: "Bixby Bridge", images: [] }] },
          null,
          2,
        ),
      },
      {
        id: "spec",
        name: "render_spec",
        body: '{"op":"add"}',
        result: JSON.stringify({ ok: true }, null, 2),
      },
      {
        id: "widget",
        name: "show_widget",
        body: "<p>Hi</p>",
        result: undefined,
      },
      {
        id: "lookup",
        name: "lookup",
        body: JSON.stringify({ city: "Monterey" }, null, 2),
        result: "Sunny",
      },
    ]);
  });

  it("finds no calls when the latest answer is text", () => {
    expect(
      inspectToolCalls([
        { role: "assistant", content: [{ type: "text", text: "A latte." }] },
      ]),
    ).toEqual([]);
  });
});
