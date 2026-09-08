// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { createRenderCounter } from "@assistant-ui/x-performance";
import { StreamdownTextPrimitive } from "./StreamdownText";

const renderObserver = vi.hoisted(() => ({ current: () => {} }));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => {
      renderObserver.current();
      return original.useMessagePartText();
    },
  };
});

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const counter = createRenderCounter();
renderObserver.current = () => counter.useRender("primitive");

afterEach(() => {
  counter.reset();
});

describe.each([
  { name: "defer off", defer: false },
  { name: "defer on", defer: true },
])("Streamdown streaming with $name", ({ defer }) => {
  it("does not add a third primitive render per token", async () => {
    const root = createRoot(document.createElement("div"));
    act(() =>
      root.render(
        <TextMessagePartProvider text="0" isRunning>
          <StreamdownTextPrimitive defer={defer} />
        </TextMessagePartProvider>,
      ),
    );

    for (let token = 1; token <= 5; token++) {
      await act(async () => {
        root.render(
          <TextMessagePartProvider text={`0 ${token}`} isRunning>
            <StreamdownTextPrimitive defer={defer} />
          </TextMessagePartProvider>,
        );
      });
    }

    expect(counter.renders("primitive")).toBe(11);
    act(() => root.unmount());
  });
});
