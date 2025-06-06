import { AssistantCloudAPI } from "./AssistantCloudAPI";

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
};

export class AssistantCloudFiles {
  constructor(private cloud: AssistantCloudAPI) {}

  public async pdfToImages(
    body: PdfToImagesRequestBody,
  ): Promise<PdfToImagesResponse> {
    return this.cloud.makeRequest("/files/pdf-to-images", {
      method: "POST",
      body,
    });
  }
} 