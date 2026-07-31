import { generateId, type AttachmentAdapter } from "@assistant-ui/core";
import { getFileDataURL, toMediaWireUrl } from "@assistant-ui/core/internal";

const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  "application/pdf",
  "text/*",
  "application/json",
  "application/ld+json",
  "application/toml",
  "application/x-toml",
  "application/x-yaml",
  "application/xml",
  "application/yaml",
  ".c",
  ".cc",
  ".cjs",
  ".conf",
  ".cpp",
  ".css",
  ".csv",
  ".cts",
  ".env",
  ".go",
  ".gql",
  ".graphql",
  ".h",
  ".hh",
  ".hpp",
  ".htm",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".mdx",
  ".mjs",
  ".mts",
  ".py",
  ".rb",
  ".rs",
  ".sass",
  ".scss",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
] as const;

const IMAGE_MIMES = new Set<string>(ACCEPTED_IMAGE_TYPES);
const IMAGE_EXTENSIONS = new Map([
  ["gif", "image/gif"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);
const TEXT_MIMES = new Set([
  "application/json",
  "application/ld+json",
  "application/toml",
  "application/x-toml",
  "application/x-yaml",
  "application/xml",
  "application/yaml",
]);
const TEXT_SAMPLE_BYTES = 4096;

const mediaType = (value: string) =>
  value.split(";", 1)[0]?.trim().toLowerCase() ?? "";

const extension = (name: string) => {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1).toLowerCase();
};

const isTextMediaType = (value: string) =>
  value.startsWith("text/") ||
  TEXT_MIMES.has(value) ||
  value.endsWith("+json") ||
  value.endsWith("+xml");

const isTextBytes = (bytes: Uint8Array) => {
  if (bytes.length === 0) return true;

  let controls = 0;
  for (const byte of bytes) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) controls += 1;
  }
  return controls / bytes.length <= 0.3;
};

const normalizeAttachmentMediaType = async (file: File) => {
  const type = mediaType(file.type);
  if (IMAGE_MIMES.has(type) || type === "application/pdf") return type;

  const suffix = extension(file.name);
  const fallback =
    IMAGE_EXTENSIONS.get(suffix) ??
    (suffix === "pdf" ? "application/pdf" : undefined);
  if ((!type || type === "application/octet-stream") && fallback) {
    return fallback;
  }

  if (isTextMediaType(type)) return "text/plain";

  const bytes = new Uint8Array(
    await file.slice(0, TEXT_SAMPLE_BYTES).arrayBuffer(),
  );
  return isTextBytes(bytes) ? "text/plain" : undefined;
};

export const openCodeAttachmentAdapter: AttachmentAdapter = {
  accept: ACCEPTED_FILE_TYPES.join(","),
  async add({ file }) {
    const contentType = await normalizeAttachmentMediaType(file);
    if (!contentType) {
      throw new Error(
        `OpenCode does not support the file type of ${file.name}`,
      );
    }
    return {
      id: generateId(),
      type: contentType.startsWith("image/") ? "image" : "file",
      name: file.name,
      contentType,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
  async send(attachment) {
    const contentType =
      attachment.contentType ||
      (await normalizeAttachmentMediaType(attachment.file));
    if (!contentType) {
      throw new Error(
        `OpenCode does not support the file type of ${attachment.name}`,
      );
    }
    const data = toMediaWireUrl(
      await getFileDataURL(attachment.file),
      contentType,
    );
    return {
      ...attachment,
      contentType,
      status: { type: "complete" },
      content: [
        attachment.type === "image"
          ? {
              type: "image",
              image: data,
              filename: attachment.name,
            }
          : {
              type: "file",
              data,
              filename: attachment.name,
              mimeType: contentType,
            },
      ],
    };
  },
  async remove() {},
};
