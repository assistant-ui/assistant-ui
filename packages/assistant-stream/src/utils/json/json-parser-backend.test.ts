import { afterEach, expect, it, vi } from "vitest";
import {
  registerJsonParserBackend,
  type JsonParserBackend,
  type JsonParserBackendContext,
} from "./json-parser-backend";
import { IncrementalJsonObjectParser } from "./incremental-json-object-parser";
import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

const referenceBackend = (
  context: JsonParserBackendContext,
): JsonParserBackend => {
  const { text, fallback, createSnapshot } = context;
  const parsed = text.trim() ? parsePartialJsonObject(text) : undefined;
  const meta = parsed && getPartialJsonObjectMeta(parsed);
  const args =
    parsed && meta
      ? createSnapshot(parsed, meta.state, meta.partialPath)
      : fallback;
  return {
    text,
    currentTextLength: text.length,
    currentArgs: args,
    append: (delta) =>
      referenceBackend({ ...context, text: text + delta, fallback: args }),
  };
};

it("registers through the public entry without a provider-specific import", async () => {
  const { registerJsonParserBackend: register } = await import("../../index");
  const factory = vi.fn(referenceBackend);
  cleanups.push(register(factory));
  const parser = IncrementalJsonObjectParser.from('{"value":"hel');
  expect(factory).toHaveBeenCalledOnce();
  expect(parser.append('lo"}').currentArgs).toMatchObject({ value: "hello" });
  expect(parser.currentArgs).toMatchObject({ value: "hel" });
});

it("keeps existing parsers and independently unregisters overlapping registrations", () => {
  const before = IncrementalJsonObjectParser.from('{"value":"');
  const first = vi.fn(referenceBackend);
  const second = vi.fn(referenceBackend);
  const removeFirst = registerJsonParserBackend(first);
  cleanups.push(removeFirst);
  const retained = IncrementalJsonObjectParser.from('{"value":"hel');
  const removeSecond = registerJsonParserBackend(second);
  cleanups.push(removeSecond);
  removeFirst();
  removeFirst();
  const latest = IncrementalJsonObjectParser.from('{"value":"new');
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
  removeSecond();

  expect(retained.append('lo"}').currentArgs).toMatchObject({ value: "hello" });
  expect(latest.append('est"}').currentArgs).toMatchObject({ value: "newest" });
  expect(before.append('native"}').currentArgs).toMatchObject({
    value: "native",
  });
  expect(
    IncrementalJsonObjectParser.from('{"value":').append("1}").currentArgs,
  ).toMatchObject({ value: 1 });
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
});

it("restores an earlier registration and distinguishes repeated factory registrations", () => {
  const first = vi.fn(referenceBackend);
  const second = vi.fn(referenceBackend);
  const removeFirst = registerJsonParserBackend(first);
  const removeDuplicate = registerJsonParserBackend(first);
  const removeSecond = registerJsonParserBackend(second);
  cleanups.push(removeFirst, removeDuplicate, removeSecond);
  removeFirst();
  IncrementalJsonObjectParser.from('{"value":');
  expect(second).toHaveBeenCalledOnce();
  removeSecond();
  IncrementalJsonObjectParser.from('{"value":');
  expect(first).toHaveBeenCalledOnce();
  removeDuplicate();
  IncrementalJsonObjectParser.from('{"value":');
  expect(first).toHaveBeenCalledOnce();
});

it("shares registration across separately loaded package copies", async () => {
  vi.resetModules();
  const duplicate = await import("./json-parser-backend");
  const factory = vi.fn(referenceBackend);
  cleanups.push(duplicate.registerJsonParserBackend(factory));
  const parser = IncrementalJsonObjectParser.from('{"value":"hel');
  expect(factory).toHaveBeenCalledOnce();
  expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual({
    state: "partial",
    partialPath: ["value"],
  });
  expect(parser.append('lo"}').currentArgs).toMatchObject({ value: "hello" });
  const other = await import("./incremental-json-object-parser");
  const otherMetadata = await import("./parse-partial-json-object");
  const otherParser = other.IncrementalJsonObjectParser.from('{"value":"other');
  expect(
    otherMetadata.getPartialJsonObjectMeta(otherParser.currentArgs),
  ).toEqual({ state: "partial", partialPath: ["value"] });
  expect(otherParser.append(' copy"}').currentArgs).toMatchObject({
    value: "other copy",
  });
});

