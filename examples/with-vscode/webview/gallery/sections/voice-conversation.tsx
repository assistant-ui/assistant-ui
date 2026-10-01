import {
  VoiceConversation,
  type VoiceMode,
  type VoiceTurn,
} from "@assistant-ui/ui/components/assistant-ui/elements/voice-conversation.tsx";
import { defineSections } from "../types";

const TRANSCRIPT: readonly VoiceTurn[] = [
  { id: "u1", role: "user", text: "What broke in the last deploy?" },
  {
    id: "a1",
    role: "assistant",
    text: "The converter dropped empty parts. I pushed a guard.",
  },
];

const noop = () => {};

const MODES: {
  mode: VoiceMode;
  amplitude: number;
  transcript: readonly VoiceTurn[];
  muted?: boolean;
}[] = [
  { mode: "listening", amplitude: 0.6, transcript: TRANSCRIPT.slice(0, 1) },
  { mode: "speaking", amplitude: 0.8, transcript: TRANSCRIPT, muted: true },
];

export default defineSections([
  {
    id: "voice-conversation",
    title: "Voice conversation",
    category: "chat",
    notes:
      "voice-conversation.tsx (standalone) driven by props: listening, then speaking while muted. The runtime variant (voice-conversation.aui.tsx) renders nothing without a live voice session, which the webview cannot start.",
    render: () => (
      <div className="flex flex-col gap-4">
        {MODES.map(({ mode, amplitude, transcript, muted }) => (
          <VoiceConversation
            key={mode}
            mode={mode}
            amplitude={amplitude}
            transcript={transcript}
            muted={muted ?? false}
            onToggleMute={noop}
            onEnd={noop}
          />
        ))}
      </div>
    ),
  },
]);
