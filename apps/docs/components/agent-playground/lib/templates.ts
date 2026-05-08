import type {
  FrontendExampleCapability,
  FrontendExampleEnvVar,
  FrontendExampleSummary,
} from "@/components/agent-playground/augment/types";

export type Category = {
  id: string;
  name: string;
  description: string;
};

export type TemplatePreviewStatus = FrontendExampleSummary["preview"]["status"];
export type TemplateKind = FrontendExampleSummary["kind"];
export type TemplateTech = FrontendExampleSummary["tech"];

export type Template = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  capabilities: FrontendExampleCapability[];
  prompt: string;
  gradient: string;
  kind: TemplateKind;
  previewStatus: TemplatePreviewStatus;
  previewBuiltFromRef?: string | undefined;
  previewUrl?: string | undefined;
  screenshotUrl?: string | undefined;
  sourceUrl?: string | undefined;
  sourcePath?: string | undefined;
  docsUrl?: string | undefined;
  featured?: boolean | undefined;
  tech: TemplateTech;
  verifyProfile: FrontendExampleSummary["verifyProfile"];
  env: FrontendExampleEnvVar[];
  hasHostedPreview: boolean;
  hasRequiredEnv: boolean;
  isEditable: boolean;
  isPreviewOnly: boolean;
  canStart: boolean;
};

export type Example = {
  id: string;
  title: string;
  description: string;
  author: string;
  templateId?: string | undefined;
  gradient: string;
  previewUrl?: string | undefined;
  sourceUrl?: string | undefined;
};

export interface TemplateCatalog {
  categories: Category[];
  templates: Template[];
  examples: Example[];
}
