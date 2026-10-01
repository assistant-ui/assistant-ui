import {
  AudioPlayer,
  VideoPlayer,
} from "@assistant-ui/ui/components/assistant-ui/elements/media-player.tsx";
import { defineSections } from "../types";
import { IMAGES, TONE_WAV } from "./_assets";

export default defineSections([
  {
    id: "media-player",
    title: "Media player",
    category: "content",
    notes: "Audio and video players over a data: WAV. media-src allows data:.",
    render: () => (
      <div className="flex flex-col gap-3">
        <AudioPlayer
          src={TONE_WAV}
          title="440 Hz tone"
          artwork={IMAGES.night}
          durationMs={1000}
        />
        <VideoPlayer
          src={TONE_WAV}
          poster={IMAGES.mist}
          title="Tone, poster only"
          durationMs={1000}
          className="max-w-sm"
        />
      </div>
    ),
  },
]);
