// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuiConfig } from "@assistant-ui/store";
import { resource } from "@assistant-ui/tap";
import type { ThreadMessageLike } from "../../../runtime/utils/thread-message-like";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { Tools } from "../../client/Tools";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { MessagePrimitiveParts } from "./MessageParts";

const Named = () => <b>named</b>;
const Fallback = () => <i>fallback</i>;
const Mcp = () => <b>mcp</b>;
const McpApp = resource(function McpApp() {
  return { render: Mcp };
});
const mcpConfig = AuiConfig({ tools: Tools({ mcpApp: McpApp() }) });

const renderParts = (
  content: ThreadMessageLike["content"],
  components: MessagePrimitiveParts.Props["components"],
  config?: AuiConfig,
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
      <AssistantRuntimeProvider
        runtime={runtime}
        {...(config === undefined ? {} : { config })}
      >
        <ThreadPrimitiveMessages components={{ Message }} />
      </AssistantRuntimeProvider>
    );
  };
  return render(<App />).container.innerHTML;
};

const toolCall = (toolName: string): ThreadMessageLike["content"] => [
  { type: "tool-call", toolCallId: "call", toolName, args: {} },
];

const mcpToolCall = (
  resourceUri = "ui://chart",
): ThreadMessageLike["content"] => [
  {
    type: "tool-call",
    toolCallId: "call",
    toolName: "show_chart",
    args: {},
    mcp: { app: { resourceUri } },
  },
];

const dataPart = (name: string): ThreadMessageLike["content"] => [
  { type: "data", name, data: 1 },
];

afterEach(cleanup);

describe("MessagePrimitive.Parts", () => {
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

  it("renders tools.mcpApp for a tool call with a ui:// resource", () => {
    expect(renderParts(mcpToolCall(), { tools: { Fallback } }, mcpConfig)).toBe(
      "<b>mcp</b>",
    );
  });

  it("uses inline Fallback when the tool call has no ui:// resource", () => {
    expect(
      renderParts(toolCall("show_chart"), { tools: { Fallback } }, mcpConfig),
    ).toBe("<i>fallback</i>");
  });

  it("prefers an inline by_name component over tools.mcpApp", () => {
    // The documented order is registered tool UI, then by_name, then the
    // generic MCP App renderer, so a named component still claims a ui:// call.
    expect(
      renderParts(
        mcpToolCall(),
        { tools: { by_name: { show_chart: Named }, Fallback } },
        mcpConfig,
      ),
    ).toBe("<b>named</b>");
  });

  it("uses inline Fallback when the resource URI is not an MCP App URI", () => {
    expect(
      renderParts(
        mcpToolCall("https://example.com/chart"),
        { tools: { Fallback } },
        mcpConfig,
      ),
    ).toBe("<i>fallback</i>");
  });
});
