"use client";

import {
  FileRoot,
  FileIconDisplay,
  FileName,
  FileSize,
  FileDownload,
} from "@/components/assistant-ui/file";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

// Sample base64 data (small placeholder)
const SAMPLE_DATA = "SGVsbG8gV29ybGQh"; // "Hello World!" in base64

const files = [
  { filename: "report.pdf", mimeType: "application/pdf", size: 2048 },
  { filename: "config.json", mimeType: "application/json", size: 512 },
  { filename: "notes.txt", mimeType: "text/plain", size: 128 },
  { filename: "photo.png", mimeType: "image/png", size: 4096 },
  { filename: "track.mp3", mimeType: "audio/mpeg", size: 8192 },
];

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {files.slice(0, 3).map((file) => (
          <FileRoot key={file.filename} variant={variant}>
            <FileIconDisplay mimeType={file.mimeType} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <FileName>{file.filename}</FileName>
              <FileSize bytes={file.size} className="text-xs" />
            </div>
            <FileDownload
              data={SAMPLE_DATA}
              mimeType={file.mimeType}
              filename={file.filename}
            />
          </FileRoot>
        ))}
      </div>
    </div>
  );
}

function SizeRow() {
  const file = files[0]!;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">Sizes</span>
      <div className="flex flex-wrap items-center gap-2">
        {(["sm", "default", "lg"] as const).map((size) => {
          const filename = `${size}.pdf`;
          return (
            <FileRoot key={size} size={size}>
              <FileIconDisplay mimeType={file.mimeType} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <FileName>{filename}</FileName>
                <FileSize bytes={file.size} className="text-xs" />
              </div>
              <FileDownload
                data={SAMPLE_DATA}
                mimeType={file.mimeType}
                filename={filename}
              />
            </FileRoot>
          );
        })}
      </div>
    </div>
  );
}

function MimeTypeRow() {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">
        MimeType Icons
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {files.map((file) => (
          <FileRoot key={file.filename} size="sm">
            <FileIconDisplay mimeType={file.mimeType} />
            <FileName>{file.filename}</FileName>
          </FileRoot>
        ))}
      </div>
    </div>
  );
}

export function FileSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 p-6">
      <VariantRow label="Outline (default)" />
      <VariantRow label="Muted" variant="muted" />
      <SizeRow />
      <MimeTypeRow />
    </SampleFrame>
  );
}
