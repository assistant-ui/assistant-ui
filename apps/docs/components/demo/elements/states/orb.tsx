"use client";

import {
  VoiceControl,
  VoiceOrb,
  type VoiceOrbState,
} from "@/components/assistant-ui/elements/voice.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import {
  createVoiceSession,
  type RealtimeVoiceAdapter,
} from "@assistant-ui/react";
import { defineStates } from "./types";

const noop = () => {};

const stubVoice: RealtimeVoiceAdapter = {
  connect: (options) =>
    createVoiceSession(options, async ({ setStatus, emitMode }) => {
      setStatus({ type: "running" });
      emitMode("listening");
      return { disconnect: noop, mute: noop, unmute: noop };
    }),
};

const adapters = { voice: stubVoice };

function OrbFixture({
  state,
  label,
  control = false,
}: {
  state: VoiceOrbState;
  label: string;
  control?: boolean;
}) {
  return (
    <SampleRuntimeProvider adapters={adapters}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <VoiceOrb state={state} variant="blue" className="size-32" />
          <span className="text-muted-foreground text-sm font-medium">
            {label}
          </span>
          {control && (
            <VoiceControl className="rounded-lg border-b-0 px-0 py-0" />
          )}
        </div>
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "idle",
    label: "Idle",
    note: "No voice session is running, so the control offers Connect. A stub adapter answers it.",
    Component: () => <OrbFixture state="idle" label="Idle" control />,
  },
  {
    key: "connecting",
    label: "Connecting",
    note: "The session is starting and no audio flows yet.",
    Component: () => <OrbFixture state="connecting" label="Connecting" />,
  },
  {
    key: "listening",
    label: "Listening",
    note: "The session is live and waiting for the user to speak.",
    Component: () => <OrbFixture state="listening" label="Listening" />,
  },
  {
    key: "muted",
    label: "Muted",
    note: "The session is live but the microphone is muted.",
    Component: () => <OrbFixture state="muted" label="Muted" />,
  },
]);
