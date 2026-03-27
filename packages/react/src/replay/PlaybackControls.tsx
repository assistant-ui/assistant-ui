"use client";

import { type FC, useCallback } from "react";

export namespace PlaybackControls {
  export type Props = {
    isPlaying: boolean;
    speed: number;
    progress: number;
    duration: number;
    onPlayPause: () => void;
    onSpeedChange: (speed: number) => void;
    onSeek: (timestamp: number) => void;
  };
}

export const PlaybackControls: FC<PlaybackControls.Props> = ({
  isPlaying,
  speed,
  progress,
  duration,
  onPlayPause,
  onSpeedChange,
  onSeek,
}) => {
  const speeds = [0.5, 1, 2, 4];

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(Number(e.target.value));
    },
    [onSeek],
  );

  return (
    <div data-aui-playback-controls="">
      <button type="button" onClick={onPlayPause} data-aui-play-pause="">
        {isPlaying ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        value={progress}
        onChange={handleSeek}
        data-aui-scrubber=""
      />
      <div data-aui-speed-controls="">
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            data-aui-speed-button=""
            data-active={s === speed ? "" : undefined}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};
