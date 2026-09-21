import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const domProps = ({
    accessibilityLabel,
    accessibilityRole,
    children,
    className,
    onPress,
    pointerEvents: _pointerEvents,
    style,
    "aria-checked": checked,
    ...props
  }: any) => ({
    ...props,
    className,
    "aria-label": accessibilityLabel,
    "aria-checked": checked,
    "data-transform": style?.transform
      ? JSON.stringify(style.transform)
      : undefined,
    onClick: onPress,
    role: accessibilityRole,
  });
  const View = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Text = (props: any) =>
    React.createElement("span", domProps(props), props.children);
  const Pressable = (props: any) =>
    React.createElement("button", domProps(props), props.children);

  return { ...actual, Pressable, Text, View };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const icon = (name: string) => () =>
    React.createElement("span", { "data-testid": name });

  return {
    MicIcon: icon("MicIcon"),
    MicOffIcon: icon("MicOffIcon"),
    PhoneOffIcon: icon("PhoneOffIcon"),
  };
});

import { VoiceConversation } from "./voice-conversation";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("VoiceConversation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (
    props: Partial<Parameters<typeof VoiceConversation>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <VoiceConversation
          mode="connecting"
          amplitude={0}
          transcript={[]}
          {...props}
        />,
      );
    });
  };

  it("renders the caption and hint for each mode", async () => {
    const cases = [
      ["connecting", "Connecting", "Opening the mic"],
      ["listening", "Listening", "Listening for you"],
      ["thinking", "Thinking", "Working on it"],
      ["speaking", "Speaking", "Playing the reply"],
    ] as const;

    for (const [mode, caption, hint] of cases) {
      await render({ mode });

      expect(container.textContent).toContain(caption);
      expect(container.textContent).toContain(hint);
    }

    await render({ mode: "listening", muted: true });
    expect(container.textContent).toContain("Mic off");
  });

  it("clamps the amplitude before scaling the orb layers", async () => {
    const scales = () =>
      Array.from(container.querySelectorAll("[data-transform]")).map(
        (element) =>
          JSON.parse(element.getAttribute("data-transform")!)[0].scale,
      );

    await render({ mode: "listening", amplitude: 4 });
    expect(scales()).toEqual([1, 1.02, 1.1]);

    await render({ mode: "listening", amplitude: -1 });
    expect(scales()).toEqual([0.72, 0.8, 0.9]);
  });

  it("enables interrupt only while speaking with a handler", async () => {
    const onInterrupt = vi.fn();
    const interrupt = () =>
      container.querySelector(
        '[aria-label="Interrupt the assistant"]',
      ) as HTMLButtonElement;

    await render({ mode: "listening", onInterrupt });
    expect(interrupt().disabled).toBe(true);

    await render({ mode: "speaking" });
    expect(interrupt().disabled).toBe(true);
    expect(container.textContent).toContain("Playing the reply");

    await render({ mode: "speaking", onInterrupt });
    expect(interrupt().disabled).toBe(false);
    expect(container.textContent).toContain("Tap to interrupt");

    await act(async () => {
      click(interrupt());
    });
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });

  it("exposes and invokes the mute toggle", async () => {
    const onToggleMute = vi.fn();
    const mute = () =>
      container.querySelector('[role="togglebutton"]') as HTMLButtonElement;

    await render();
    expect(mute().getAttribute("aria-checked")).toBe("false");
    expect(mute().getAttribute("aria-label")).toBe("Turn the microphone off");
    expect(mute().disabled).toBe(true);

    await render({ muted: true, onToggleMute });
    expect(mute().getAttribute("aria-checked")).toBe("true");
    expect(mute().getAttribute("aria-label")).toBe("Turn the microphone on");
    expect(mute().disabled).toBe(false);

    await act(async () => {
      click(mute());
    });
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("disables the end call control without a handler", async () => {
    const onEnd = vi.fn();
    const end = () =>
      container.querySelector(
        '[aria-label="End the call"]',
      ) as HTMLButtonElement;

    await render();
    expect(end().disabled).toBe(true);

    await render({ onEnd });
    expect(end().disabled).toBe(false);
    await act(async () => {
      click(end());
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("renders each transcript turn with its speaker label", async () => {
    await render({
      transcript: [
        { id: "user", role: "user", text: "Could you help?" },
        { id: "assistant", role: "assistant", text: "Of course." },
      ],
    });

    expect(
      Array.from(container.querySelectorAll(".min-h-18 > div")).map(
        (turn) => turn.textContent,
      ),
    ).toEqual(["youCould you help?", "aiOf course."]);
  });
});
