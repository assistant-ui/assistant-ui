import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { unstable_injectInteractableContext } from "./injectInteractableContext";
import { injectQuoteContext } from "./injectQuoteContext";

type Interactable = {
  name: string;
  id: string;
  state: unknown;
  partial?: boolean;
};

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

describe("unstable_injectInteractableContext", () => {
  it("returns the message unchanged when there is no interactable metadata", () => {
    const input = [userMsg()];
    const out = unstable_injectInteractableContext(input);
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
    const out = unstable_injectInteractableContext(input);
    expect(out[0]).toBe(input[0]);
  });

  it("prepends a text part using the default format (id included for update_* addressing)", () => {
    const out = unstable_injectInteractableContext([
      userMsg([{ name: "note", id: "n1", state: { title: "Hi" } }]),
    ]);
    expect(textOf(out[0]!.parts[0])).toBe(
      '[Current state of "note" (id: "n1"): {"title":"Hi"}]\n\n',
    );
    expect(textOf(out[0]!.parts[1])).toBe("hello");
  });

  it("formats a partial snapshot as changed fields", () => {
    const out = unstable_injectInteractableContext([
      userMsg([
        { name: "note", id: "n1", state: { title: "Hi" }, partial: true },
      ]),
    ]);
    expect(textOf(out[0]!.parts[0])).toBe(
      '[State of "note" (id: "n1") changed — updated fields: {"title":"Hi"}; fields not listed are unchanged]\n\n',
    );
  });

  it("joins multiple interactables with a newline", () => {
    const out = unstable_injectInteractableContext([
      userMsg([
        { name: "note", id: "n1", state: { v: 1 } },
        { name: "board", id: "b1", state: { v: 2 } },
      ]),
    ]);
    expect(textOf(out[0]!.parts[0])).toBe(
      '[Current state of "note" (id: "n1"): {"v":1}]\n' +
        '[Current state of "board" (id: "b1"): {"v":2}]\n\n',
    );
  });

  it("respects a custom format function", () => {
    const out = unstable_injectInteractableContext(
      [userMsg([{ name: "note", id: "n1", state: { v: 1 } }])],
      (item) => `X:${item.name}`,
    );
    expect(textOf(out[0]!.parts[0])).toBe("X:note\n\n");
  });

  it("leaves messages with an empty interactables array unchanged", () => {
    const input = [userMsg([])];
    expect(unstable_injectInteractableContext(input)[0]).toBe(input[0]);
  });

  it("does not throw when a user message has no parts", () => {
    const input = [
      {
        id: "m1",
        role: "user",
        metadata: {
          custom: {
            interactables: [{ name: "note", id: "n1", state: { v: 1 } }],
          },
        },
      } as unknown as UIMessage,
    ];
    const run = () => unstable_injectInteractableContext(input);
    expect(run).not.toThrow();
    expect(textOf(run()[0]!.parts[0])).toBe(
      '[Current state of "note" (id: "n1"): {"v":1}]\n\n',
    );
  });

  it("is idempotent on its own (does not double-inject)", () => {
    const once = unstable_injectInteractableContext([
      userMsg([{ name: "note", id: "n1", state: { v: 1 } }]),
    ]);
    const twice = unstable_injectInteractableContext(once);
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
      const out = injectQuoteContext(
        unstable_injectInteractableContext([both()]),
      );
      const parts = out[0]!.parts;
      expect(textOf(parts[0])).toBe("> quoted\n\n");
      expect(isStateText(parts[1])).toBe(true);
      expect(textOf(parts[2])).toBe("hello");
    });

    it("is NOT idempotent across re-application: run injectors once over un-injected messages", () => {
      // Each injector's `alreadyInjected` guard only inspects parts[0]. Once the
      // other injector sits at parts[0], the guard misses and re-prepends. So the
      // composition must run once over source messages, never re-run over output.
      const once = injectQuoteContext(
        unstable_injectInteractableContext([both()]),
      );
      const twice = injectQuoteContext(
        unstable_injectInteractableContext(once),
      );
      expect(twice[0]!.parts.filter(isStateText)).toHaveLength(2);
    });
  });
});
