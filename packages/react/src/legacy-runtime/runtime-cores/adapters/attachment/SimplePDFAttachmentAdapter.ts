import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimplePDFAttachmentAdapter implements AttachmentAdapter {
  public accept = "application/pdf";
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  public async add(state: { file: File }): Promise<PendingAttachment> {
    if (state.file.size > this.maxFileSize) {
      const fileSizeMB = (state.file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = this.maxFileSize / (1024 * 1024);
      console.error(
        `File size (${fileSizeMB}MB) exceeds maximum of ${maxSizeMB}MB`,
      );
      return {
        id: state.file.name,
        type: "document",
        name: state.file.name,
        contentType: state.file.type,
        file: state.file,
        status: {
          type: "incomplete",
          reason: "error",
        },
      };
    }

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
    try {
      // Check if running in browser or Node.js
      const isBrowser = typeof window !== "undefined";

      let extractedText = "";

      if (isBrowser) {
        // Use pdfjs-dist for browser environment
        const pdfjsLib = await import("pdfjs-dist");

        // Set worker source using unpkg CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await attachment.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Extract text from all pages
        const textPromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          textPromises.push(
            pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              return textContent.items.map((item: any) => item.str).join(" ");
            }),
          );
        }

        const pageTexts = await Promise.all(textPromises);
        extractedText = pageTexts.join("\n\n");
      } else {
        // Use pdf-parse for Node.js environment
        const pdfParse = await import("pdf-parse");
        const arrayBuffer = await attachment.file.arrayBuffer();
        const result = await pdfParse.default(Buffer.from(arrayBuffer));
        extractedText = (result as any).text;
      }

      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `<attachment name="${attachment.name}">\n${extractedText}\n</attachment>`,
          },
        ],
      };
    } catch (error) {
      // For error cases, we need to return a CompleteAttachment with incomplete status
      // This follows the pattern where send() always returns CompleteAttachment
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `<attachment name="${attachment.name}">\nError: Failed to process PDF file - ${errorMessage}\n</attachment>`,
          },
        ],
      };
    }
  }

  public async remove() {
    // noop - simple adapters don't need cleanup
  }
}
