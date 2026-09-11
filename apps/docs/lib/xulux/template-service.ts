import type {
  XuluxMcpCatalog,
  XuluxMcpCatalogTemplate,
  XuluxMcpCatalogVersion,
} from "./mcp-catalog";
import {
  fetchPreviewSession,
  fetchTemplateContract,
  hasConfig,
  toAbsolute,
  withVersion,
  type TemplatePreviewSession,
} from "./sandbox-contract";

export interface ResolvedTemplate {
  template: XuluxMcpCatalogTemplate;
  version: XuluxMcpCatalogVersion | null;
}

export function resolveTemplate(
  catalog: XuluxMcpCatalog,
  templateId: string,
  versionId?: string | undefined,
): ResolvedTemplate | null {
  let template = catalog.templates.find(
    (candidate) =>
      candidate.templateId === templateId || candidate.id === templateId,
  );
  let impliedVersionId: string | undefined;

  if (!template) {
    template = catalog.templates.find((candidate) =>
      candidate.versions.some((version) => version.entryId === templateId),
    );
    if (template) {
      impliedVersionId = template.versions.find(
        (version) => version.entryId === templateId,
      )?.id;
    }
  }

  if (!template) return null;

  const effectiveVersionId =
    versionId ?? impliedVersionId ?? template.versionId;
  const version = effectiveVersionId
    ? (template.versions.find(
        (candidate) => candidate.id === effectiveVersionId,
      ) ?? null)
    : null;

  return { template, version };
}

export interface TemplateListItem {
  id: string;
  name: string;
  summary: string;
  assistantPlacement: string;
  features: string[];
  customizable: string[];
  versions: Array<{ id: string; name: string; description: string }>;
  kind: "template" | "example";
}

export function listTemplates(catalog: XuluxMcpCatalog): {
  templates: TemplateListItem[];
} {
  return {
    templates: catalog.templates.map((template) => ({
      id: template.templateId,
      name: template.name,
      summary: template.summary,
      assistantPlacement: template.assistantPlacement,
      features: template.features,
      customizable: template.customizable,
      versions: template.versions.map((version) => ({
        id: version.id,
        name: version.name,
        description: version.description,
      })),
      kind: template.kind,
    })),
  };
}

export interface TemplateDetails {
  id: string;
  name: string;
  selectedVersionId: string | null;
  summary: string;
  assistantPlacement: string;
  configRoots?: Record<string, unknown>;
  rules: {
    required: string[];
    unsupported?: string[];
  };
  tools: {
    builtIn: unknown[];
    customToolSupported: boolean;
    renderers: unknown[];
  };
  exampleConfig: Record<string, unknown> | null;
  previewUrl?: string;
  downloadUrl?: string;
  warnings?: string[];
  exampleConfigNote?: string;
}

export interface TemplateError {
  error: string;
  retryHint?: string;
}

export async function getTemplateDetails(
  catalog: XuluxMcpCatalog,
  input: { templateId: string; versionId?: string | undefined },
): Promise<TemplateDetails | TemplateError> {
  const resolved = resolveTemplate(catalog, input.templateId, input.versionId);
  if (!resolved) {
    return {
      error: `Template "${input.templateId}" not found.`,
      retryHint:
        "Call list_templates and use one of the returned template ids.",
    };
  }

  const { template, version } = resolved;

  if (template.kind === "example") {
    return {
      id: template.templateId,
      name: template.name,
      selectedVersionId: null,
      summary: template.summary,
      assistantPlacement: template.assistantPlacement,
      rules: template.rules ?? {
        required: [
          "This entry is a fixed demo and is not schema-customizable.",
          "Preview and download it as-is. Do not pass a config for this entry.",
        ],
      },
      tools: { builtIn: [], customToolSupported: false, renderers: [] },
      exampleConfig: null,
      ...(template.previewUrl ? { previewUrl: template.previewUrl } : {}),
      ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
    };
  }

  const selectedVersionId = version?.id ?? template.versionId;

  if (!template.configRoots || !template.tools) {
    return {
      error: `No authoring schema found for template "${template.templateId}".`,
      retryHint:
        "Call list_templates and choose a template with a non-empty customizable list, then call read_template for its authoring schema.",
    };
  }

  let exampleConfig: Record<string, unknown> | null = null;
  let exampleConfigNote: string;
  if (template.sandboxBaseUrl) {
    const contract = await fetchTemplateContract(
      template.sandboxBaseUrl,
      selectedVersionId,
    );
    exampleConfig =
      (contract?.exampleCompleteConfig as Record<string, unknown> | null) ??
      null;
    exampleConfigNote = exampleConfig
      ? `Resolved defaults for version "${selectedVersionId}". Use as a complete working starting point.`
      : "Could not reach the template sandbox to resolve exampleConfig. Use configRoots schemas and defaults to author config manually.";
  } else {
    exampleConfigNote =
      "This template has no sandbox URL in the catalog, so exampleConfig is unavailable. Use configRoots schemas and defaults.";
  }

  return {
    id: template.templateId,
    name: template.name,
    selectedVersionId,
    summary: template.summary,
    assistantPlacement: template.assistantPlacement,
    configRoots: template.configRoots,
    rules: template.rules ?? { required: [] },
    tools: template.tools,
    exampleConfig,
    exampleConfigNote,
    ...(version?.previewUrl
      ? { previewUrl: version.previewUrl }
      : template.previewUrl
        ? { previewUrl: template.previewUrl }
        : {}),
    ...(version?.downloadUrl
      ? { downloadUrl: version.downloadUrl }
      : template.downloadUrl
        ? { downloadUrl: template.downloadUrl }
        : {}),
  };
}

