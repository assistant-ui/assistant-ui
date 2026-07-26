import { fetchSandboxResource } from "./fetch-sandbox.js";
import type {
  XuluxCatalog,
  XuluxCatalogTemplate,
  XuluxCatalogVersion,
} from "./types.js";

// ---------------------------------------------------------------------------
// Local, catalog-backed template operations for the assistant-ui template MCP tools.
// These functions never mutate any UI. Preview operations only return URLs.
// ---------------------------------------------------------------------------

export interface ResolvedTemplate {
  template: XuluxCatalogTemplate;
  version: XuluxCatalogVersion | null;
}

/**
 * Resolves a template by id, preserving the app-route semantics:
 * - exact `templateId` match wins
 * - version-specific entry ids (e.g. `webpage-assistant-product-docs`)
 *   remain valid inputs
 * - explicit `versionId` wins when provided
 * - otherwise the template's default version is used
 */
export function resolveTemplate(
  catalog: XuluxCatalog,
  templateId: string,
  versionId?: string | undefined,
): ResolvedTemplate | null {
  let template = catalog.templates.find(
    (t) => t.templateId === templateId || t.id === templateId,
  );
  let impliedVersionId: string | undefined;

  if (!template) {
    // Version-specific entry id such as `webpage-assistant-product-docs`.
    template = catalog.templates.find((t) =>
      t.versions.some((v) => v.entryId === templateId),
    );
    if (template) {
      impliedVersionId = template.versions.find(
        (v) => v.entryId === templateId,
      )?.id;
    }
  }

  if (!template) return null;

  const effectiveVersionId =
    versionId ?? impliedVersionId ?? template.versionId;
  const version = effectiveVersionId
    ? (template.versions.find((v) => v.id === effectiveVersionId) ?? null)
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

export function listTemplates(catalog: XuluxCatalog): {
  templates: TemplateListItem[];
} {
  return {
    templates: catalog.templates.map((t) => ({
      id: t.templateId,
      name: t.name,
      summary: t.summary,
      assistantPlacement: t.assistantPlacement,
      features: t.features,
      customizable: t.customizable,
      versions: t.versions.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
      })),
      kind: t.kind,
    })),
  };
}

async function fetchTemplateContract(
  sandboxBaseUrl: string,
  versionId: string | null,
): Promise<Record<string, unknown> | null> {
  try {
    const url = new URL("/api/template/contract", sandboxBaseUrl);
    if (versionId) url.searchParams.set("v", versionId);
    const res = await fetchSandboxResource(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  catalog: XuluxCatalog,
  input: { templateId: string; versionId?: string | undefined },
): Promise<TemplateDetails | TemplateError> {
  const resolved = resolveTemplate(catalog, input.templateId, input.versionId);
  if (!resolved) {
    return {
      error: `Template "${input.templateId}" not found.`,
      retryHint:
        "Call assistantUITemplates and use one of the returned template ids.",
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
        "The catalog may be in degraded fallback mode. Retry when live catalog access is restored.",
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

function toAbsolute(baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function withVersion(url: string, versionId: string | undefined): string {
  if (!versionId) return url;
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("v")) params.set("v", versionId);
  return `${path}?${params.toString()}`;
}

function hasConfig(config: Record<string, unknown> | undefined): boolean {
  return !!config && Object.keys(config).length > 0;
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
  catalog: XuluxCatalog,
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
        "Call assistantUITemplates and use one of the returned template ids.",
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
          "Call assistantUITemplateDetails for this template. If no configRoots are returned, call assistantUITemplatePreview again without config or choose a configurable hosted template.",
      };
    }

    if (!template.previewUrl) {
      return {
        success: false,
        templateId: tid,
        versionId: null,
        error: `Fixed demo "${tid}" has no preview URL in the catalog.`,
        retryHint:
          "The catalog may be in degraded fallback mode. Retry when live catalog access is restored.",
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
        "The catalog may be in degraded fallback mode. Retry when live catalog access is restored.",
    };
  }

  const effectiveVersionId = version?.id ?? template.versionId;

  if (hasConfig(input.config)) {
    try {
      const sessionUrl = new URL("/api/preview/session", baseUrl);
      if (effectiveVersionId)
        sessionUrl.searchParams.set("v", effectiveVersionId);
      const res = await fetchSandboxResource(sessionUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.config),
      });
      if (!res.ok) {
        const details = await res.text();
        return {
          success: false,
          templateId: tid,
          versionId: effectiveVersionId,
          error: `Preview session failed: HTTP ${res.status}`,
          details,
          retryHint:
            "Check validationWarnings for the specific fields that failed. " +
            "Call assistantUITemplateDetails for this template and use configRoots schemas to correct the config. " +
            "Pass only hostUi, assistant, and brandTheme at the top level.",
        };
      }
      const data = (await res.json()) as {
        previewUrl?: string;
        downloadUrl?: string;
        validationWarnings?: unknown[];
      };
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
    } catch (err) {
      return {
        success: false,
        templateId: tid,
        versionId: effectiveVersionId,
        error: err instanceof Error ? err.message : String(err),
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
