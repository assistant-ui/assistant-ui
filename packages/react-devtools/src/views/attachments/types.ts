export interface AttachmentStatusPreview {
  type: string;
  reason?: string;
  progress?: number;
}

export interface AttachmentPreview {
  id?: string;
  name: string;
  kind?: string;
  contentType?: string;
  status?: AttachmentStatusPreview;
  previewUrl?: string;
  sizeBytes?: number;
}