it.each(["decline", "throw"])(
  "falls back when backend creation fails (%s)",
  (failure) => {
    cleanups.push(
      registerJsonParserBackend(() => {
        if (failure === "throw") throw new Error("backend unavailable");
        return undefined;
      }),
    );
    const parser = IncrementalJsonObjectParser.from('{"nested":{"value":"hel');
    expect(parser.append('lo"}}').currentArgs).toMatchObject({
      nested: { value: "hello" },
    });
    expect(parser.currentArgs).toMatchObject({ nested: { value: "hel" } });
  },
);

it.each(["decline", "throw"])(
  "replays the accepted prefix when append fails (%s)",
  (failure) => {
    cleanups.push(
      registerJsonParserBackend((context) => ({
        ...referenceBackend(context),
        append: () => {
          if (failure === "throw") throw new Error("unsupported delta");
          return undefined;
        },
      })),
    );
    const parser = IncrementalJsonObjectParser.from('{"value":"hel');
    const left = parser.append('lo"}');
    const right = parser.append('p"}');
    expect(left.currentArgs).toMatchObject({ value: "hello" });
    expect(right.currentArgs).toMatchObject({ value: "help" });
    expect(parser.currentTextLength).toBe('{"value":"hel'.length);
    expect(parser.currentArgs).toMatchObject({ value: "hel" });
    expect(getPartialJsonObjectMeta(left.currentArgs)?.state).toBe("complete");
  },
);

it("detaches backend snapshots and attaches metadata without mutating backend values", () => {
  const root = { nested: { value: "hel" } };
  cleanups.push(
    registerJsonParserBackend((context) => ({
      text: context.text,
      currentTextLength: context.text.length,
      currentArgs: context.createSnapshot(root, "partial", ["nested", "value"]),
      append: () => undefined,
    })),
  );
  const parser = IncrementalJsonObjectParser.from('{"nested":{"value":"hel');
  root.nested.value = "changed";
  expect(parser.currentArgs).toMatchObject({ nested: { value: "hel" } });
  expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual({
    state: "partial",
    partialPath: ["nested", "value"],
  });
  (parser.currentArgs.nested as { value: string }).value = "caller";
  expect(root.nested.value).toBe("changed");
});

it("preserves the complete-input fast path", () => {
  const factory = vi.fn(referenceBackend);
  cleanups.push(registerJsonParserBackend(factory));
  expect(
    IncrementalJsonObjectParser.from('{"value":"a }"}').currentArgs,
  ).toMatchObject({ value: "a }" });
  expect(factory).not.toHaveBeenCalled();
  const partial = IncrementalJsonObjectParser.from('{"value":"a }');
  expect(factory).toHaveBeenCalledOnce();
  expect(partial.append(' b"}').currentArgs).toMatchObject({ value: "a } b" });
});

it.each([
  '{"__proto__":{"polluted":true}}',
  '{"nested":[{"__proto__":{"polluted":true}}]}',
  '{"nested":{"constructor":{"prototype":{"polluted":true}}}}',
])("rejects unsafe backend snapshot keys and replays natively: %s", (input) => {
  const root = JSON.parse(input);
  cleanups.push(
    registerJsonParserBackend((context) => ({
      text: context.text,
      currentTextLength: context.text.length,
      currentArgs: context.createSnapshot(root, "partial", []),
      append: () => undefined,
    })),
  );
  const fallback = { value: "safe" };
  const parser = IncrementalJsonObjectParser.from(input, fallback);
  expect(parser.currentArgs).toBe(fallback);
  expect(Object.getPrototypeOf(parser.currentArgs)).toBe(Object.prototype);
  expect(parser.append(" ").currentArgs).toBe(fallback);
});