export interface TemplatePreviewResult {
  success: boolean;
  templateId: string;
  versionId: string | null;
  previewUrl?: string;
  downloadUrl?: string;
  title?: string;
  customized?: boolean;
  validationWarnings?: unknown[];
  error?: string;
  retryHint?: string;
  details?: string;
  summary?: string;
}

export async function createTemplatePreview(
  catalog: XuluxMcpCatalog,
  input: {
    templateId: string;
    versionId?: string | undefined;
    config?: Record<string, unknown> | undefined;
  },
): Promise<TemplatePreviewResult> {
  const resolved = resolveTemplate(catalog, input.templateId, input.versionId);
  if (!resolved) {
    return {
      success: false,
      templateId: input.templateId,
      versionId: input.versionId ?? null,
      error: `Template "${input.templateId}" not found.`,
      retryHint:
        "Call list_templates and use one of the returned template ids.",
    };
  }

  const { template, version } = resolved;
  const tid = template.templateId;

  if (template.kind === "example") {
    if (hasConfig(input.config)) {
      return {
        success: false,
        templateId: tid,
        versionId: null,
        error: `Template "${tid}" is a fixed demo and does not support config.`,
        retryHint:
          "Call read_template for this template. If no configRoots are returned, call preview_template again without config or choose a configurable hosted template.",
      };
    }

    if (!template.previewUrl) {
      return {
        success: false,
        templateId: tid,
        versionId: null,
        error: `Fixed demo "${tid}" has no preview URL in the catalog.`,
        retryHint: "Call list_templates and choose another hosted entry.",
      };
    }

    return {
      success: true,
      templateId: tid,
      versionId: null,
      previewUrl: template.previewUrl,
      ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
      title: template.name,
      customized: false,
      summary: `Resolved ${template.name} as a fixed demo. Preview and download URLs point at hosted resources; nothing was opened in any UI.`,
    };
  }

  const baseUrl = template.sandboxBaseUrl;
  if (!baseUrl) {
    return {
      success: false,
      templateId: tid,
      versionId: version?.id ?? template.versionId,
      error: `Template "${tid}" has no sandbox URL in the catalog.`,
      retryHint:
        "Call list_templates and choose another configurable template.",
    };
  }

  const effectiveVersionId = version?.id ?? template.versionId;

  if (hasConfig(input.config)) {
    try {
      const response = await fetchPreviewSession(
        baseUrl,
        effectiveVersionId,
        input.config,
      );
      if (!response.ok) {
        const details = await response.text();
        return {
          success: false,
          templateId: tid,
          versionId: effectiveVersionId,
          error: `Preview session failed: HTTP ${response.status}`,
          details,
          retryHint:
            "Check validationWarnings for the specific fields that failed. " +
            "Call read_template for this template and use configRoots schemas to correct the config. " +
            "Pass only hostUi, assistant, and brandTheme at the top level.",
        };
      }
      const data = (await response.json()) as TemplatePreviewSession;
      if (!data.previewUrl) {
        return {
          success: false,
          templateId: tid,
          versionId: effectiveVersionId,
          error: "Session endpoint did not return a previewUrl.",
        };
      }
      return {
        success: true,
        templateId: tid,
        versionId: effectiveVersionId,
        previewUrl: toAbsolute(
          baseUrl,
          withVersion(data.previewUrl, effectiveVersionId ?? undefined),
        ),
        downloadUrl: toAbsolute(
          baseUrl,
          withVersion(
            data.downloadUrl ?? "/api/download",
            effectiveVersionId ?? undefined,
          ),
        ),
        title: version?.name ?? template.name,
        customized: true,
        summary: `Created a configured preview session for ${template.name}. URLs point at the hosted sandbox; nothing was opened in any UI.`,
        validationWarnings: data.validationWarnings ?? [],
      };
    } catch (error) {
      return {
        success: false,
        templateId: tid,
        versionId: effectiveVersionId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const previewUrl = version?.previewUrl ?? template.previewUrl;
  const downloadUrl =
    version?.downloadUrl ?? template.downloadUrl ?? `${baseUrl}/api/download`;

  return {
    success: true,
    templateId: tid,
    versionId: effectiveVersionId,
    previewUrl: previewUrl ?? baseUrl,
    downloadUrl,
    title: version?.name ?? template.name,
    customized: false,
    summary: `Resolved preview and download URLs for ${template.name}. Nothing was opened in any UI.`,
  };
}
