import { ToneBadge } from "../ui";
import type {
  AudioPartPreview,
  FilePartPreview,
  ImagePartPreview,
} from "../message/types";
import { formatBytes } from "./formatBytes";

export const ImagePartView = ({
  part,
  compact = false,
}: {
  part: ImagePartPreview;
  compact?: boolean;
}) => (
  <div className={compact ? "px-2 py-1.5" : "flex flex-col gap-1"}>
    {!compact ? <ToneBadge tone="zinc">image</ToneBadge> : null}
    <div className="text-foreground text-[11px]">
      {part.filename ?? "image"}
      {part.sizeBytes ? (
        <span className="text-muted-foreground ml-1">
          {formatBytes(part.sizeBytes)}
        </span>
      ) : null}
    </div>
    {part.previewUrl ? (
      <img
        src={part.previewUrl}
        alt={part.filename ?? "image"}
        className="border-border mt-1 max-h-24 max-w-full rounded border object-contain"
      />
    ) : null}
  </div>
);

export const FilePartView = ({
  part,
  compact = false,
}: {
  part: FilePartPreview;
  compact?: boolean;
}) => (
  <div className={compact ? "px-2 py-1.5" : "flex flex-col gap-1"}>
    {!compact ? <ToneBadge tone="zinc">file</ToneBadge> : null}
    <div className="text-foreground text-[11px]">
      {part.filename ?? "file"}
      {part.mimeType ? (
        <span className="text-muted-foreground ml-1">{part.mimeType}</span>
      ) : null}
      {part.sizeBytes ? (
        <span className="text-muted-foreground ml-1">
          · {formatBytes(part.sizeBytes)}
        </span>
      ) : null}
    </div>
  </div>
);

export const AudioPartView = ({
  part,
  compact = false,
}: {
  part: AudioPartPreview;
  compact?: boolean;
}) => (
  <div className={compact ? "px-2 py-1.5" : "flex flex-col gap-1"}>
    {!compact ? <ToneBadge tone="zinc">audio</ToneBadge> : null}
    <div className="text-foreground text-[11px]">
      {part.format ?? "audio"}
      {part.sizeBytes ? (
        <span className="text-muted-foreground ml-1">
          · {formatBytes(part.sizeBytes)}
        </span>
      ) : null}
    </div>
  </div>
);
