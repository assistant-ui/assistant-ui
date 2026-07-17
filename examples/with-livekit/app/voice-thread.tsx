"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  VoiceOrb,
  VoiceConnectButton,
  VoiceMuteButton,
  VoiceDisconnectButton,
  deriveVoiceOrbState,
} from "@/components/assistant-ui/voice";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  AuiIf,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useVoiceState,
  useVoiceVolume,
} from "@assistant-ui/react";
import { ArrowDownIcon } from "lucide-react";
import type { FC } from "react";

export const VoiceThread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background flex h-full flex-col"
      style={{ ["--thread-max-width" as string]: "44rem" }}
    >
      <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex flex-1 flex-col overflow-y-scroll scroll-smooth px-4 pt-4">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <VoiceWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col items-center pt-4 pb-6">
          <ThreadScrollToBottom />
          <VoiceControlCenter />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const VoiceWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col items-center justify-center gap-2">
      <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
        Voice Conversation
      </p>
      <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground delay-75 duration-200">
        Tap connect to start speaking
      </p>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const VoiceControlCenter: FC = () => {
  return (
    <div className="aui-voice-control-center flex flex-col items-center gap-4">
      <VoiceOrb variant="blue" className="size-20" />
      <VoiceWaveform />

      <div className="flex items-center gap-3">
        <AuiIf
          condition={(s) =>
            s.thread.voice == null || s.thread.voice.status.type === "ended"
          }
        >
          <VoiceConnectButton />
        </AuiIf>

        <AuiIf condition={(s) => s.thread.voice?.status.type === "starting"}>
          <span className="text-muted-foreground text-sm">Connecting...</span>
        </AuiIf>

        <AuiIf condition={(s) => s.thread.voice?.status.type === "running"}>
          <VoiceMuteButton />
          <VoiceDisconnectButton />
        </AuiIf>
      </div>
    </div>
  );
};

const BAR_WEIGHTS = [0.4, 0.65, 0.85, 1.0, 0.9, 0.75, 0.5];

const VoiceWaveform: FC = () => {
  const voiceState = useVoiceState();
  const state = deriveVoiceOrbState(voiceState);
  const volume = useVoiceVolume();
  const isActive = state === "listening" || state === "speaking";

  return (
    <div className="aui-voice-waveform flex h-8 items-center justify-center gap-[3px]">
      {BAR_WEIGHTS.map((weight, i) => {
        const scale = isActive ? 0.1 + volume * 0.9 * weight : 0.1;
        return (
          <span
            key={i}
            className="aui-voice-waveform-bar bg-foreground/50 h-full w-[3px] origin-center rounded-full transition-transform duration-100"
            style={{ transform: `scaleY(${scale})` }}
          />
        );
      })}
    </div>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 animate-in relative mx-auto w-full max-w-(--thread-max-width) py-3 duration-150"
      data-role="assistant"
    >
      <div className="aui-assistant-message-content text-foreground px-2 leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            return null;
          }}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto flex w-full max-w-(--thread-max-width) justify-end px-2 py-3 duration-150"
      data-role="user"
    >
      <div className="aui-user-message-content bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};
