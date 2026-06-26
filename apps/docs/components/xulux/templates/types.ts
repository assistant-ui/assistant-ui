export type XuluxTemplateCategory = {
  id: string;
  name: string;
  description?: string | undefined;
};

export type XuluxPreviewFrame =
  | {
      kind: "phone";
      width?: number | undefined;
      aspectRatio?: string | undefined;
      chrome?: "ios-dark" | undefined;
    }
  | {
      kind: "terminal";
      title?: string | undefined;
      width?: number | undefined;
      height?: number | undefined;
    };

export type XuluxTemplate = {
  id: string;
  templateId?: string | undefined;
  versionId?: string | undefined;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  prompt: string;
  gradient: string;
  kind: "template" | "example";
  previewStatus: "live" | "stale" | "missing";
  previewUrl?: string | undefined;
  previewFrame?: XuluxPreviewFrame | undefined;
  downloadUrl?: string | undefined;
  sandboxBaseUrl?: string | undefined;
  screenshotUrl?: string | undefined;
  sourcePath?: string | undefined;
  docsUrl?: string | undefined;
  featured?: boolean | undefined;
  versions?:
    | Array<{
        id: string;
        title: string;
        description: string;
        previewUrl: string;
        downloadUrl: string;
      }>
    | undefined;
  intent?:
    | {
        goodFor: string[];
        notFor?: string[] | undefined;
        exampleUserRequests?: string[] | undefined;
      }
    | undefined;
  customization?:
    | {
        safeFieldsSummary: string[];
        supportedRenderers: string[];
        sourceEditFiles: string[];
      }
    | undefined;
  tech: {
    framework: string;
    runtime: string;
    frontendPattern: string;
  };
  env: Array<{
    name: string;
    required: boolean;
    secret?: boolean | undefined;
    description?: string | undefined;
  }>;
  canStart: boolean;
};

export type XuluxTemplateCatalog = {
  categories: XuluxTemplateCategory[];
  templates: XuluxTemplate[];
};
