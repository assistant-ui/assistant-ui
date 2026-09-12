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
      key: "attachments/file",
    });

    await expect(
      files.generatePresignedUploadUrl({ filename: "notes.txt" }),
    ).resolves.toEqual({
      success: true,
      signedUrl: "https://uploads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      publicUrl: "https://cdn.example.com/file",
      key: "attachments/file",
    });
  });

  it("accepts presigned upload responses from older clouds without a key", async () => {
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

  it("decodes presigned download responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({
      signedUrl: "https://downloads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      key: "attachments/file",
    });

    await expect(
      files.generatePresignedDownloadUrl({ key: "attachments/file" }),
    ).resolves.toEqual({
      signedUrl: "https://downloads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      key: "attachments/file",
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "/files/attachments/generate-presigned-download-url",
      { method: "POST", body: { key: "attachments/file" } },
    );
  });

  it("rejects malformed presigned download responses", async () => {
    const { files, makeRequest } = createCloudFiles();
    makeRequest.mockResolvedValue({
      signedUrl: "https://downloads.example.com/file",
      expiresAt: "2026-08-16T12:00:00.000Z",
      key: 42,
    });

    await expect(
      files.generatePresignedDownloadUrl({
        url: "https://cdn.example.com/file",
      }),
    ).rejects.toThrow(
      'Invalid Assistant Cloud response for "presigned download response.key": expected a string',
    );
  });
});
