import { afterEach, expect, it, vi } from "vitest";
import { IncrementalJsonScanner } from "streamfold";
import { initializeStreamfold } from "./index";
import { IncrementalJsonObjectParser } from "../utils/json/incremental-json-object-parser";
import { setJsonParserBackend } from "../utils/json/json-parser-backend";
import { AssistantMessageStream } from "../core/accumulators/AssistantMessageStream";
import { ToolCallReaderImpl } from "../core/tool/ToolCallReader";
import type { AssistantStreamChunk } from "../core/AssistantStreamChunk";

afterEach(() => {
  setJsonParserBackend(undefined);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("uses Streamfold for new parsers and releases completed or rejected streams", async () => {
  const existing = IncrementalJsonObjectParser.from('{"value":"');
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
  expect(existing.append('native"}').currentArgs).toMatchObject({
    value: "native",
  });
  expect(push).not.toHaveBeenCalled();
  const parser = IncrementalJsonObjectParser.from('{"value":"');
  expect(parser.append('wasm"}').currentArgs).toMatchObject({ value: "wasm" });
  expect(push.mock.calls.map(([chunk]) => chunk)).toEqual([
    '{"value":"',
    'wasm"}',
  ]);
  expect(dispose).toHaveBeenCalledTimes(1);
  const malformed = IncrementalJsonObjectParser.from('{"value":1');
  expect(malformed.append("oops").currentArgs).toMatchObject({ value: 1 });
  expect(dispose).toHaveBeenCalledTimes(2);
});

it("keeps Streamfold active when string keys and values end a chunk with a hyphen", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
  const chunks = ['{"tag-', 'name":"well-', 'known"}'] as const;
  const partial = IncrementalJsonObjectParser.from(chunks[0]).append(chunks[1]);

  expect(partial.currentArgs).toMatchObject({ "tag-name": "well-" });
  expect(dispose).not.toHaveBeenCalled();
  expect(partial.append(chunks[2]).currentArgs).toMatchObject({
    "tag-name": "well-known",
  });
  expect(push.mock.calls.map(([chunk]) => chunk)).toEqual(chunks);
  expect(dispose).toHaveBeenCalledTimes(1);
});

it("keeps complete emoji on Streamfold across argument deltas", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
  const chunks = ['{"😀":"café ', "東京 🚀", ' is ready"}'] as const;
  const partial = IncrementalJsonObjectParser.from(chunks[0]).append(chunks[1]);

  expect(partial.currentArgs).toMatchObject({ "😀": "café 東京 🚀" });
  expect(dispose).not.toHaveBeenCalled();
  expect(partial.append(chunks[2]).currentArgs).toMatchObject({
    "😀": "café 東京 🚀 is ready",
  });
  expect(partial.currentArgs).toMatchObject({ "😀": "café 東京 🚀" });
  expect(push.mock.calls.map(([chunk]) => chunk)).toEqual(chunks);
  expect(dispose).toHaveBeenCalledTimes(1);
});

it("keeps partial strings and nested objects ending in a brace on Streamfold", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
  const string = IncrementalJsonObjectParser.from('{"text":"a }');
  expect(string.currentArgs).toMatchObject({ text: "a }" });
  expect(string.append(' b"}').currentArgs).toMatchObject({ text: "a } b" });
  const nested = IncrementalJsonObjectParser.from('{"nested":{"value":1}');
  expect(nested.append(',"tail":2}').currentArgs).toMatchObject({
    nested: { value: 1 },
    tail: 2,
  });

  expect(push.mock.calls.map(([chunk]) => chunk)).toEqual([
    '{"text":"a }',
    ' b"}',
    '{"nested":{"value":1}',
    ',"tail":2}',
  ]);
  expect(dispose).toHaveBeenCalledTimes(2);
});

it("keeps complete single-delta input on the native fast path", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  expect(
    IncrementalJsonObjectParser.from('{"nested":{"value":"a }"}} \n')
      .currentArgs,
  ).toMatchObject({ nested: { value: "a }" } });
  expect(push).not.toHaveBeenCalled();
});

it("isolates published snapshots across whitespace-only deltas", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const early = IncrementalJsonObjectParser.from('{"nested":{"value":1},');
  const later = early.append(" ");
  const nested = early.currentArgs.nested as { value: number };
  nested.value = 2;

  expect(later.currentArgs).toMatchObject({ nested: { value: 1 } });
  expect(later.append('"tail":3}').currentArgs).toMatchObject({
    nested: { value: 1 },
    tail: 3,
  });
});

it.each([
  ["\uD83D", '\uDE00"}', "😀"],
  ["\uDE00", 'tail"}', "\uDE00tail"],
])(
  "preserves unpaired surrogate deltas through native fallback",
  async (delta, rest, value) => {
    expect(await initializeStreamfold()).toBe(true);
    const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
    const partial =
      IncrementalJsonObjectParser.from('{"value":"').append(delta);

    expect(partial.currentArgs).toMatchObject({ value: delta });
    expect(partial.append(rest).currentArgs).toMatchObject({ value });
    expect(partial.currentArgs).toMatchObject({ value: delta });
    expect(dispose).toHaveBeenCalledTimes(1);
  },
);

it("parses accumulator snapshots and reader field completion through Streamfold", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const push = vi.spyOn(IncrementalJsonScanner.prototype, "push");
  const chunks: AssistantStreamChunk[] = [
    {
      type: "part-start",
      path: [],
      part: { type: "tool-call", toolCallId: "call", toolName: "write" },
    },
    { type: "text-delta", path: [0], textDelta: '{"value":"hel' },
    { type: "text-delta", path: [0], textDelta: 'lo"}' },
    { type: "tool-call-args-text-finish", path: [0] },
    { type: "part-finish", path: [0] },
  ];
  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const result =
    await AssistantMessageStream.fromAssistantStream(source).unstable_result();
  expect(result.parts[0]).toMatchObject({
    args: { value: "hello" },
    argsText: '{"value":"hello"}',
  });
  expect(push).toHaveBeenCalledWith('lo"}');
  push.mockClear();
  const reader = new ToolCallReaderImpl<
    { value: string; later: string },
    null
  >();
  const value = reader.args.get("value");
  await reader.appendArgsTextDelta('{"value":"done",');
  await expect(value).resolves.toBe("done");
  expect(push).toHaveBeenCalledWith('{"value":"done",');
  await reader.appendArgsTextDelta('"later":"end"}');
  await reader.finishArgsText();
});
