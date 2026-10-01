// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useState, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { MessagePrimitiveParts } from "./MessageParts";
import { ChainOfThoughtPrimitiveParts } from "../chainOfThought/ChainOfThoughtParts";

const Named = () => <b>named</b>;
const Fallback = () => <i>fallback</i>;

const renderParts = (
  content: ThreadMessageLike["content"],
  components: MessagePrimitiveParts.Props["components"],
) => {
  const Message = () => <MessagePrimitiveParts components={components} />;
  const messages: ThreadMessageLike[] = [
    { id: "message", role: "assistant", content },
  ];
  const App = () => {
    const runtime = useExternalStoreRuntime({
      messages,
      convertMessage: (message) => message,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={{ Message }} />
      </AssistantRuntimeProvider>
    );
  };
  return render(<App />).container.innerHTML;
};

const toolCall = (toolName: string): ThreadMessageLike["content"] => [
  { type: "tool-call", toolCallId: "call", toolName, args: {} },
];

const dataPart = (name: string): ThreadMessageLike["content"] => [
  { type: "data", name, data: 1 },
];

const StateProbe = ({ text, image }: { text?: string; image?: string }) => {
  const value = text ?? image?.split("/").pop()?.split(".")[0] ?? "";
  const [seed] = useState(value);
  return <span>{`${seed}:${value}`}</span>;
};

const renderIdentityParts = (
  content: ThreadMessageLike["content"],
  mode: "children" | "components",
  components: MessagePrimitiveParts.Props["components"] = {
    Text: StateProbe,
    Image: StateProbe,
    Reasoning: StateProbe,
  },
) => {
  const Message = () =>
    mode === "children" ? (
      <MessagePrimitiveParts>
        {({ part }) =>
          part.type === "text" || part.type === "image" ? (
            <StateProbe {...part} />
          ) : null
        }
      </MessagePrimitiveParts>
    ) : (
      <MessagePrimitiveParts
        components={components}
        unstable_showEmptyOnNonTextEnd={false}
      />
    );
  const App = ({
    content,
    isRunning = true,
  }: {
    content: ThreadMessageLike["content"];
    isRunning?: boolean;
  }) => {
    const runtime = useExternalStoreRuntime({
      messages: [{ id: "message", role: "assistant", content }],
      convertMessage: (message: ThreadMessageLike) => message,
      isRunning,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={{ Message }} />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<App content={content} />);
  return {
    ...view,
    setContent: (content: ThreadMessageLike["content"], isRunning = true) =>
      view.rerender(<App content={content} isRunning={isRunning} />),
    values: () =>
      Array.from(
        view.container.querySelectorAll("span"),
        (el) => el.textContent,
      ),
  };
};

afterEach(cleanup);

describe("MessagePrimitive.Parts", () => {
  describe.each(["children", "components"] as const)("%s identity", (mode) => {
    it("keeps the seed while streaming and resets it for a replacement id", () => {
      const view = renderIdentityParts(
        [{ type: "text", id: "p1", text: "old" }],
        mode,
      );
      view.setContent([{ type: "text", id: "p1", text: "old streamed" }]);
      expect(view.values()).toEqual(["old:old streamed"]);
      view.setContent([{ type: "text", id: "p2", text: "new" }]);
      expect(view.values()).toEqual(["new:new"]);
    });

    it("keeps each seed with its id when parts swap", () => {
      const view = renderIdentityParts(
        [
          { type: "text", id: "p1", text: "first" },
          { type: "text", id: "p2", text: "second" },
        ],
        mode,
      );
      view.setContent([
        { type: "text", id: "p2", text: "second updated" },
        { type: "text", id: "p1", text: "first updated" },
      ]);
      expect(view.values()).toEqual([
        "second:second updated",
        "first:first updated",
      ]);
    });

    it("mounts fresh state when anonymous text becomes an image", () => {
      const view = renderIdentityParts([{ type: "text", text: "old" }], mode);
      view.setContent([
        { type: "image", image: "https://example.com/new.png" },
      ]);
      expect(view.values()).toEqual(["new:new"]);
    });

    it("keys duplicate ids positionally and remounts newly unique ids", () => {
      const view = renderIdentityParts(
        [
          { type: "text", id: "p1", text: "first" },
          { type: "text", id: "p1", text: "second" },
        ],
        mode,
      );
      view.setContent([
        { type: "text", id: "p1", text: "first streamed" },
        { type: "text", id: "p1", text: "second streamed" },
      ]);
      expect(view.values()).toEqual([
        "first:first streamed",
        "second:second streamed",
      ]);
      view.setContent([
        { type: "text", id: "p1", text: "second moved" },
        { type: "text", id: "p1", text: "first moved" },
      ]);
      expect(view.values()).toEqual([
        "first:second moved",
        "second:first moved",
      ]);
      view.setContent([
        { type: "text", id: "p2", text: "new" },
        { type: "text", id: "p1", text: "second streamed" },
      ]);
      expect(view.values()).toEqual([
        "new:new",
        "second streamed:second streamed",
      ]);
    });

    it("mounts fresh state when removing a duplicate makes an id unique", () => {
      const view = renderIdentityParts(
        [
          { type: "text", id: "p1", text: "first" },
          { type: "text", id: "p1", text: "second" },
        ],
        mode,
      );
      view.setContent([{ type: "text", id: "p1", text: "second updated" }]);
      expect(view.values()).toEqual(["second updated:second updated"]);
    });
  });

  it.each(["reasoning", "tool-call", "chain-of-thought"] as const)(
    "keeps the %s wrapper and every leaf seed when the first two children swap",
    (kind) => {
      let mounts = 0;
      const Group = ({ children }: PropsWithChildren) => {
        const [mount] = useState(() => ++mounts);
        return <section data-mount={mount}>{children}</section>;
      };
      const Tool = ({ argsText }: { argsText: string }) => (
        <StateProbe text={argsText} />
      );
      const ChainOfThought = () => (
        <Group>
          <ChainOfThoughtPrimitiveParts
            components={{ Reasoning: StateProbe, tools: { Fallback: Tool } }}
          />
        </Group>
      );
      const parts = ["first", "second", "third"].map((text, index) =>
        kind === "tool-call" || (kind === "chain-of-thought" && index === 1)
          ? {
              type: "tool-call" as const,
              toolCallId: text,
              toolName: "task",
              args: {},
              argsText: text,
            }
          : { type: "reasoning" as const, id: text, text },
      );
      const view = renderIdentityParts(
        parts,
        "components",
        kind === "chain-of-thought"
          ? { ChainOfThought }
          : {
              Reasoning: StateProbe,
              ReasoningGroup: Group,
              ToolGroup: Group,
              tools: { Fallback: Tool },
            },
      );
      const updated = parts.map((part) =>
        part.type === "tool-call"
          ? { ...part, argsText: `${part.argsText} updated` }
          : { ...part, text: `${part.text} updated` },
      );
      view.setContent([updated[1]!, updated[0]!, updated[2]!]);
      expect(view.container.querySelector("section")?.dataset.mount).toBe("1");
      expect(view.values()).toEqual([
        "second:second updated",
        "first:first updated",
        "third:third updated",
      ]);
    },
  );

  it("keeps a reasoning group mounted when its first part moves", () => {
    let mounts = 0;
    const ReasoningGroup = ({ children }: PropsWithChildren) => {
      const [mount] = useState(() => ++mounts);
      return <section data-mount={mount}>{children}</section>;
    };
    const view = renderIdentityParts(
      [{ type: "reasoning", id: "r1", text: "old" }],
      "components",
      { Reasoning: StateProbe, ReasoningGroup, Text: StateProbe },
    );
    view.setContent([
      { type: "text", text: "prefix" },
      { type: "reasoning", id: "r1", text: "new" },
    ]);
    expect(view.container.querySelector("section")?.dataset.mount).toBe("1");
    expect(view.values()).toEqual(["prefix:prefix", "old:new"]);
  });

  it.each(["reasoning", "tool-call", "chain-of-thought"] as const)(
    "keeps the %s wrapper and tool UI state when an earlier group appears on settle",
    (kind) => {
      let mounts = 0;
      const Group = ({ children }: PropsWithChildren) => {
        const [mount] = useState(() => ++mounts);
        return <section data-mount={mount}>{children}</section>;
      };
      const Tool = ({ argsText }: { argsText: string }) => (
        <StateProbe text={argsText} />
      );
      const ChainOfThought = () => (
        <Group>
          <ChainOfThoughtPrimitiveParts
            components={{ Reasoning: StateProbe, tools: { Fallback: Tool } }}
          />
        </Group>
      );
      const part =
        kind === "reasoning"
          ? { type: "reasoning" as const, id: "r1", text: "draft" }
          : {
              type: "tool-call" as const,
              toolCallId: "t1",
              toolName: "task",
              args: {},
              argsText: "draft",
            };
      const prefix = { type: "text" as const, text: "prefix" };
      const view = renderIdentityParts(
        [prefix, part],
        "components",
        kind === "chain-of-thought"
          ? { Text: StateProbe, ChainOfThought }
          : {
              Text: StateProbe,
              Reasoning: StateProbe,
              ReasoningGroup: Group,
              ToolGroup: Group,
              tools: { Fallback: Tool },
            },
      );
      view.setContent(
        [
          kind === "tool-call"
            ? {
                type: "tool-call",
                toolCallId: "t0",
                toolName: "task",
                args: {},
                argsText: "earlier",
              }
            : { type: "reasoning", id: "r0", text: "earlier" },
          prefix,
          part.type === "tool-call"
            ? { ...part, argsText: "settled" }
            : { ...part, text: "settled" },
        ],
        false,
      );
      expect(
        Array.from(
          view.container.querySelectorAll("section"),
          (el) => el.dataset.mount,
        ),
      ).toEqual(["2", "1"]);
      expect(view.values()).toEqual([
        "earlier:earlier",
        "prefix:prefix",
        "draft:settled",
      ]);
    },
  );

  it.each([false, true])(
    "keys groups without identified members by ordinal with chain of thought=%s",
    (chainOfThought) => {
      let mounts = 0;
      const Group = ({ children }: PropsWithChildren) => {
        const [mount] = useState(() => ++mounts);
        return <section data-mount={mount}>{children}</section>;
      };
      const ChainOfThought = () => (
        <Group>
          <ChainOfThoughtPrimitiveParts
            components={{ Reasoning: StateProbe }}
          />
        </Group>
      );
      const parts = [
        { type: "reasoning" as const, text: "first" },
        { type: "text" as const, text: "separator" },
        { type: "reasoning" as const, text: "second" },
      ];
      const view = renderIdentityParts(
        parts,
        "components",
        chainOfThought
          ? { ChainOfThought }
          : { Reasoning: StateProbe, ReasoningGroup: Group },
      );
      view.setContent([{ type: "text", text: "prefix" }, ...parts]);
      expect(
        Array.from(
          view.container.querySelectorAll("section"),
          (el) => el.dataset.mount,
        ),
      ).toEqual(["1", "2"]);
    },
  );

  it("keys reasoning leaves within a stable group by their ids", () => {
    const view = renderIdentityParts(
      [
        { type: "reasoning", id: "anchor", text: "anchor" },
        { type: "reasoning", id: "r1", text: "first" },
        { type: "reasoning", id: "r2", text: "second" },
      ],
      "components",
    );
    view.setContent([
      { type: "reasoning", id: "anchor", text: "anchor" },
      { type: "reasoning", id: "r2", text: "second updated" },
      { type: "reasoning", id: "r1", text: "first updated" },
    ]);
    expect(view.values()).toEqual([
      "anchor:anchor",
      "second:second updated",
      "first:first updated",
    ]);
    view.setContent([
      { type: "reasoning", id: "anchor", text: "anchor" },
      { type: "reasoning", id: "r3", text: "new" },
    ]);
    expect(view.values()).toEqual(["anchor:anchor", "new:new"]);
  });

  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a tool call named %s that only Object.prototype has",
    (toolName) => {
      expect(
        renderParts(toolCall(toolName), {
          tools: { by_name: { other: Named }, Fallback },
        }),
      ).toBe("<i>fallback</i>");
    },
  );

  it.each(["toString", "constructor", "__proto__"])(
    "falls back for a data part named %s that only Object.prototype has",
    (name) => {
      expect(
        renderParts(dataPart(name), {
          data: { by_name: { other: Named }, Fallback },
        }),
      ).toBe("<i>fallback</i>");
    },
  );

  it("renders a tool UI registered under an inherited name", () => {
    expect(
      renderParts(toolCall("toString"), {
        tools: { by_name: { toString: Named }, Fallback },
      }),
    ).toBe("<b>named</b>");
  });

  it("renders a data UI registered under an inherited name", () => {
    expect(
      renderParts(dataPart("toString"), {
        data: { by_name: { toString: Named }, Fallback },
      }),
    ).toBe("<b>named</b>");
  });
});
