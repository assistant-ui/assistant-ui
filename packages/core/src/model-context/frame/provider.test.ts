/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFrameProvider } from "./provider";
import { FRAME_MESSAGE_CHANNEL } from "./types";

describe("AssistantFrameProvider", () => {
  let messageHandler: ((event: MessageEvent) => void) | undefined;
  let parentWindow: Window;

  beforeEach(() => {
    parentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    Object.defineProperty(window, "parent", {
      value: parentWindow,
      configurable: true,
    });

    vi.spyOn(window, "addEventListener").mockImplementation(
      (event, listener) => {
        if (event === "message" && typeof listener === "function") {
          messageHandler = listener as (event: MessageEvent) => void;
        }
      },
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    AssistantFrameProvider.dispose();
    vi.restoreAllMocks();
  });

  it("only accepts tool calls from the parent window", async () => {
    const execute = vi.fn(async () => "result");
    AssistantFrameProvider.addModelContextProvider(
      {
        getModelContext: () => ({
          tools: {
            sensitiveTool: { execute },
          },
        }),
      },
      "https://parent.example",
    );

    const toolCall = {
      channel: FRAME_MESSAGE_CHANNEL,
      message: {
        type: "tool-call",
        id: "tool-call-1",
        toolName: "sensitiveTool",
        args: {},
      },
    };
    const otherWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    messageHandler?.(
      new MessageEvent("message", {
        data: toolCall,
        origin: "https://parent.example",
        source: otherWindow,
      }),
    );

    expect(execute).not.toHaveBeenCalled();

    messageHandler?.(
      new MessageEvent("message", {
        data: toolCall,
        origin: "https://parent.example",
        source: parentWindow,
      }),
    );

    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });
});
