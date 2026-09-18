import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  state: { thread: { messages: [] as any[] } },
  voice: undefined as any,
  volume: 0,
  controls: {
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
  },
}));

vi.mock("@assistant-ui/react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react-native")>()),
  useAuiState: (selector: (state: typeof h.state) => unknown) =>
    selector(h.state),
  useVoiceState: () => h.voice,
  useVoiceVolume: () => h.volume,
  useVoiceControls: () => h.controls,
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const domProps = ({
    accessibilityLabel,
    accessibilityRole,
    accessibilityLiveRegion,
    children,
    className,
    onPress,
    style: _style,
    ...props
  }: any) => ({
    ...props,
    className,
    "aria-label": accessibilityLabel,
    "aria-live": accessibilityLiveRegion,
    onClick: onPress,
    role: accessibilityRole,
  });
  const View = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Pressable = (props: any) =>
    React.createElement("button", domProps(props), props.children);
  const Text = (props: any) =>
    React.createElement("span", domProps(props), props.children);

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
    AudioLinesIcon: icon("AudioLinesIcon"),
    MicIcon: icon("MicIcon"),
    MicOffIcon: icon("MicOffIcon"),
    PhoneOffIcon: icon("PhoneOffIcon"),
  };
});

import { VoiceConversation } from "./voice-conversation.aui";

const running = {
  status: { type: "running" },
  isMuted: false,
  mode: "listening",
} as const;

const voiceMessage = (
  id: string,
  role: "user" | "assistant",
  text: string,
) => ({
  id,
  role,
  metadata: { modality: "voice", custom: {} },
  content: [{ type: "text", text }],
});

describe("VoiceConversation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.thread.messages = [];
    h.voice = undefined;
    h.volume = 0;
    h.controls.disconnect.mockReset();
    h.controls.mute.mockReset();
    h.controls.unmute.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = async () => {
    await act(async () => {
      root.render(<VoiceConversation />);
    });
  };

  it("renders nothing without a voice session", async () => {
    await render();

    expect(container.childElementCount).toBe(0);
  });

  it("scopes the transcript to the session connection boundary", async () => {
    h.state.thread.messages = [voiceMessage("old", "user", "Old call")];
    await render();

    h.voice = running;
    await render();
    h.state.thread.messages = [
      ...h.state.thread.messages,
      voiceMessage("new-user", "user", "Hello"),
      voiceMessage("new-assistant", "assistant", "Hi there"),
    ];
    await render();

    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("Hi there");
    expect(container.textContent).not.toContain("Old call");
  });

  it("starts a redial with an empty transcript", async () => {
    h.voice = running;
    await render();
    h.state.thread.messages = [voiceMessage("first", "user", "First call")];
    await render();
    expect(container.textContent).toContain("First call");

    h.voice = undefined;
    await render();
    h.voice = running;
    await render();
    expect(container.textContent).not.toContain("First call");
  });

  it("routes mute and end actions through the voice controls", async () => {
    h.voice = running;
    await render();

    const buttons = container.querySelectorAll("button");
    await act(async () => {
      buttons[1]?.click();
      buttons[2]?.click();
    });

    expect(h.controls.mute).toHaveBeenCalledTimes(1);
    expect(h.controls.disconnect).toHaveBeenCalledTimes(1);
  });
});
