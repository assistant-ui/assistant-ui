import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimplePDFAttachmentAdapter } from "../legacy-runtime/runtime-cores/adapters/attachment/SimplePDFAttachmentAdapter";

describe("SimplePDFAttachmentAdapter", () => {
  let adapter: SimplePDFAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimplePDFAttachmentAdapter();
  });

  describe("accept", () => {
    it("should accept PDF files", () => {
      expect(adapter.accept).toBe("application/pdf");
    });
  });

  describe("add", () => {
    it("should accept PDF files within size limit", async () => {
      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 1024 }); // 1KB

      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.pdf",
        type: "document",
        name: "test.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });

    it("should reject PDF files exceeding size limit", async () => {
      const file = new File(["large content"], "large.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 15 * 1024 * 1024 }); // 15MB

      const result = await adapter.add({ file });

      expect(result.status.type).toBe("incomplete");
      expect(result.status.reason).toBe("error");
    });

    it("should handle non-PDF files (adapter doesn't validate type)", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });

      // This would be handled by CompositeAttachmentAdapter's file matching
      // but we test the adapter in isolation
      const result = await adapter.add({ file });

      expect(result.contentType).toBe("text/plain"); // Adapter doesn't validate type
      expect(result.status.type).toBe("requires-action");
    });
  });

  describe("send", () => {
    it("should extract text from PDF successfully", async () => {
      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const pendingAttachment = {
        id: "test.pdf",
        type: "document" as const,
        name: "test.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action" as const, reason: "composer-send" },
      };

      // Mock pdf-parse
      vi.doMock("pdf-parse", () => ({
        default: vi.fn().mockResolvedValue({ text: "Extracted PDF content" }),
      }));

      const result = await adapter.send(pendingAttachment);

      expect(result.status.type).toBe("complete");
      expect(result.content).toEqual([
        {
          type: "text",
          text: '<attachment name="test.pdf">\nExtracted PDF content\n</attachment>',
        },
      ]);
    });

    it("should handle PDF parsing errors", async () => {
      const file = new File(["invalid content"], "invalid.pdf", {
        type: "application/pdf",
      });
      const pendingAttachment = {
        id: "invalid.pdf",
        type: "document" as const,
        name: "invalid.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action" as const, reason: "composer-send" },
      };

      // Mock pdf-parse to throw error
      vi.doMock("pdf-parse", () => ({
        default: vi.fn().mockRejectedValue(new Error("Invalid PDF format")),
      }));

      const result = await adapter.send(pendingAttachment);

      expect(result.status.type).toBe("complete");
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain(
        '<attachment name="invalid.pdf">',
      );
      expect(result.content[0].text).toContain(
        "Error: Failed to process PDF file",
      );
    });

    it("should handle empty PDF content", async () => {
      const file = new File([""], "empty.pdf", {
        type: "application/pdf",
      });
      const pendingAttachment = {
        id: "empty.pdf",
        type: "document" as const,
        name: "empty.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action" as const, reason: "composer-send" },
      };

      // Mock pdf-parse with empty text
      vi.doMock("pdf-parse", () => ({
        default: vi.fn().mockResolvedValue({ text: "" }),
      }));

      const result = await adapter.send(pendingAttachment);

      expect(result.status.type).toBe("complete");
      expect(result.content).toEqual([
        {
          type: "text",
          text: '<attachment name="empty.pdf">\n\n</attachment>',
        },
      ]);
    });
  });

  describe("remove", () => {
    it("should be a no-op", async () => {
      const attachment = {
        id: "test.pdf",
        type: "document" as const,
        name: "test.pdf",
        contentType: "application/pdf",
        status: { type: "complete" as const },
      };

      await expect(adapter.remove(attachment)).resolves.toBeUndefined();
    });
  });

  describe("configuration", () => {
    it("should accept custom maxFileSize", async () => {
      const customAdapter = new SimplePDFAttachmentAdapter({
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      const file = new File(["large content"], "large.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 7 * 1024 * 1024 }); // 7MB

      const result = await customAdapter.add({ file });

      expect(result.status.type).toBe("incomplete");
      expect(result.status.reason).toBe("error");
    });

    it("should accept custom workerSrc", () => {
      const customAdapter = new SimplePDFAttachmentAdapter({
        workerSrc: "/custom/pdf.worker.min.mjs",
      });

      expect(customAdapter).toBeDefined();
      // Worker source is used internally in browser environment
      // Cannot easily test without mocking browser environment
    });

    it("should work with default configuration", async () => {
      const defaultAdapter = new SimplePDFAttachmentAdapter();

      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 1024 }); // 1KB

      const result = await defaultAdapter.add({ file });

      expect(result.status.type).toBe("requires-action");
    });
  });
});
