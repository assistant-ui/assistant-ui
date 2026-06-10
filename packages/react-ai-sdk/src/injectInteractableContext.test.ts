import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { injectInteractableContext } from "./injectInteractableContext";
import { injectQuoteContext } from "./injectQuoteContext";

type Interactable = { name: string; id: string; state: unknown };

const userMsg = (
  interactables?: Interactable[],
  extraCustom?: Record<string, unknown>,
): UIMessage =>
  ({
    id: "m1",
    role: "user",
    parts: [{ type: "text", text: "hello" }],
    ...(interactables || extraCustom
      ? {
          metadata: {
            custom: {
              ...extraCustom,
              ...(interactables ? { interactables } : {}),
            },
          },
        }
      : {}),
  }) as UIMessage;

const textOf = (part: unknown) => (part as { text?: string }).text;
const isStateText = (part: unknown) =>
  (part as { type?: string }).type === "text" &&
  (textOf(part) ?? "").startsWith("[Current state of");

describe("injectInteractableContext", () => {
  it("returns the message unchanged when there is no interactable metadata", () => {
    const input = [userMsg()];
    const out = injectInteractableContext(input);
    expect(out[0]).toBe(input[0]);
  });

  it("skips non-user messages", () => {
    const input = [
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "hi" }],
        metadata: {
          custom: {
            interactables: [{ name: "note", id: "n1", state: { v: 1 } }],
          },
        },
      } as UIMessage,
    ];
    const out = injectInteractableContext(input);
    expect(out[0]).toBe(input[0]);
  });

  it("prepends a text part using the default format", () => {
    const out = injectInteractableContext([
      userMsg([{ name: "note", id: "n1", state: { title: "Hi" } }]),
    ]);
    expect(textOf(out[0]!.parts[0])).toBe(
      '[Current state of "note": {"title":"Hi"}]\n\n',
    );
    expect(textOf(out[0]!.parts[1])).toBe("hello");
  });

  it("joins multiple interactables with a newline", () => {
    const out = injectInteractableContext([
      userMsg([
        { name: "note", id: "n1", state: { v: 1 } },
        { name: "board", id: "b1", state: { v: 2 } },
      ]),
    ]);
    expect(textOf(out[0]!.parts[0])).toBe(
      '[Current state of "note": {"v":1}]\n' +
        '[Current state of "board": {"v":2}]\n\n',
    );
  });

  it("respects a custom format function", () => {
    const out = injectInteractableContext(
      [userMsg([{ name: "note", id: "n1", state: { v: 1 } }])],
      (item) => `X:${item.name}`,
    );
    expect(textOf(out[0]!.parts[0])).toBe("X:note\n\n");
  });

  it("leaves messages with an empty interactables array unchanged", () => {
    const input = [userMsg([])];
    expect(injectInteractableContext(input)[0]).toBe(input[0]);
  });

  it("is idempotent on its own (does not double-inject)", () => {
    const once = injectInteractableContext([
      userMsg([{ name: "note", id: "n1", state: { v: 1 } }]),
    ]);
    const twice = injectInteractableContext(once);
    expect(twice[0]).toBe(once[0]);
    expect(twice[0]!.parts.filter(isStateText)).toHaveLength(1);
  });

  describe("composition with injectQuoteContext", () => {
    const both = () =>
      userMsg([{ name: "note", id: "n1", state: { v: 1 } }], {
        quote: { text: "quoted" },
      });

    it("stacks both injections in a fixed order over source messages", () => {
      // Apply interactable first, then quote — quote ends up outermost.
      const out = injectQuoteContext(injectInteractableContext([both()]));
      const parts = out[0]!.parts;
      expect(textOf(parts[0])).toBe("> quoted\n\n");
      expect(isStateText(parts[1])).toBe(true);
      expect(textOf(parts[2])).toBe("hello");
    });

    it("is NOT idempotent across re-application: run injectors once over un-injected messages", () => {
      // Each injector's `alreadyInjected` guard only inspects parts[0]. Once the
      // other injector sits at parts[0], the guard misses and re-prepends. So the
      // composition must run once over source messages, never re-run over output.
      const once = injectQuoteContext(injectInteractableContext([both()]));
      const twice = injectQuoteContext(injectInteractableContext(once));
      expect(twice[0]!.parts.filter(isStateText)).toHaveLength(2);
    });
  });
});
