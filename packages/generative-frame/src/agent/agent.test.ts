import { describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../spec/catalog";
import { createWidgetTools } from "../tools/tools";
import { createSpecTools, specGuidanceModule } from "../spec/render-spec";
import { createWidgetAgent, type WidgetSink } from "./agent";
import { fromAISDK } from "./ai-sdk";
import type { AgentMessage, AgentModelEvent, WidgetAgentModel } from "./model";
import { parsePartialJson } from "./partial-json";

describe("parsePartialJson", () => {
  it.each([
    ["", undefined],
    ['{"a', {}],
    ['{"a":', {}],
    ['{"a":"he', { a: "he" }],
    ['{"a":"line\\', { a: "line" }],
    ['{"a":"x\\n\\u00e9\\u00', { a: "x\né" }],
    ['{"a":[1,2,{"b":tr', { a: [1, 2, {}] }],
    ['{"a":[1,2,{"b":true}],"c":nu', { a: [1, 2, { b: true }] }],
    ['{"n":-12.5e2,"s":"\\"q\\""}', { n: -1250, s: '"q"' }],
  ])("%j → %j", (text, expected) => {
    expect(parsePartialJson(text)).toEqual(expected);
  });
});

/** Splits a tool call's JSON arguments into streamed deltas. */
const toolCall = (
  id: string,
  name: string,
  args: unknown,
  size = 9,
): AgentModelEvent[] => {
  const text = JSON.stringify(args);
  const deltas: AgentModelEvent[] = [];
  for (let i = 0; i < text.length; i += size) {
    deltas.push({
      type: "tool-call-delta",
      id,
      ...(i === 0 ? { name } : {}),
      argsTextDelta: text.slice(i, i + size),
    });
  }
  return [...deltas, { type: "tool-call", id, name, args }, { type: "finish" }];
};

const scripted = (responses: AgentModelEvent[][]) => {
  const calls: { messages: AgentMessage[]; tools: string[] }[] = [];
  const model: WidgetAgentModel = async function* (messages, { tools }) {
    calls.push({ messages: [...messages], tools: tools.map((t) => t.name) });
    for (const event of responses[calls.length - 1] ?? [
      { type: "text-delta", text: "Done." },
    ]) {
      yield event;
    }
  };
  return { model, calls };
};

const fakeSink = (inspections: { errors: string[] }[]) => {
  let index = 0;
  const writes: string[] = [];
  const sink = {
    writes,
    write: vi.fn((chunk: string) => void writes.push(chunk)),
    end: vi.fn(async () => {}),
    replace: vi.fn(async (_code: string) => {}),
    inspect: vi.fn(async () => {
      const next = inspections[Math.min(index++, inspections.length - 1)]!;
      return {
        errors: next.errors.map((message) => ({
          kind: "error" as const,
          message,
        })),
        console: [],
        blank: false,
        size: { width: 600, height: 200 },
      };
    }),
    spec: vi.fn(),
  };
  return sink satisfies WidgetSink;
};

const BROKEN = '<div id="out"></div><script>renderChart()</script>';
const FIXED =
  '<div id="out"></div><script>document.getElementById("out").textContent = "ok"</script>';

describe("createWidgetAgent (html)", () => {
  it("reads the guide, streams the widget, repairs it, and summarizes", async () => {
    const { model, calls } = scripted([
      toolCall("c1", "read_me", { modules: ["chart"] }),
      toolCall("c2", "show_widget", { title: "anything", widget_code: BROKEN }),
      toolCall("c3", "edit_widget", {
        title: "anything",
        edits: [
          {
            old_string: "renderChart()",
            new_string: 'document.getElementById("out").textContent = "ok"',
          },
        ],
      }),
      [
        { type: "text-delta", text: "Shows " },
        { type: "text-delta", text: "the status." },
        { type: "finish" },
      ],
    ]);
    const sink = fakeSink([
      { errors: ["renderChart is not defined"] },
      { errors: [] },
    ]);
    const events: string[] = [];
    const agent = createWidgetAgent({
      model,
      settleMs: 0,
      onEvent: (event) => events.push(event.type),
    });

    const result = await agent.generate(
      { brief: "Status panel. Shows ok.", data: { status: "ok" } },
      { sink },
    );

    expect(result).toEqual({
      ok: true,
      title: "status_panel",
      mode: "html",
      summary: "Shows the status.",
      errors: [],
      code: FIXED,
      rounds: 2,
    });
    expect(sink.writes.join("")).toBe(BROKEN);
    expect(sink.writes.length).toBeGreaterThan(3);
    expect(sink.end).toHaveBeenCalledTimes(1);
    expect(sink.replace).toHaveBeenCalledWith(FIXED);

    expect(calls[0]!.tools).toEqual(["read_me", "show_widget", "edit_widget"]);
    expect(calls[0]!.messages[0]!.content).toContain('title "status_panel"');
    expect(calls[0]!.messages[1]!.content).toContain('"status": "ok"');
    const firstFeedback = calls[2]!.messages.at(-1)!;
    expect(firstFeedback).toMatchObject({
      role: "tool",
      name: "show_widget",
      toolCallId: "c2",
    });
    expect(firstFeedback.content).toContain(
      "- error: renderChart is not defined",
    );
    expect(calls[3]!.messages.at(-1)!.content).toContain(
      "rendered without errors",
    );
    expect(events.filter((type) => type === "feedback")).toHaveLength(2);
    expect(events.at(-1)).toBe("done");
  });

  it("stops after maxRounds failed renders and reports the remaining errors", async () => {
    const show = (id: string) =>
      toolCall(id, "show_widget", { title: "x", widget_code: BROKEN });
    const { model, calls } = scripted([
      show("a"),
      show("b"),
      show("c"),
      show("d"),
    ]);
    const sink = fakeSink([{ errors: ["boom"] }]);
    const result = await createWidgetAgent({
      model,
      settleMs: 0,
      maxRounds: 2,
    }).generate({ brief: "x", title: "My Widget" }, { sink });
    expect(result).toMatchObject({
      ok: false,
      title: "my_widget",
      rounds: 2,
      errors: ["error: boom"],
    });
    expect(calls).toHaveLength(2);
    expect(sink.end).toHaveBeenCalledTimes(1);
    expect(sink.replace).toHaveBeenCalledTimes(1);
  });

  it("uses the preview option and reports a widget that was never rendered", async () => {
    const preview = vi.fn(async () => ({
      errors: [],
      console: [],
      blank: true,
    }));
    const { model } = scripted([
      toolCall("a", "show_widget", { title: "x", widget_code: "<p></p>" }),
      [{ type: "text-delta", text: "Empty." }],
    ]);
    const blank = await createWidgetAgent({
      model,
      preview,
      maxRounds: 1,
    }).generate({ brief: "x" });
    expect(preview).toHaveBeenCalledWith("<p></p>");
    expect(blank).toMatchObject({
      ok: false,
      errors: ["The widget rendered blank."],
    });

    const silent = await createWidgetAgent({
      model: scripted([[{ type: "text-delta", text: "No." }]]).model,
    }).generate({
      brief: "x",
    });
    expect(silent).toMatchObject({
      ok: false,
      rounds: 0,
      summary: "No.",
      errors: ["The widget was never rendered."],
    });
  });

  it("exposes generate_widget as a tool that streams into createSink", async () => {
    const { model } = scripted([
      toolCall("a", "show_widget", { title: "x", widget_code: FIXED }),
    ]);
    const sink = fakeSink([{ errors: [] }]);
    const createSink = vi.fn(() => sink);
    const agent = createWidgetAgent({ model, settleMs: 0, createSink });
    expect(agent.tool.name).toBe("generate_widget");
    expect(agent.tool.inputSchema.required).toEqual(["brief"]);
    const result = await agent.tool.execute({ brief: "Show ok", mode: "html" });
    expect(createSink).toHaveBeenCalledWith({ title: "show_ok", mode: "html" });
    expect(result).toMatchObject({ ok: true, summary: "Done.", rounds: 1 });
  });
});

describe("createWidgetAgent (spec)", () => {
  const catalog = defineCatalog({
    components: {
      Stack: { description: "Layout", slots: ["default"] },
      Metric: {
        description: "Number",
        props: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "number" } },
          required: ["label", "value"],
        },
      },
    },
  });

  it("streams patches into the sink and repairs validation issues", async () => {
    const patches = [
      '{"op":"add","path":"/root","value":"main"}',
      '{"op":"add","path":"/elements/main","value":{"type":"Stack","children":["m"]}}',
      '{"op":"add","path":"/elements/m","value":{"type":"Metric","props":{"label":"Users"}}}',
    ].join("\n");
    const { model, calls } = scripted([
      toolCall("a", "render_spec", { title: "x", patches }, 20),
      toolCall("b", "render_spec", {
        title: "x",
        patches: '{"op":"add","path":"/elements/m/props/value","value":7}',
      }),
      [{ type: "text-delta", text: "A user metric." }],
    ]);
    const sink = fakeSink([]);
    const result = await createWidgetAgent({
      model,
      tools: createWidgetTools({
        extraTools: createSpecTools(catalog),
        modules: [specGuidanceModule(catalog)],
      }),
    }).generate({ brief: "Users", mode: "spec" }, { sink });
    expect(calls[0]!.tools).toEqual(["read_me", "render_spec"]);
    expect(calls[1]!.messages.at(-1)!.content).toContain(
      '/elements/m/props/value: Metric "m" prop value is required.',
    );
    expect(result).toMatchObject({
      ok: true,
      mode: "spec",
      rounds: 2,
      summary: "A user metric.",
    });
    expect(result.spec?.elements["m"]?.props).toEqual({
      label: "Users",
      value: 7,
    });
    const streamingFlags = sink.spec.mock.calls.map(
      ([, info]) => info.streaming,
    );
    expect(streamingFlags.filter(Boolean)).toHaveLength(2);
    expect(streamingFlags.at(-1)).toBe(false);
  });

  it("falls back to html without a catalog", async () => {
    const { model, calls } = scripted([[{ type: "text-delta", text: "ok" }]]);
    const result = await createWidgetAgent({ model }).generate({
      brief: "x",
      mode: "spec",
    });
    expect(result.mode).toBe("html");
    expect(calls[0]!.tools).toContain("show_widget");
  });
});

