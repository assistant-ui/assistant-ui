import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { FileMessagePartComponent } from "@assistant-ui/react-native";
import {
  BracesIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react-native";
import { memo, type PropsWithChildren } from "react";
import {
  Linking,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import { IconButton } from "./icon-button";

function getMimeTypeIcon(mimeType: string): LucideIcon {
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileTextIcon;
  if (type === "application/json") return BracesIcon;
  if (type.startsWith("text/")) return FileTextIcon;
  if (type.startsWith("audio/")) return MusicIcon;
  if (type.startsWith("video/")) return VideoIcon;
  return FileIcon;
}

export type FileDataKind = "data-uri" | "url" | "base64" | "id";

function getFileDataKind(
  data: string,
  sourceType?: "url" | "id",
): FileDataKind {
  if (sourceType === "url" && /^data:/i.test(data)) return "data-uri";
  if (sourceType) return sourceType;
  if (/^data:/i.test(data)) return "data-uri";
  if (/^https?:\/\//i.test(data)) return "url";
  return "base64";
}

function getBase64Size(base64: string): number {
  const commaIndex = base64.indexOf(",");
  const base64Data = commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

function utf8Length(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function getDataUrlSize(data: string): number {
  const fragment = data.indexOf("#");
  const end = fragment < 0 ? data.length : fragment;
  const comma = data.indexOf(",");
  if (comma < 0 || comma >= end) return 0;

  let payload = data.slice(comma + 1, end);
  if (/;base64$/i.test(data.slice(0, comma))) {
    if (/[%\t\n\f\r ]/.test(payload)) {
      payload = payload
        .replace(/%([\da-f]{2})/gi, (_match, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        )
        .replace(/[\t\n\f\r ]/g, "");
    }
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    const firstNonBase64 = payload.search(/[^A-Za-z\d+/]/);
    if (
      (firstNonBase64 !== -1 && firstNonBase64 !== payload.length - padding) ||
      payload.length % 4 === 1 ||
      (padding > 0 && payload.length % 4 !== 0)
    ) {
      return 0;
    }
    return Math.floor((payload.length * 3) / 4) - padding;
  }

  return utf8Length(payload.replace(/%[\da-f]{2}/gi, "_"));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileRootProps = ViewProps;

function FileRoot({ className, children, ...props }: FileRootProps) {
  return (
    <View
      className={cn(
        "aui-file-root border-border inline-flex flex-row items-center gap-3 rounded-xl border px-3 py-2",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}

type FileIconDisplayProps = PropsWithChildren<
  ViewProps & { mimeType?: string }
>;

function FileIconDisplay({
  mimeType,
  className,
  children,
  ...props
}: FileIconDisplayProps) {
  const IconComponent = mimeType ? getMimeTypeIcon(mimeType) : FileIcon;

  return (
    <View className={cn("aui-file-icon shrink-0", className)} {...props}>
      {children ?? (
        <Icon as={IconComponent} className="text-muted-foreground size-5" />
      )}
    </View>
  );
}

function FileName({ className, children, ...props }: TextProps) {
  return (
    <Text
      className={cn(
        "aui-file-name text-foreground min-w-0 flex-1 font-medium",
        className,
      )}
      numberOfLines={1}
      {...props}
    >
      {children || "Unnamed file"}
    </Text>
  );
}

type FileSizeProps = TextProps & { bytes: number };

function FileSize({ bytes, className, ...props }: FileSizeProps) {
  return (
    <Text
      className={cn("aui-file-size text-muted-foreground shrink-0", className)}
      {...props}
    >
      {formatFileSize(bytes)}
    </Text>
  );
}

type FileOpenProps = PropsWithChildren<{
  data: string;
  filename?: string;
  sourceType?: "url" | "id";
  className?: string;
}>;

function FileOpen({
  data,
  filename,
  sourceType,
  className,
  children,
}: FileOpenProps) {
  const kind = getFileDataKind(data, sourceType);
  if (kind !== "url" || !/^https?:\/\//i.test(data)) return null;

  return (
    <IconButton
      label={`Open ${filename || "file"}`}
      className={cn("aui-file-open shrink-0", className)}
      onPress={() => {
        void Linking.openURL(data).catch(() => {});
      }}
    >
      {children ?? (
        <Icon as={ExternalLinkIcon} className="text-muted-foreground size-4" />
      )}
    </IconButton>
  );
}

const FileImpl: FileMessagePartComponent = ({
  filename,
  data,
  mimeType,
  sourceType,
}) => {
  const kind = getFileDataKind(data, sourceType);
  const showSize = kind === "base64" || kind === "data-uri";

  return (
    <FileRoot>
      <FileIconDisplay mimeType={mimeType} />
      <View className="min-w-0 flex-1 gap-0.5">
        <FileName>{filename}</FileName>
        {showSize && (
          <FileSize
            bytes={
              kind === "data-uri" ? getDataUrlSize(data) : getBase64Size(data)
            }
            className="text-xs"
          />
        )}
      </View>
      <FileOpen
        data={data}
        {...(filename !== undefined && { filename })}
        {...(sourceType !== undefined && { sourceType })}
      />
    </FileRoot>
  );
};

const File = memo(FileImpl) as unknown as FileMessagePartComponent & {
  Root: typeof FileRoot;
  Icon: typeof FileIconDisplay;
  Name: typeof FileName;
  Size: typeof FileSize;
  Open: typeof FileOpen;
};

File.displayName = "File";
File.Root = FileRoot;
File.Icon = FileIconDisplay;
File.Name = FileName;
File.Size = FileSize;
File.Open = FileOpen;

export {
  File,
  FileRoot,
  FileIconDisplay,
  FileName,
  FileSize,
  FileOpen,
  getMimeTypeIcon,
  getFileDataKind,
  getBase64Size,
  getDataUrlSize,
  formatFileSize,
};
