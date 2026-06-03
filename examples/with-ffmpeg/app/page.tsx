"use client";

import {
  useAssistantInstructions,
  useAui,
  useAuiState,
  AuiProvider,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { useFfmpegToolkit } from "./toolkit";

// MVP: upload file, enter command
// MVP: convert command to tool call
// MVP: tool call: ffmpeg

const FfmpegToolsProvider: FC<{ file: File; children: ReactNode }> = ({
  file,
  children,
}) => {
  const loadingRef = useRef(false);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const load = async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      const ffmpeg = ffmpegRef.current;
      // toBlobURL is used to bypass CORS issue, urls with the same
      // domain can be used directly.
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
    };
    load();
  }, []);

  useAssistantInstructions(
    `The user has attached a file: ${file.name}. To add text overlays, use the render_overlay tool to render HTML to a PNG image, then use run_ffmpeg with the "overlay" filter to composite it onto the video. Do NOT use the drawtext filter.`,
  );

  const toolkit = useFfmpegToolkit(file, ffmpegRef);

  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

export default function Home() {
  const [lastFile, setLastFile] = useState<File | null>(null);
  const attachments = useAuiState((s) => s.thread.composer.attachments);
  useEffect(() => {
    const lastAttachment = attachments[attachments.length - 1];
    if (!lastAttachment) return;
    setLastFile(lastAttachment.file!);
  }, [attachments]);

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Convert video to GIF",
        label: "attach a video file first",
        prompt: "Convert my video to an animated GIF.",
      },
      {
        title: "Compress an MP4",
        label: "to reduce file size",
        prompt: "Compress my video file to reduce its size.",
      },
    ]),
  });

  return (
    <div className="flex h-full flex-col">
      <AuiProvider value={aui}>
        {lastFile ? (
          <FfmpegToolsProvider file={lastFile}>
            <Thread />
          </FfmpegToolsProvider>
        ) : (
          <Thread />
        )}
      </AuiProvider>
    </div>
  );
}
