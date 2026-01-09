import type { DisplayMode, Theme } from "../workbench/types";

export interface ExportConfig {
  widget: WidgetConfig;
  output: OutputConfig;
  manifest?: ManifestConfig;
}

export interface WidgetConfig {
  entryPoint: string;
  exportName?: string;
  name?: string;
}

export interface OutputConfig {
  dir: string;
  filename?: string;
  inline?: boolean;
}

export interface ManifestConfig {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  icon?: string;
  tools?: ToolManifest[];
}

export interface ToolManifest {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  outputDir: string;
  files: ExportedFile[];
  errors: string[];
  warnings: string[];
  manifest?: ChatGPTAppManifest;
}

export interface ExportedFile {
  path: string;
  relativePath: string;
  size: number;
}

export interface BridgeConfig {
  theme?: Theme;
  locale?: string;
  displayMode?: DisplayMode;
  toolInput?: Record<string, unknown>;
}

export interface ChatGPTAppManifest {
  schema_version: "1.0";
  name: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  icon?: string;
  widget: {
    url: string;
    width?: number;
    height?: number;
  };
  tools?: Array<{
    name: string;
    description?: string;
    input_schema?: Record<string, unknown>;
    output_schema?: Record<string, unknown>;
  }>;
}
