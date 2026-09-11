import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudArray,
  readCloudBoolean,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
};

type GeneratePresignedUploadUrlRequestBody = {
  filename: string;
};

type GeneratePresignedUploadUrlResponse = {
  success: boolean;
  signedUrl: string;
  expiresAt: string;
  publicUrl: string;
  key?: string;
};

export type GeneratePresignedDownloadUrlResponse = {
  signedUrl: string;
  expiresAt: string;
  key: string;
};

export class AssistantCloudFiles {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async pdfToImages(
    body: PdfToImagesRequestBody,
  ): Promise<PdfToImagesResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest("/files/pdf-to-images", {
        method: "POST",
        body,
      }),
      "PDF conversion response",
    );

    return {
      success: readCloudBoolean(
        response.success,
        "PDF conversion response.success",
      ),
      urls: readCloudArray(response.urls, "PDF conversion response.urls").map(
        (url, index) =>
          readCloudString(url, `PDF conversion response.urls[${index}]`),
      ),
      message: readCloudString(
        response.message,
        "PDF conversion response.message",
      ),
    };
  }

  public async generatePresignedUploadUrl(
    body: GeneratePresignedUploadUrlRequestBody,
  ): Promise<GeneratePresignedUploadUrlResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        "/files/attachments/generate-presigned-upload-url",
        {
          method: "POST",
          body,
        },
      ),
      "presigned upload response",
    );

    return {
      success: readCloudBoolean(
        response.success,
        "presigned upload response.success",
      ),
      signedUrl: readCloudString(
        response.signedUrl,
        "presigned upload response.signedUrl",
      ),
      expiresAt: readCloudString(
        response.expiresAt,
        "presigned upload response.expiresAt",
      ),
      publicUrl: readCloudString(
        response.publicUrl,
        "presigned upload response.publicUrl",
      ),
      ...("key" in response
        ? {
            key: readCloudString(response.key, "presigned upload response.key"),
          }
        : {}),
    };
  }

  public async generatePresignedDownloadUrl(
    body: { key: string } | { url: string },
  ): Promise<GeneratePresignedDownloadUrlResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        "/files/attachments/generate-presigned-download-url",
        {
          method: "POST",
          body,
        },
      ),
      "presigned download response",
    );

    return {
      signedUrl: readCloudString(
        response.signedUrl,
        "presigned download response.signedUrl",
      ),
      expiresAt: readCloudString(
        response.expiresAt,
        "presigned download response.expiresAt",
      ),
      key: readCloudString(response.key, "presigned download response.key"),
    };
  }
}
