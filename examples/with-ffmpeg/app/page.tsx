"use client";

import {
  useAssistantInstructions,
  useAssistantTool,
  useAui,
  useAuiState,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { z } from "zod";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import {
  CircleCheckIcon,
  DownloadIcon,
  FileIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Thread } from "@/components/assistant-ui/thread";

// MVP: upload file, enter command
// MVP: convert command to tool call
// MVP: tool call: ffmpeg

const FfmpegTool: FC<{ file: File }> = ({ file }) => {
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

  useAssistantTool({
    toolName: "run_ffmpeg",
    parameters: z.object({
      command: z
        .string()
        .array()
        .describe("The ffmpeg command line arguments to provide"),
    }),
    execute: async ({ command }) => {
      const transcode = async () => {
        const ffmpeg = ffmpegRef.current;

        const logs: string[] = [];
        const logger = ({ message }: { message: string }) => {
          logs.push(message);
        };
        ffmpeg.on("log", logger);

        await ffmpeg.writeFile(
          file.name,
          new Uint8Array(await file.arrayBuffer()),
        );

        const code = await ffmpeg.exec(command);
        ffmpeg.off("log", logger);

        return { code, logs };
      };
      const { code, logs } = await transcode();

      return {
        success: code === 0,
        hint:
          code === 0
            ? "Success. Now call display_file to show the output to the user."
            : `some error happened, logs: ${logs.join("\n")}`,
      };
    },
    render: function RenderFfmpeg({
      args: { command },
      result: { success } = {},
    }) {
      return (
        <div className="mb-2 flex flex-col gap-2 rounded-lg border px-5 py-4">
          <div className="flex items-center gap-2">
            {success == null && (
              <RefreshCcwIcon className="size-4 animate-spin text-blue-600" />
            )}
            {success === false && (
              <TriangleAlertIcon className="size-4 text-red-600" />
            )}
            {success === true && (
              <CircleCheckIcon className="size-4 text-green-600" />
            )}
            <p>Running ffmpeg</p>
          </div>
          <pre className="overflow-y-scroll font-sm">
            ffmpeg {command?.join(" ")}
          </pre>
          {success === false && (
            <div className="mt-2 border-t border-dashed pt-3">
              Encountered an error.
            </div>
          )}
        </div>
      );
    },
  });

  useAssistantTool({
    toolName: "render_overlay",
    parameters: z.object({
      html: z
        .string()
        .describe(
          "HTML content to render. Use inline styles for all styling. The background is transparent by default.",
        ),
      width: z.number().describe("Width of the output image in pixels"),
      height: z.number().describe("Height of the output image in pixels"),
      fileName: z
        .string()
        .describe("Output filename in ffmpeg filesystem, e.g. overlay.png"),
    }),
    execute: async ({ html, width, height, fileName }) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
        </foreignObject>
      </svg>`;

      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to render HTML"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );
      const data = new Uint8Array(await blob.arrayBuffer());

      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile(fileName, data);

      return {
        success: true,
        hint: `Overlay image "${fileName}" (${width}x${height}) written to ffmpeg filesystem. Use it with the overlay filter in run_ffmpeg, e.g. -i ${fileName} -filter_complex "overlay=x=0:y=0"`,
      };
    },
    render: function RenderOverlay({ args, result }) {
      return (
        <div className="mb-2 flex items-center gap-2 rounded-lg border px-5 py-4">
          {!result && (
            <RefreshCcwIcon className="size-4 animate-spin text-blue-600" />
          )}
          {result?.success && (
            <CircleCheckIcon className="size-4 text-green-600" />
          )}
          <p>
            {result?.success
              ? `Rendered overlay → ${args.fileName}`
              : "Rendering overlay..."}
          </p>
        </div>
      );
    },
  });

  useAssistantTool({
    toolName: "display_file",
    parameters: z.object({
      fileName: z
        .string()
        .describe("The name of the file to display from the ffmpeg filesystem"),
      mimeType: z
        .string()
        .describe("The mime type of the file, e.g. image/png, video/mp4"),
    }),
    execute: async ({ fileName }) => {
      const ffmpeg = ffmpegRef.current;
      try {
        const data = (await ffmpeg.readFile(
          fileName,
        )) as Uint8Array<ArrayBuffer>;
        return {
          success: true,
          size: data.byteLength,
          hint: "A file preview and download button is now visible to the user. Do not describe the file or repeat its contents.",
        };
      } catch {
        return {
          success: false,
          error: `File "${fileName}" not found in ffmpeg filesystem`,
        };
      }
    },
    render: function RenderDisplayFile({
      args: { fileName, mimeType },
      result,
    }) {
      const [blobUrl, setBlobUrl] = useState<string | null>(null);

      const readFile = useCallback(async () => {
        const ffmpeg = ffmpegRef.current;
        const data = (await ffmpeg.readFile(
          fileName,
        )) as Uint8Array<ArrayBuffer>;
        return URL.createObjectURL(new Blob([data.buffer], { type: mimeType }));
      }, [fileName, mimeType]);

      useEffect(() => {
        if (!result?.success) return;
        let revoked = false;
        readFile().then((url) => {
          if (revoked) {
            URL.revokeObjectURL(url);
            return;
          }
          setBlobUrl(url);
        });
        return () => {
          revoked = true;
          setBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        };
      }, [result?.success, readFile]);

      const handleDownload = () => {
        if (!blobUrl) return;
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        a.click();
      };

      if (!result) {
        return (
          <div className="flex items-center gap-2 rounded-lg border px-5 py-4">
            <RefreshCcwIcon className="size-4 animate-spin text-blue-600" />
            <p>Loading file...</p>
          </div>
        );
      }

      if (!result.success) {
        return (
          <div className="flex items-center gap-2 rounded-lg border px-5 py-4">
            <TriangleAlertIcon className="size-4 text-red-600" />
            <p>File not found</p>
          </div>
        );
      }

      const isImage = mimeType?.startsWith("image/");
      const isVideo = mimeType?.startsWith("video/");
      const isAudio = mimeType?.startsWith("audio/");

      return (
        <div className="mb-2 flex flex-col gap-3 rounded-lg border px-5 py-4">
          {blobUrl && isImage && (
            <img
              src={blobUrl}
              alt={fileName}
              className="max-h-64 w-fit rounded"
            />
          )}
          {blobUrl && isVideo && (
            // biome-ignore lint/a11y/useMediaCaption: generated output
            <video src={blobUrl} controls className="max-h-64 w-fit rounded" />
          )}
          {/* biome-ignore lint/a11y/useMediaCaption: generated output */}
          {blobUrl && isAudio && <audio src={blobUrl} controls />}
          {blobUrl && !isImage && !isVideo && !isAudio && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileIcon className="size-5" />
              <span>{fileName}</span>
            </div>
          )}
          <button
            onClick={handleDownload}
            className="flex w-fit items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent"
          >
            <DownloadIcon className="size-4" />
            Download {fileName}
          </button>
        </div>
      );
    },
  });

  return null;
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
        <Thread />
      </AuiProvider>
      {lastFile && <FfmpegTool file={lastFile} />}
    </div>
  );
}
