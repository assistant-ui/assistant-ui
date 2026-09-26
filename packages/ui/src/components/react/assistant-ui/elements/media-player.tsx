"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, inkButton, mono, paper } from "./surfaces";

export interface AudioPlayerProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  src: string;
  title?: string | undefined;
  artwork?: string | undefined;
  durationMs?: number | undefined;
}

export interface VideoPlayerProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  src: string;
  poster?: string | undefined;
  title?: string | undefined;
  ratio?: "16:9" | "4:3" | "1:1" | "9:16" | "auto" | undefined;
  durationMs?: number | undefined;
}

function formatDuration(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function useMediaDuration(
  mediaRef: RefObject<HTMLMediaElement | null>,
  src: string,
  durationMs?: number | undefined,
) {
  const [metadata, setMetadata] = useState<{ src: string; duration?: number }>({
    src,
  });

  // A server-rendered media element can load metadata before hydration attaches onLoadedMetadata.
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || media.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (Number.isFinite(media.duration) && media.duration >= 0) {
      setMetadata({ src, duration: media.duration });
    }
  }, [mediaRef, src]);
  const fallbackDuration =
    durationMs !== undefined && Number.isFinite(durationMs)
      ? Math.max(0, durationMs / 1000)
      : undefined;

  return {
    duration:
      metadata.src === src
        ? (metadata.duration ?? fallbackDuration)
        : fallbackDuration,
    setDurationFromMetadata: (duration: number) => {
      if (Number.isFinite(duration) && duration >= 0) {
        setMetadata({ src, duration });
      }
    },
  };
}

export function AudioPlayer({
  src,
  title,
  artwork,
  durationMs,
  className,
  ...props
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playback, setPlayback] = useState({
    src,
    currentTime: 0,
    playing: false,
    hasError: false,
  });
  const { duration, setDurationFromMetadata } = useMediaDuration(
    audioRef,
    src,
    durationMs,
  );
  const playbackState =
    playback.src === src
      ? playback
      : { src, currentTime: 0, playing: false, hasError: false };
  const { currentTime, playing, hasError } = playbackState;
  const update = (patch: Partial<Omit<typeof playback, "src">>) =>
    setPlayback((current) => ({
      ...(current.src === src
        ? current
        : { src, currentTime: 0, playing: false, hasError: false }),
      ...patch,
    }));
  const displayTitle = title ?? "Audio";
  const playbackLabel = title ? ` ${title}` : " audio";
  const durationLabel =
    duration === undefined ? "--:--" : formatDuration(duration);

  useEffect(() => {
    if (audioRef.current?.error) {
      setPlayback({ src, currentTime: 0, playing: false, hasError: true });
    }
  }, [src]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (playing) {
      audio.pause();
      update({ playing: false });
      return;
    }

    void audio.play().then(
      () => update({ playing: true }),
      () =>
        update(
          audio.error ? { hasError: true, playing: false } : { playing: false },
        ),
    );
  };

  return (
    <div
      data-slot="audio-player"
      className={cn(
        paper,
        "flex w-full max-w-md items-center gap-3 rounded-2xl p-3",
        className,
      )}
      {...props}
    >
      {artwork ? (
        <img
          src={artwork}
          alt=""
          className="size-10 shrink-0 rounded-lg object-cover"
        />
      ) : null}
      <button
        type="button"
        aria-label={`${playing ? "Pause" : "Play"}${playbackLabel}`}
        disabled={hasError}
        onClick={togglePlayback}
        className={cn(
          inkButton,
          "flex size-9 shrink-0 items-center justify-center rounded-full disabled:cursor-default disabled:opacity-40",
        )}
      >
        {playing ? (
          <PauseIcon aria-hidden className="size-4" />
        ) : (
          <PlayIcon aria-hidden className="ml-0.5 size-4" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[13.5px] font-medium">
          {displayTitle}
        </span>
        <input
          type="range"
          min={0}
          max={duration ?? 0}
          step={0.1}
          value={Math.min(currentTime, duration ?? 0)}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(currentTime)} of ${durationLabel}`}
          disabled={hasError}
          onChange={(event) => {
            const nextTime = Number(event.currentTarget.value);
            if (!Number.isFinite(nextTime)) return;
            const resolvedTime = Math.min(nextTime, duration ?? nextTime);
            if (audioRef.current) audioRef.current.currentTime = resolvedTime;
            update({ currentTime: resolvedTime });
          }}
          className="accent-foreground w-full cursor-pointer disabled:cursor-default"
        />
      </div>
      <span className={cn(mono, "text-foreground/45 shrink-0 tabular-nums")}>
        {formatDuration(currentTime)} / {durationLabel}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          setDurationFromMetadata(event.currentTarget.duration);
        }}
        onTimeUpdate={(event) =>
          update({ currentTime: event.currentTarget.currentTime })
        }
        onPlay={() => update({ playing: true })}
        onPause={() => update({ playing: false })}
        onError={() => update({ hasError: true, playing: false })}
      />
      {hasError ? (
        <span role="alert" className="text-foreground/45 shrink-0 text-xs">
          Can't play this audio
        </span>
      ) : null}
    </div>
  );
}

export function VideoPlayer({
  src,
  poster,
  title,
  ratio = "16:9",
  durationMs,
  className,
  ...props
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { duration, setDurationFromMetadata } = useMediaDuration(
    videoRef,
    src,
    durationMs,
  );
  const ratioClassName =
    ratio === "1:1"
      ? "aspect-square"
      : ratio === "4:3"
        ? "aspect-[4/3]"
        : ratio === "16:9"
          ? "aspect-video"
          : ratio === "9:16"
            ? "aspect-[9/16]"
            : undefined;

  return (
    <div
      data-slot="video-player"
      className={cn("flex w-full max-w-xl flex-col gap-2", className)}
      {...props}
    >
      <div className={cn(field, "overflow-hidden rounded-xl", ratioClassName)}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          aria-label={title ?? "Video"}
          className={cn(
            "block max-w-full",
            ratio !== "auto" && "h-full w-full object-contain",
          )}
          onLoadedMetadata={(event) => {
            setDurationFromMetadata(event.currentTarget.duration);
          }}
        />
      </div>
      {(title || duration !== undefined) && (
        <div className="flex min-w-0 items-center gap-2 px-1">
          {title ? (
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
              {title}
            </span>
          ) : null}
          {duration !== undefined ? (
            <span
              className={cn(mono, "text-foreground/45 shrink-0 tabular-nums")}
            >
              {formatDuration(duration)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
