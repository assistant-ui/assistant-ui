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
import { FC, useEffect, useRef, useState } from "react";
import {
  CircleCheckIcon,
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

  useAssistantInstructions(`The user has attached a file: ${file.name}`);

  useAssistantTool({
    toolName: "run_ffmpeg",
    parameters: z.object({
      command: z
        .string()
        .array()
        .describe("The ffmpeg command line arguments to provide"),
      outputFileName: z
        .string()
        .describe(
          "The name of the output file including extension, corresponding to the command provided",
        ),
      outputMimeType: z
        .string()
        .describe("The mime type of the output file, e.g. image/png"),
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
            ? "note: a download button is appearing in the chat for the user"
            : `some error happened, logs: ${logs.join("\n")}`,
      };
    },
    render: function RenderFfmpeg({
      args: { command, outputFileName, outputMimeType },
      result: { success } = {},
    }) {
      const handleDownload = async () => {
        const ffmpeg = ffmpegRef.current;
        const data = (await ffmpeg.readFile(
          outputFileName,
        )) as Uint8Array<ArrayBuffer>;
        window.open(
          URL.createObjectURL(
            new Blob([data.buffer], { type: outputMimeType }),
          ),
          "_blank",
        );
      };
      return (
        <div className="flex flex-col gap-2 rounded-lg border px-5 py-4">
          <div>
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
          </div>
          {!!success && (
            <div className="mt-2 border-t border-dashed pt-3">
              <button onClick={handleDownload}>
                Download {outputFileName}
              </button>
            </div>
          )}
          {success === false && (
            <div className="mt-2 border-t border-dashed pt-3">
              Encountered an error.
            </div>
          )}
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
      <div className="border-b">
        <p className="my-4 ml-8 font-bold text-xl">
          ConvertGPT (built with{" "}
          <a
            href="https://github.com/assistant-ui/assistant-ui"
            className="underline"
          >
            assistant-ui
          </a>
          )
        </p>
      </div>
      <AuiProvider value={aui}>
        <Thread />
      </AuiProvider>
      {lastFile && <FfmpegTool file={lastFile} />}
    </div>
  );
}