describe("fromAISDK", () => {
  it("converts messages, declares tools without execute, and maps stream parts", async () => {
    const streamText = vi.fn((_options: Record<string, unknown>) => ({
      stream: (async function* () {
        yield { type: "start" };
        yield { type: "text-delta", id: "t", text: "Hi" };
        yield { type: "tool-input-start", id: "c", toolName: "read_me" };
        yield { type: "tool-input-delta", id: "c", delta: '{"modules":' };
        yield { type: "tool-input-delta", id: "c", delta: "[]}" };
        yield {
          type: "tool-call",
          toolCallId: "c",
          toolName: "read_me",
          input: { modules: [] },
        };
        yield { type: "finish", finishReason: "tool-calls" };
      })(),
    }));
    const jsonSchema = vi.fn((schema: unknown) => ({ wrapped: schema }));
    const model = fromAISDK({
      streamText,
      jsonSchema,
      model: "m",
      settings: { temperature: 0 },
    });
    const events: AgentModelEvent[] = [];
    const controller = new AbortController();
    for await (const event of model(
      [
        { role: "system", content: "sys" },
        { role: "user", content: "u" },
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "1", name: "read_me", args: {} }],
        },
        { role: "tool", toolCallId: "1", name: "read_me", content: "guide" },
      ],
      {
        tools: [
          {
            name: "read_me",
            description: "d",
            inputSchema: { type: "object" },
          },
        ],
        signal: controller.signal,
      },
    )) {
      events.push(event);
    }
    expect(events).toEqual([
      { type: "text-delta", text: "Hi" },
      { type: "tool-call-delta", id: "c", name: "read_me", argsTextDelta: "" },
      { type: "tool-call-delta", id: "c", argsTextDelta: '{"modules":' },
      { type: "tool-call-delta", id: "c", argsTextDelta: "[]}" },
      { type: "tool-call", id: "c", name: "read_me", args: { modules: [] } },
      { type: "finish", reason: "tool-calls" },
    ]);
    const options = streamText.mock.calls[0]![0];
    expect(options).toMatchObject({
      temperature: 0,
      model: "m",
      abortSignal: controller.signal,
      tools: {
        read_me: {
          description: "d",
          inputSchema: { wrapped: { type: "object" } },
        },
      },
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "u" },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "1",
              toolName: "read_me",
              input: {},
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "1",
              toolName: "read_me",
              output: { type: "text", value: "guide" },
            },
          ],
        },
      ],
    });
    expect(
      "execute" in (options["tools"] as Record<string, object>)["read_me"]!,
    ).toBe(false);
  });

  it("throws stream errors", async () => {
    const model = fromAISDK({
      streamText: () => ({
        fullStream: (async function* () {
          yield { type: "error", error: new Error("rate limited") };
        })(),
      }),
      jsonSchema: (schema) => schema,
      model: "m",
    });
    const iterate = async () => {
      for await (const _ of model([], { tools: [] })) {
        // drain
      }
    };
    await expect(iterate()).rejects.toThrow("rate limited");
  });
});
