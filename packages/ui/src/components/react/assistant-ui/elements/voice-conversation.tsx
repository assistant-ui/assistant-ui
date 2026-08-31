"use client";

import type { ComponentProps } from "react";
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";
import { clamp } from "../utils/range";

export type VoiceMode = "connecting" | "listening" | "thinking" | "speaking";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const CAPTION: Record<VoiceMode, string> = {
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const HINT: Record<VoiceMode, string> = {
  connecting: "Opening the mic",
  listening: "Listening for you",
  thinking: "Working on it",
  speaking: "Playing the reply",
};

export function VoiceConversation({
  mode,
  amplitude,
  transcript,
  muted,
  onToggleMute,
  onInterrupt,
  onEnd,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "mode"
  | "amplitude"
  | "transcript"
  | "muted"
  | "onToggleMute"
  | "onInterrupt"
  | "onEnd"
> & {
  mode: VoiceMode;
  amplitude: number;
  transcript: readonly VoiceTurn[];
  muted?: boolean;
  onToggleMute?: () => void;
  onInterrupt?: () => void;
  onEnd?: () => void;
}) {
  const level = clamp(amplitude, 0, 1);
  const active = mode === "listening" || mode === "speaking";
  const canInterrupt = mode === "speaking" && onInterrupt !== undefined;

  return (
    <div
      data-slot="voice-conversation"
      className={cn(
        paper,
        "flex w-full max-w-xs flex-col items-center gap-4 rounded-[28px] px-5 py-5",
        className,
      )}

      {...props}
    >
      <button
        type="button"
        onClick={onInterrupt}
        disabled={!canInterrupt}
        aria-label="Interrupt the assistant"
        className="focus-visible:ring-foreground/20 relative flex size-24 items-center justify-center rounded-full outline-none focus-visible:ring-1 disabled:cursor-default"
      >
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
            mode === "speaking"
              ? "bg-blue-500/12 dark:bg-blue-400/15"
              : "bg-foreground/[0.05]",
          )}
          style={{
            width: "6rem",
            height: "6rem",
            transform: `scale(${active ? 0.72 + level * 0.28 : 0.62})`,
            opacity: active ? 1 : 0.5,
          }}
        />
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none",
            mode === "speaking"
              ? "bg-blue-500/20 dark:bg-blue-400/25"
              : "bg-foreground/[0.08]",
          )}
          style={{
            width: "4.25rem",
            height: "4.25rem",
            transform: `scale(${active ? 0.8 + level * 0.22 : 0.7})`,
          }}
        />
        <span
          aria-hidden
          className={cn(
            "relative size-10 rounded-full transition-[transform,background-color] duration-150 ease-out motion-reduce:transition-none",
            mode === "connecting" && "bg-foreground/20 animate-pulse",
            mode === "listening" && "bg-foreground/80",
            mode === "thinking" && "bg-foreground/30 animate-pulse",
            mode === "speaking" && "bg-blue-500 dark:bg-blue-400",
          )}
          style={{ transform: `scale(${active ? 0.9 + level * 0.2 : 0.85})` }}
        />
      </button>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[13.5px] font-medium">{CAPTION[mode]}</span>
        <span className={cn(mono, "text-foreground/35")}>
          {muted ? "Mic off" : canInterrupt ? "Tap to interrupt" : HINT[mode]}
        </span>
      </div>

      <div className="flex min-h-[4.5rem] w-full flex-col gap-1.5">
        {transcript.map((turn) => (
          <div
            key={turn.id}
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex gap-2 text-xs leading-relaxed duration-300"
          >
            <span
              className={cn(
                mono,
                "w-8 shrink-0",
                turn.role === "user"
                  ? "text-foreground/30"
                  : "text-blue-500/70 dark:text-blue-400/70",
              )}
            >
              {turn.role === "user" ? "you" : "ai"}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 break-words",
                turn.role === "user"
                  ? "text-foreground/50"
                  : "text-foreground/80",
              )}
            >
              {turn.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={
            muted ? "Turn the microphone on" : "Turn the microphone off"
          }
          aria-pressed={muted}
          onClick={onToggleMute}
          disabled={!onToggleMute}
          className={cn(
            ghostButton,
            "size-10 disabled:pointer-events-none disabled:opacity-30",
            muted && "bg-foreground/[0.08] text-foreground/90",
          )}
        >
          {muted ? (
            <MicOffIcon className="size-4" />
          ) : (
            <MicIcon className="size-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="End the call"
          onClick={onEnd}
          disabled={!onEnd}
          className="flex size-10 items-center justify-center rounded-full bg-red-500/90 text-white transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
        >
          <PhoneOffIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
