"use client";

import {
  type TextMessagePart,
  useAuiState,
  useVoiceControls,
  useVoiceState,
  useVoiceVolume,
  type VoiceSessionState,
} from "@assistant-ui/react";
import { type FC, useMemo } from "react";
import {
  VoiceConversation as VoiceConversationBase,
  type VoiceMode,
  type VoiceTurn,
} from "./voice-conversation";

export type { VoiceMode, VoiceTurn } from "./voice-conversation";

const deriveVoiceMode = (
  voice: VoiceSessionState | undefined,
): VoiceMode | undefined => {
  if (voice === undefined || voice.status.type === "ended") return undefined;
  if (voice.status.type === "starting") return "connecting";
  return voice.mode;
};

export const VoiceConversation: FC<{ className?: string }> = ({
  className,
}) => {
  const voice = useVoiceState();
  const amplitude = useVoiceVolume();
  const messages = useAuiState((s) => s.thread.messages);
  const { mute, unmute, disconnect } = useVoiceControls();
  const transcript = useMemo<readonly VoiceTurn[]>(
    () =>
      messages
        .filter((message) => message.metadata.modality === "voice")
        .map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          text: message.content
            .filter((part): part is TextMessagePart => part.type === "text")
            .map((part) => part.text)
            .join(""),
        })),
    [messages],
  );
  const mode = deriveVoiceMode(voice);
  if (mode === undefined || voice === undefined) return null;

  return (
    <VoiceConversationBase
      className={className}
      mode={mode}
      amplitude={amplitude}
      transcript={transcript}
      muted={voice.isMuted}
      onToggleMute={voice.isMuted ? unmute : mute}
      onEnd={disconnect}
    />
  );
};
