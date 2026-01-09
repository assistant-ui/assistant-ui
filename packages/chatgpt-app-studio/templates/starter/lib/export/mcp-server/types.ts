import type {
  ToolAnnotations,
  ToolDescriptorMeta,
  MockResponse,
} from "../../workbench/mock-config/types";

export interface MCPToolConfig {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: ToolAnnotations;
  meta?: ToolDescriptorMeta;
  defaultResponse?: MockResponse;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPToolConfig[];
  widgetHtml?: string;
  widgetUrl?: string;
}

export interface MCPServerGeneratorOptions {
  config: MCPServerConfig;
  outputDir: string;
  includeExampleHandlers?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface MCPServerGeneratorResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
}
