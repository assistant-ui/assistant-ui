import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type RealtimeVoiceAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { afterEach, describe, expect, it } from "vitest";

import { VoiceControl } from "./voice.aui";

const chat: ChatModelAdapter = {
  async *run() {},
};

const createVoiceAdapter = () => {
  let emitStatus: ((status: RealtimeVoiceAdapter.Status) => void) | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "starting" },
    isMuted: false,
    disconnect: () => {},
    mute: () => {},
    unmute: () => {},
    onStatusChange: (callback) => {
      emitStatus = callback;
      return () => {
        emitStatus = undefined;
      };
    },
    onTranscript: () => () => {},
    onModeChange: () => () => {},
    onVolumeChange: () => () => {},
  };

  return {
    adapter: { connect: () => session } satisfies RealtimeVoiceAdapter,
    setStatus: (status: RealtimeVoiceAdapter.Status) => {
      session.status = status;
      emitStatus?.(status);
    },
  };
};

function VoiceControlHarness({ voice }: { voice: RealtimeVoiceAdapter }) {
  const runtime = useLocalRuntime(chat, { adapters: { voice } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VoiceControl />
    </AssistantRuntimeProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("VoiceControl", () => {
  it("reserves one row height across connect, connecting, and running", async () => {
    const voice = createVoiceAdapter();
    const { container } = render(<VoiceControlHarness voice={voice.adapter} />);
    const row = container.querySelector<HTMLElement>(".aui-voice-control")!;
    const rowHeight = () => {
      const classes = [...row.classList];
      return {
        reserved: classes.filter((name) => name.startsWith("min-h-")),
        padding: classes.filter((name) => /^(py|pt|pb)-/.test(name)),
      };
    };
    const reservedRow = { reserved: ["min-h-11"], padding: [] };

    const connect = screen.getByRole("button", { name: "Connect" });
    expect(rowHeight()).toEqual(reservedRow);

    fireEvent.click(connect);
    expect(await screen.findByText("Connecting...")).toBeTruthy();
    expect(rowHeight()).toEqual(reservedRow);

    act(() => voice.setStatus({ type: "running" }));
    expect(
      await screen.findByRole("button", { name: "Disconnect" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mute" })).toBeTruthy();
    expect(rowHeight()).toEqual(reservedRow);
  });
});
