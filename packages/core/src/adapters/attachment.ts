import type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
} from "../types/attachment";
import type { ThreadUserMessagePart } from "../types/message";
import { generateId } from "../utils/id";

export type AttachmentAdapter = {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(
    attachment: PendingAttachment,
    options?: { signal?: AbortSignal },
  ): Promise<CompleteAttachment>;
};

export class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: generateId(),
      type: "image",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
    options?: { signal?: AbortSignal },
  ): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image: await getFileDataURL(attachment.file, options),
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  const nodeBuffer = (
    globalThis as {
      Buffer?: {
        from(bytes: Uint8Array): { toString(encoding: string): string };
      };
    }
  ).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

// React Native's AbortSignal polyfill carries no `reason`.
const abortReason = (signal: AbortSignal | undefined): unknown => {
  if (signal?.reason !== undefined) return signal.reason;
  const error = new Error("The attachment read was aborted");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) throw abortReason(signal);
};

const readWithFileReader = (
  read: (reader: FileReader) => void,
  signal: AbortSignal | undefined,
) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const onAbort = () => {
      reader.abort();
      reject(abortReason(signal));
    };
    reader.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      read(reader);
    } catch (error) {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    }
  });

// React Native's Blob polyfill has FileReader but not file.text()/arrayBuffer(); Node has
// the reverse. Prefer FileReader when present, falling back to the Blob methods otherwise.
export const getFileDataURL = async (
  file: File,
  options?: { signal?: AbortSignal },
): Promise<string> => {
  const signal = options?.signal;
  throwIfAborted(signal);
  if (typeof FileReader === "undefined") {
    const buffer = await file.arrayBuffer();
    throwIfAborted(signal);
    return `data:${file.type || "application/octet-stream"};base64,${bytesToBase64(new Uint8Array(buffer))}`;
  }
  return readWithFileReader((reader) => reader.readAsDataURL(file), signal);
};

const escapeAttachmentName = (name: string) =>
  name
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export class SimpleTextAttachmentAdapter implements AttachmentAdapter {
  public accept =
    "text/plain,text/html,text/markdown,text/csv,text/xml,text/json,application/json,text/css";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: generateId(),
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
    options?: { signal?: AbortSignal },
  ): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "text",
          text: `<attachment name="${escapeAttachmentName(attachment.name)}">\n${await getFileText(attachment.file, options)}\n</attachment>`,
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileText = async (
  file: File,
  options?: { signal?: AbortSignal },
): Promise<string> => {
  const signal = options?.signal;
  throwIfAborted(signal);
  if (typeof FileReader === "undefined") {
    const text = await file.text();
    throwIfAborted(signal);
    return text;
  }
  return readWithFileReader((reader) => reader.readAsText(file), signal);
};

export function fileMatchesAccept(
  file: { name: string; type: string },
  acceptString: string,
) {
  if (acceptString === "*") {
    return true;
  }

  const allowedTypes = acceptString
    .split(",")
    .map((type) => type.trim().toLowerCase());

  const fileName = file.name.toLowerCase();
  const fileMimeType = file.type.split(";", 1)[0]!.trim().toLowerCase();

  for (const type of allowedTypes) {
    if (type.startsWith(".") && fileName.endsWith(type)) {
      return true;
    }

    if (type.includes("/") && type === fileMimeType) {
      return true;
    }

    if (type.endsWith("/*")) {
      const generalType = type.split("/")[0]!;
      if (fileMimeType.startsWith(`${generalType}/`)) {
        return true;
      }
    }
  }

  return false;
}

export function attachmentsEqual(
  a: readonly CompleteAttachment[],
  b: readonly CompleteAttachment[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

export function partToCompleteAttachment(
  part: Exclude<ThreadUserMessagePart, { type: "text" }>,
): CompleteAttachment {
  const id = generateId();

  if (part.type === "image") {
    return {
      id,
      type: "image",
      name: part.filename ?? "image",
      content: [part],
      status: { type: "complete" },
    };
  }

  if (part.type === "file") {
    return {
      id,
      type: "document",
      name: part.filename ?? "document",
      contentType: part.mimeType,
      content: [part],
      status: { type: "complete" },
    };
  }

  if (part.type === "audio") {
    return {
      id,
      type: "audio",
      name: `audio.${part.audio.format}`,
      contentType: `audio/${part.audio.format}`,
      content: [part],
      status: { type: "complete" },
    };
  }

  return {
    id,
    type: "data",
    name: part.name,
    content: [part],
    status: { type: "complete" },
  };
}

export function liftNonTextParts(
  content: readonly ThreadUserMessagePart[],
): CompleteAttachment[] {
  const result: CompleteAttachment[] = [];
  for (const part of content) {
    if (part.type !== "text") {
      result.push(partToCompleteAttachment(part));
    }
  }
  return result;
}

export class CompositeAttachmentAdapter implements AttachmentAdapter {
  private _adapters: AttachmentAdapter[];

  public accept: string;

  constructor(adapters: AttachmentAdapter[]) {
    this._adapters = adapters;

    const wildcardIdx = adapters.findIndex((a) => a.accept === "*");
    if (wildcardIdx !== -1) {
      if (wildcardIdx !== adapters.length - 1)
        throw new Error(
          "A wildcard adapter (handling all files) can only be specified as the last adapter.",
        );

      this.accept = "*";
    } else {
      this.accept = adapters.map((a) => a.accept).join(",");
    }
  }

  public add(state: { file: File }) {
    for (const adapter of this._adapters) {
      if (fileMatchesAccept(state.file, adapter.accept)) {
        return adapter.add(state);
      }
    }
    throw new Error("No matching adapter found for file");
  }

  public async send(
    attachment: PendingAttachment,
    options?: { signal?: AbortSignal },
  ) {
    const adapters = this._adapters.slice();
    for (const adapter of adapters) {
      if (fileMatchesAccept(attachment.file, adapter.accept)) {
        return adapter.send(attachment, options);
      }
    }
    throw new Error("No matching adapter found for attachment");
  }

  public async remove(attachment: Attachment) {
    const adapters = this._adapters.slice();
    for (const adapter of adapters) {
      if (
        fileMatchesAccept(
          attachment.file ?? {
            name: attachment.name,
            type: attachment.contentType ?? "",
          },
          adapter.accept,
        )
      ) {
        return adapter.remove(attachment);
      }
    }
    throw new Error("No matching adapter found for attachment");
  }
}
