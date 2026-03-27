"use client";

import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ThreadRecording, ThreadRecordingEvent } from "@assistant-ui/core";
import { deserializeMessages } from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";
import { ThreadReadOnly } from "../share/ThreadReadOnly";
import { PlaybackControls } from "./PlaybackControls";

export namespace ThreadReplay {
  export type Props = {
    recording: ThreadRecording;
    autoPlay?: boolean;
    speed?: number;
    children?: React.ReactNode;
  };
}

const buildMessagesAtTimestamp = (
  events: ThreadRecordingEvent[],
  targetTimestamp: number,
): ThreadMessage[] => {
  let messages: ThreadMessage[] = [];

  for (const event of events) {
    if (event.timestamp > targetTimestamp) break;

    switch (event.type) {
      case "snapshot":
        messages = deserializeMessages(event.messages);
        break;
      case "message-update": {
        const deserialized = deserializeMessages([event.message])[0]!;
        const idx = messages.findIndex((m) => m.id === event.messageId);
        if (idx === -1) {
          messages = [...messages, deserialized];
        } else {
          messages = [
            ...messages.slice(0, idx),
            deserialized,
            ...messages.slice(idx + 1),
          ];
        }
        break;
      }
    }
  }

  return messages;
};

export const ThreadReplay: FC<ThreadReplay.Props> = ({
  recording,
  autoPlay = false,
  speed: initialSpeed = 1,
  children,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(initialSpeed);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const progressRef = useRef(0);
  const previousRecordingRef = useRef(recording);

  const duration = recording.metadata.duration;
  const messages = useMemo(
    () => buildMessagesAtTimestamp(recording.events, progress),
    [recording.events, progress],
  );

  const seek = useCallback(
    (timestamp: number) => {
      const clamped = Math.max(0, Math.min(timestamp, duration));
      progressRef.current = clamped;
      setProgress(clamped);
    },
    [duration],
  );

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastFrameRef.current) * speed;
      lastFrameRef.current = now;
      const next = Math.min(progressRef.current + delta, duration);

      progressRef.current = next;
      setProgress(next);

      if (next >= duration) {
        setIsPlaying(false);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, speed, duration]);

  useEffect(() => {
    setIsPlaying(autoPlay);
    setSpeed(initialSpeed);
  }, [autoPlay, initialSpeed]);

  useEffect(() => {
    if (previousRecordingRef.current === recording) return;

    previousRecordingRef.current = recording;
    progressRef.current = 0;
    setProgress(0);
  }, [recording]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && progressRef.current >= duration) {
      progressRef.current = 0;
      setProgress(0);
    }

    setIsPlaying(!isPlaying);
  }, [duration, isPlaying]);

  return (
    <>
      <ThreadReadOnly messages={messages}>{children}</ThreadReadOnly>
      <PlaybackControls
        isPlaying={isPlaying}
        speed={speed}
        progress={progress}
        duration={duration}
        onPlayPause={handlePlayPause}
        onSpeedChange={setSpeed}
        onSeek={seek}
      />
    </>
  );
};
