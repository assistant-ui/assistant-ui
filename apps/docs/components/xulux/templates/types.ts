export type XuluxTemplateCategory = {
  id: string;
  name: string;
  description?: string | undefined;
};

export type XuluxTemplate = {
  id: string;
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
  screenshotUrl?: string | undefined;
  sourcePath?: string | undefined;
  docsUrl?: string | undefined;
  featured?: boolean | undefined;
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
