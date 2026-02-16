import type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
} from "../../types";

// =============================================================================
// Adapter Type
// =============================================================================

export type AttachmentAdapter = {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
};

// =============================================================================
// Simple Image Attachment Adapter
// =============================================================================

export class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "image",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image: await getFileDataURL(attachment.file),
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

// =============================================================================
// Simple Text Attachment Adapter
// =============================================================================

export class SimpleTextAttachmentAdapter implements AttachmentAdapter {
  public accept =
    "text/plain,text/html,text/markdown,text/csv,text/xml,text/json,text/css";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "text",
          text: `<attachment name=${attachment.name}>\n${await getFileText(attachment.file)}\n</attachment>`,
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });

// =============================================================================
// Composite Attachment Adapter
// =============================================================================

function fileMatchesAccept(
  file: { name: string; type: string },
  acceptString: string,
) {
  if (acceptString === "*") {
    return true;
  }

  const allowedTypes = acceptString
    .split(",")
    .map((type) => type.trim().toLowerCase());

  const fileExtension = `.${file.name.split(".").pop()!.toLowerCase()}`;
  const fileMimeType = file.type.toLowerCase();

  for (const type of allowedTypes) {
    if (type.startsWith(".") && type === fileExtension) {
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

  public async send(attachment: PendingAttachment) {
    const adapters = this._adapters.slice();
    for (const adapter of adapters) {
      if (fileMatchesAccept(attachment.file, adapter.accept)) {
        return adapter.send(attachment);
      }
    }
    throw new Error("No matching adapter found for attachment");
  }

  public async remove(attachment: Attachment) {
    const adapters = this._adapters.slice();
    for (const adapter of adapters) {
      if (
        fileMatchesAccept(
          {
            name: attachment.name,
            type: attachment.contentType,
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
