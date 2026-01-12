import type { ExportConfig, ChatGPTAppManifest } from "./types";

export interface GenerateManifestOptions {
  config: ExportConfig;
  widgetUrl: string;
}

export function generateManifest(
  options: GenerateManifestOptions,
): ChatGPTAppManifest {
  const { config, widgetUrl } = options;
  const manifestConfig = config.manifest ?? {};

  const manifest: ChatGPTAppManifest = {
    schema_version: "1.0",
    name: manifestConfig.name ?? config.widget.name ?? "My ChatGPT App",
    widget: {
      url: widgetUrl,
    },
  };

  if (manifestConfig.description) {
    manifest.description = manifestConfig.description;
  }

  if (manifestConfig.version) {
    manifest.version = manifestConfig.version;
  }

  if (manifestConfig.author) {
    manifest.author = manifestConfig.author;
  }

  if (manifestConfig.homepage) {
    manifest.homepage = manifestConfig.homepage;
  }

  if (manifestConfig.icon) {
    manifest.icon = manifestConfig.icon;
  }

  if (manifestConfig.tools && manifestConfig.tools.length > 0) {
    manifest.tools = manifestConfig.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      output_schema: tool.outputSchema,
    }));
  }

  return manifest;
}

export function stringifyManifest(manifest: ChatGPTAppManifest): string {
  return JSON.stringify(manifest, null, 2);
}
