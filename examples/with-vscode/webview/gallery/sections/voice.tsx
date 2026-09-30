import {
  VoiceControl,
  VoiceOrb,
  type VoiceOrbState,
} from "@assistant-ui/ui/components/assistant-ui/elements/voice.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

const STATES: VoiceOrbState[] = [
  "idle",
  "connecting",
  "listening",
  "speaking",
  "muted",
];

export default defineSections([
  {
    id: "voice-orb",
    title: "Voice orb",
    category: "chat",
    notes:
      "voice.aui.tsx VoiceOrb (WebGL2) in each state, driven by the state prop; no microphone or voice adapter is used.",
    render: () => (
      <SeededRuntime>
        <div className="flex flex-wrap items-center gap-6">
          {STATES.map((state) => (
            <div key={state} className="flex flex-col items-center gap-2">
              <VoiceOrb state={state} variant="blue" className="size-16" />
              <span className="text-muted-foreground text-xs capitalize">
                {state}
              </span>
            </div>
          ))}
        </div>
      </SeededRuntime>
    ),
  },
  {
    id: "voice-control",
    title: "Voice control (idle)",
    category: "chat",
    notes:
      "voice.aui.tsx VoiceControl in its idle state. The local runtime has no voice adapter and the webview has no microphone permission, so Connect cannot start a session.",
    render: () => (
      <SeededRuntime>
        <VoiceControl className="rounded-md border" />
      </SeededRuntime>
    ),
  },
]);
