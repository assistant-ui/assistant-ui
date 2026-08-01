/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadPrimitiveRoot } from "./ThreadRoot";

const stopSpeaking = vi.fn();
const threadState = {
  speech: undefined as undefined | { messageId: string; status: "running" },
};

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    thread: {
      getState: () => threadState,
      stopSpeaking,
    },
  }),
}));

describe("ThreadPrimitiveRoot", () => {
  beforeEach(() => {
    stopSpeaking.mockReset();
    threadState.speech = undefined;
  });

  it("stops active speech on Escape without a message action bar", () => {
    threadState.speech = { messageId: "msg-1", status: "running" };
    render(<ThreadPrimitiveRoot />);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });

    act(() => document.dispatchEvent(event));

    expect(stopSpeaking).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not consume Escape when no speech is active", () => {
    render(<ThreadPrimitiveRoot />);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });

    act(() => document.dispatchEvent(event));

    expect(stopSpeaking).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
