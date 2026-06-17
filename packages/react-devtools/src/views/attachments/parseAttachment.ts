import { isRecord } from "../../utils/common";
import { estimateBase64Bytes, isSafeImagePreviewUrl } from "./formatBytes";
import type { AttachmentPreview, AttachmentStatusPreview } from "./types";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const parseAttachmentStatus = (
  value: unknown,
): AttachmentStatusPreview | undefined => {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  return {
    type: value.type,
    ...(typeof value.reason === "string" ? { reason: value.reason } : {}),
    ...(typeof value.progress === "number" ? { progress: value.progress } : {}),
  };
};

const mediaFromContent = (
  content: unknown,
): { previewUrl?: string; sizeBytes?: number } => {
  if (!Array.isArray(content)) return {};
  for (const part of content) {
    if (!isRecord(part)) continue;
    const type = asString(part.type);
    if (type === "image") {
      const image = asString(part.image);
      if (image && isSafeImagePreviewUrl(image)) {
        const sizeBytes = image.startsWith("data:")
          ? estimateBase64Bytes(image.split(",", 2)[1] ?? image)
          : undefined;
        return {
          previewUrl: image,
          ...(sizeBytes !== undefined ? { sizeBytes } : {}),
        };
      }
    }
    if (type === "file") {
      const data = asString(part.data);
      if (data) return { sizeBytes: estimateBase64Bytes(data) };
    }
  }
  return {};
};

export const parseAttachment = (value: unknown): AttachmentPreview | null => {
  if (!isRecord(value)) return null;

  const name =
    asString(value.name) ??
    asString(value.filename) ??
    asString(value.id) ??
    "(attachment)";

  const status = parseAttachmentStatus(value.status);
  const fromContent = mediaFromContent(value.content);

  const image = asString(value.image);
  const previewUrl =
    fromContent.previewUrl ??
    (image && isSafeImagePreviewUrl(image) ? image : undefined);

  const data = asString(value.data);
  const sizeBytes =
    fromContent.sizeBytes ?? (data ? estimateBase64Bytes(data) : undefined);

  return {
    name,
    ...(asString(value.id) ? { id: asString(value.id)! } : {}),
    ...(asString(value.type) ? { kind: asString(value.type)! } : {}),
    ...(asString(value.contentType)
      ? { contentType: asString(value.contentType)! }
      : {}),
    ...(status ? { status } : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
  };
};

export const parseAttachments = (value: unknown): AttachmentPreview[] =>
  Array.isArray(value)
    ? value
        .map((item) => parseAttachment(item))
        .filter((item): item is AttachmentPreview => Boolean(item))
    : [];
