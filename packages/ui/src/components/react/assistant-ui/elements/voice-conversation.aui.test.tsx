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

const running: VoiceSessionState = {
  status: { type: "running" },
  isMuted: false,
  mode: "listening",
  canSendText: false,
};

const setVoice = (voice: VoiceSessionState | undefined) => {
  mocks.voice = voice;
};

const voiceMessage = (
  id: string,
  role: MockMessage["role"],
  text: string,
): MockMessage => ({
  id,
  role,
  metadata: { modality: "voice" },
  content: [{ type: "text", text }],
});

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
    setVoice({ ...running, status: { type: "starting" } });

    render(<VoiceConversation />);

    expect(screen.getByText("Connecting")).toBeTruthy();
  });

  it("shows only the voice turns spoken since the session connected", () => {
    mocks.state.thread.messages = [
      {
        id: "typed",
        role: "user",
        metadata: {},
        content: [{ type: "text", text: "Typed message" }],
      },
      voiceMessage("earlier-user", "user", "Earlier question"),
      voiceMessage("earlier-assistant", "assistant", "Earlier answer"),
    ];
    const { rerender } = render(<VoiceConversation />);

    setVoice({ ...running, mode: "speaking" });
    rerender(<VoiceConversation />);

    expect(screen.getByText("Speaking")).toBeTruthy();
    expect(screen.queryByText("Earlier answer")).toBeNull();

    mocks.state.thread.messages = [
      ...mocks.state.thread.messages,
      voiceMessage("voice-user", "user", "Hello"),
      voiceMessage("voice-assistant", "assistant", "Hi there"),
    ];
    rerender(<VoiceConversation />);

    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getByText("Hi there")).toBeTruthy();
    expect(screen.queryByText("Earlier question")).toBeNull();
    expect(screen.queryByText("Typed message")).toBeNull();
  });

  it("keeps the latest exchange on screen", () => {
    const { rerender } = render(<VoiceConversation />);
    setVoice(running);
    rerender(<VoiceConversation />);

    mocks.state.thread.messages = [
      voiceMessage("u1", "user", "First question"),
      voiceMessage("a1", "assistant", "First answer"),
      voiceMessage("u2", "user", "Second question"),
    ];
    rerender(<VoiceConversation />);

    expect(screen.queryByText("First question")).toBeNull();
    expect(screen.getByText("First answer")).toBeTruthy();
    expect(screen.getByText("Second question")).toBeTruthy();
  });

  it("opens a redial with an empty transcript", () => {
    const { rerender } = render(<VoiceConversation />);
    setVoice(running);
    rerender(<VoiceConversation />);
    mocks.state.thread.messages = [voiceMessage("u1", "user", "First call")];
    rerender(<VoiceConversation />);
    expect(screen.getByText("First call")).toBeTruthy();

    setVoice(undefined);
    rerender(<VoiceConversation />);
    setVoice(running);
    rerender(<VoiceConversation />);
    expect(screen.queryByText("First call")).toBeNull();

    mocks.state.thread.messages = [
      ...mocks.state.thread.messages,
      voiceMessage("u2", "user", "Second call"),
    ];
    rerender(<VoiceConversation />);
    expect(screen.getByText("Second call")).toBeTruthy();
    expect(screen.queryByText("First call")).toBeNull();
  });

  it("toggles mute through the voice controls", () => {
    setVoice(running);
    const { rerender } = render(<VoiceConversation />);

    fireEvent.click(
      screen.getByRole("button", { name: "Turn the microphone off" }),
    );
    expect(mocks.controls.mute).toHaveBeenCalledOnce();

    setVoice({ ...running, isMuted: true });
    rerender(<VoiceConversation />);

    fireEvent.click(
      screen.getByRole("button", { name: "Turn the microphone on" }),
    );
    expect(mocks.controls.unmute).toHaveBeenCalledOnce();
  });

  it("ends the session through the voice controls", () => {
    setVoice(running);

    render(<VoiceConversation />);
    fireEvent.click(screen.getByRole("button", { name: "End the call" }));

    expect(mocks.controls.disconnect).toHaveBeenCalledOnce();
  });
});
