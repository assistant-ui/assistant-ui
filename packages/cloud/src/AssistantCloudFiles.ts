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
    };
  }
}
