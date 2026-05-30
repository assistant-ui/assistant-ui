"use client";

import {
  VideoDownload,
  VideoFilename,
  VideoOverlay,
  VideoPlayer,
  VideoRoot,
  VideoZoom,
} from "@/components/assistant-ui/video";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const REMOTE_SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const LOCAL_FALLBACK_VIDEO = "/videos/sample_video.mp4";
const SAMPLE_VIDEO_SOURCES = [
  { src: REMOTE_SAMPLE_VIDEO, type: "video/mp4" },
  { src: LOCAL_FALLBACK_VIDEO, type: "video/mp4" },
] as const;
const LOCAL_FALLBACK_POSTER = "/images/sample_video_poster.jpg";

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="flex flex-wrap items-start gap-4">
        <VideoRoot variant={variant} size="sm">
          <VideoZoom
            poster={LOCAL_FALLBACK_POSTER}
            sources={SAMPLE_VIDEO_SOURCES}
          >
            <VideoPlayer poster={LOCAL_FALLBACK_POSTER}>
              {SAMPLE_VIDEO_SOURCES.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </VideoPlayer>
          </VideoZoom>
          <VideoDownload url={REMOTE_SAMPLE_VIDEO} filename="sample-sm.mp4" />
          <VideoOverlay>
            <VideoFilename>sample-sm.mp4</VideoFilename>
          </VideoOverlay>
        </VideoRoot>
        <VideoRoot variant={variant} size="default">
          <VideoZoom
            poster={LOCAL_FALLBACK_POSTER}
            sources={SAMPLE_VIDEO_SOURCES}
          >
            <VideoPlayer poster={LOCAL_FALLBACK_POSTER}>
              {SAMPLE_VIDEO_SOURCES.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </VideoPlayer>
          </VideoZoom>
          <VideoDownload
            url={REMOTE_SAMPLE_VIDEO}
            filename="sample-default.mp4"
          />
          <VideoOverlay>
            <VideoFilename>sample-default.mp4</VideoFilename>
          </VideoOverlay>
        </VideoRoot>
      </div>
    </div>
  );
}

export function VideoSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 overflow-x-auto p-6">
      <VariantRow label="Outline" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}
