import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudFiles } from "./AssistantCloudFiles";

const createCloudFiles = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { files: new AssistantCloudFiles(api), makeRequest };
};

describe("AssistantCloudFiles responses", () => {
  it("decodes PDF conversion responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({
      success: true,
      urls: ["https://example.com/page-1.png"],
      message: "converted",
    });

    await expect(
      files.pdfToImages({ file_url: "https://example.com/file.pdf" }),
    ).resolves.toEqual({
      success: true,
      urls: ["https://example.com/page-1.png"],
      message: "converted",
    });
  });

  it("rejects malformed PDF conversion responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({
      success: true,
      urls: [42],
      message: "converted",
    });

    await expect(files.pdfToImages({ file_blob: "data" })).rejects.toThrow(
      'Invalid Assistant Cloud response for "PDF conversion response.urls[0]": expected a string',
    );
  });

  it("decodes presigned upload responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({
      success: true,
      signedUrl: "https://uploads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      publicUrl: "https://cdn.example.com/file",
    });

    await expect(
      files.generatePresignedUploadUrl({ filename: "notes.txt" }),
    ).resolves.toEqual({
      success: true,
      signedUrl: "https://uploads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      publicUrl: "https://cdn.example.com/file",
    });
  });

  it("rejects malformed presigned upload responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({});

    await expect(
      files.generatePresignedUploadUrl({ filename: "notes.txt" }),
    ).rejects.toThrow(
      'Invalid Assistant Cloud response for "presigned upload response.success": expected a boolean',
    );
  });
});
