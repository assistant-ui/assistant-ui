import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { VoiceSessionState } from "@assistant-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceConversation } from "./voice-conversation.aui";

type MockMessage = {
  id: string;
  role: "user" | "assistant";
  metadata: { modality?: "voice" };
  content: { type: string; text?: string }[];
};

const mocks = vi.hoisted(() => ({
  state: {
    thread: {
      messages: [] as MockMessage[],
    },
  },
  voice: undefined as VoiceSessionState | undefined,
  volume: 0,
  controls: {
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: (selector: (s: typeof mocks.state) => unknown) =>
    selector(mocks.state),
  useVoiceState: () => mocks.voice,
  useVoiceVolume: () => mocks.volume,
  useVoiceControls: () => mocks.controls,
}));

const setVoice = (voice: VoiceSessionState | undefined) => {
  mocks.voice = voice;
};

afterEach(() => {
  cleanup();
  mocks.state.thread.messages = [];
  setVoice(undefined);
  mocks.volume = 0;
});

describe("VoiceConversation", () => {
  it("renders nothing without a session", () => {
    const { container } = render(<VoiceConversation />);

    expect(container.childElementCount).toBe(0);
  });

  it("maps a starting session to the connecting caption", () => {
    setVoice({
      status: { type: "starting" },
      isMuted: false,
      mode: "listening",
    });

    render(<VoiceConversation />);

    expect(screen.getByText("Connecting")).toBeTruthy();
  });

  it("renders the current mode and only voice transcript messages", () => {
    setVoice({
      status: { type: "running" },
      isMuted: false,
      mode: "speaking",
    });
    mocks.state.thread.messages = [
      {
        id: "typed",
        role: "user",
        metadata: {},
        content: [{ type: "text", text: "Typed message" }],
      },
      {
        id: "voice-user",
        role: "user",
        metadata: { modality: "voice" },
        content: [{ type: "text", text: "Hello" }],
      },
      {
        id: "voice-assistant",
        role: "assistant",
        metadata: { modality: "voice" },
        content: [{ type: "text", text: "Hi there" }],
      },
    ];

    render(<VoiceConversation />);

    expect(screen.getByText("Speaking")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getByText("Hi there")).toBeTruthy();
    expect(screen.queryByText("Typed message")).toBeNull();
  });

  it("toggles mute through the voice controls", () => {
    setVoice({
      status: { type: "running" },
      isMuted: false,
      mode: "listening",
    });
    const { rerender } = render(<VoiceConversation />);

    fireEvent.click(
      screen.getByRole("button", { name: "Turn the microphone off" }),
    );
    expect(mocks.controls.mute).toHaveBeenCalledOnce();

    setVoice({
      status: { type: "running" },
      isMuted: true,
      mode: "listening",
    });
    rerender(<VoiceConversation />);

    fireEvent.click(
      screen.getByRole("button", { name: "Turn the microphone on" }),
    );
    expect(mocks.controls.unmute).toHaveBeenCalledOnce();
  });

  it("ends the session through the voice controls", () => {
    setVoice({
      status: { type: "running" },
      isMuted: false,
      mode: "listening",
    });

    render(<VoiceConversation />);
    fireEvent.click(screen.getByRole("button", { name: "End the call" }));

    expect(mocks.controls.disconnect).toHaveBeenCalledOnce();
  });
});
