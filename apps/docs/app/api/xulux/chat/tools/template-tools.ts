import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";
import type { XuluxTemplate } from "@/components/xulux/templates/types";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";
import { fetchSandboxResource } from "@/lib/xulux/fetch-sandbox";
import {
  CONFIG_ROOTS_SCHEMAS,
  RULES,
  TEMPLATE_LIST_META,
  TOOLS_META,
  fixedDemoListMeta,
} from "@/lib/xulux/template-knowledge";
import { tool, zodSchema } from "ai";
import z from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function templateId(t: XuluxTemplate): string {
  return t.templateId ?? t.id;
}

function findFirstByTemplateId(
  templates: XuluxTemplate[],
  tid: string,
): XuluxTemplate | undefined {
  return templates.find((t) => templateId(t) === tid);
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

function isFixedDemo(entry: XuluxTemplate): boolean {
  return entry.kind === "example";
}

async function fetchTemplateContract(entry: XuluxTemplate, versionId?: string) {
  if (!entry.sandboxBaseUrl) return null;
  try {
    const url = new URL("/api/template/contract", entry.sandboxBaseUrl);
    if (versionId) url.searchParams.set("v", versionId);
    const res = await fetchSandboxResource(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export function createTemplateTools() {
  return {
    getTemplateList: tool({
      description:
        "Get all available hosted app templates and fixed demos with their features, customizable surfaces, and versions. " +
        "Call this first for any app-building request. Use the features and customizable fields to decide which template fits. " +
        "If customizable is empty, the entry is a fixed demo that should be shown as-is rather than configured. " +
        "Call getTemplateDetails on the chosen template before opening a preview.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const { templates } = getXuluxHostedTemplatesCatalog();
        const seen = new Set<string>();
        const list: Array<{
          id: string;
          name: string;
          summary: string;
          assistantPlacement: string;
          features: string[];
          customizable: string[];
          versions: Array<{ id: string; name: string; description: string }>;
        }> = [];

        for (const t of templates) {
          const tid = templateId(t);
          if (seen.has(tid)) continue;
          seen.add(tid);
          const meta = TEMPLATE_LIST_META[tid] ?? fixedDemoListMeta(t);
          if (!meta) continue;
          list.push({
            id: tid,
            name: meta.name,
            summary: meta.summary,
            assistantPlacement: meta.assistantPlacement,
            features: meta.features,
            customizable: meta.customizable,
            versions: (t.versions ?? []).map((v) => ({
              id: v.id,
              name: v.title,
              description: v.description,
            })),
          });
        }

        return { templates: list };
      },
    }),

    getTemplateDetails: tool({
      description:
        "Get the full authoring surface for a specific template. " +
        "Returns configRoots schemas (with types, defaults, and enums), rules, built-in tool input/outputShape, renderer contracts, and an exampleConfig. " +
        "Fixed demos return no configRoots; open those as-is without config. " +
        "Use this before calling openTemplatePreview to understand exactly what config to write. " +
        "If openTemplatePreview returns validationWarnings, call this again and cross-reference configRoots to correct the config.",
      inputSchema: zodSchema(
        z.object({
          templateId: z
            .string()
            .describe("The template id from getTemplateList"),
          versionId: z
            .string()
            .optional()
            .describe(
              "Optional version id. When provided, exampleConfig reflects that version's resolved defaults.",
            ),
        }),
      ),
      execute: async ({ templateId: tid, versionId }) => {
        const { templates } = getXuluxHostedTemplatesCatalog();
        const entry =
          (versionId
            ? templates.find(
                (t) => templateId(t) === tid && t.versionId === versionId,
              )
            : undefined) ?? findFirstByTemplateId(templates, tid);

        if (!entry) {
          return { error: `Template "${tid}" not found.` };
        }

        if (isFixedDemo(entry)) {
          const demo = getDemoDownloadManifest(entry.id);
          const meta = fixedDemoListMeta(entry);
          return {
            id: tid,
            name: demo?.name ?? meta?.name ?? entry.title,
            selectedVersionId: null,
            summary: demo?.description ?? meta?.summary ?? entry.description,
            assistantPlacement:
              meta?.assistantPlacement ?? "full-page demo route",
            features: demo?.features ?? meta?.features ?? [],
            customizable: [],
            previewUrl: entry.previewUrl,
            previewFrame: entry.previewFrame,
            downloadUrl: entry.downloadUrl,
            sourcePath: demo?.entry ?? entry.sourcePath,
            tools: {
              builtIn: [],
              customToolSupported: false,
              renderers: [],
            },
            rules: {
              required: [
                "No configRoots are returned for this entry, so it is not schema-customizable.",
                "Use openTemplatePreview without config to show this demo as-is.",
                "If the user needs domain-specific content or behavior changes, choose a configurable hosted template or produce a custom implementation brief instead.",
              ],
            },
            fixedDemoNote: entry.downloadUrl
              ? "This is a fixed assistant-ui demo. It supports preview and download, but not template config."
              : "This is a fixed assistant-ui demo. It supports preview, but download is not wired for this platform yet.",
          };
        }

        const effectiveVersionId = versionId ?? entry.versionId;
        const configRootsSchema = CONFIG_ROOTS_SCHEMAS[tid];
        const toolsMeta = TOOLS_META[tid];
        const rules = RULES[tid] ?? [];

        if (!configRootsSchema || !toolsMeta) {
          return { error: `No authoring schema found for template "${tid}".` };
        }

        // Fetch exampleConfig from the live sandbox contract endpoint.
        // Falls back to null if the sandbox is unreachable — the static schema
        // above is still returned so the agent can author config.
        const contract = await fetchTemplateContract(entry, effectiveVersionId);
        const exampleConfig =
          (contract?.exampleCompleteConfig as Record<string, unknown> | null) ??
          null;

        return {
          id: tid,
          name: TEMPLATE_LIST_META[tid]?.name ?? tid,
          selectedVersionId: effectiveVersionId,
          configRoots: configRootsSchema,
          rules: { required: rules },
          tools: toolsMeta,
          exampleConfig,
          exampleConfigNote: exampleConfig
            ? `Resolved defaults for version "${effectiveVersionId}". Use as a complete working starting point.`
            : `Could not reach sandbox to resolve exampleConfig. Use configRoots schemas and defaults to author config manually.`,
        };
      },
    }),

    openTemplatePreview: tool({
      description:
        "Open a hosted template preview in the canvas. " +
        "If you are using an existing version, you can pass versionId to select a specific variant. " +
        "If you are customizing the template, you can pass config to apply customizations and generate a preview. " +
        "Do not pass config for fixed demos that have no configRoots in getTemplateDetails. " +
        "Returns previewUrl and downloadUrl on success. " +
        "Only after a successful call, include an open-in block with the exact downloadUrl from this result. " +
        "If no template fits, do not call this tool — read docs instead and use a prompt-only open-in block without downloadUrl.",
      inputSchema: zodSchema(
        z.object({
          templateId: z
            .string()
            .describe("The template id from getTemplateList"),
          versionId: z
            .string()
            .optional()
            .describe(
              "Version id to open. Uses the template default if omitted.",
            ),
          config: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              "Customization config for the preview. Must contain only the top-level keys: hostUi, assistant, and brandTheme. " +
                "Use the schemas from getTemplateDetails.configRoots as the source of truth for each root. " +
                "Do not pass any other root keys.",
            ),
        }),
      ),
      execute: async ({ templateId: tid, versionId, config }) => {
        const { templates } = getXuluxHostedTemplatesCatalog();

        let entry: XuluxTemplate | undefined;
        if (versionId) {
          entry = templates.find(
            (t) => templateId(t) === tid && t.versionId === versionId,
          );
        }
        if (!entry) entry = findFirstByTemplateId(templates, tid);

        if (!entry) {
          return { success: false, error: `Template "${tid}" not found.` };
        }

        if (isFixedDemo(entry)) {
          if (hasConfig(config)) {
            return {
              success: false,
              error: `Template "${tid}" is a fixed demo and does not support config.`,
              retryHint:
                "Call getTemplateDetails for this template. If no configRoots are returned, call openTemplatePreview again without config or choose a configurable hosted template.",
            };
          }

          return {
            success: true,
            templateId: tid,
            versionId: null,
            previewUrl: entry.previewUrl ?? `/demos/${entry.id}`,
            downloadUrl: entry.downloadUrl,
            previewFrame: entry.previewFrame,
            title: entry.title,
            customized: false,
            summary: `Opened ${entry.title} as a fixed demo.`,
          };
        }

        const baseUrl = entry.sandboxBaseUrl;
        if (!baseUrl) {
          return {
            success: false,
            error: `Template "${tid}" has no sandbox URL configured.`,
          };
        }

        if (hasConfig(config)) {
          try {
            const sessionUrl = new URL("/api/preview/session", baseUrl);
            if (versionId) sessionUrl.searchParams.set("v", versionId);
            const res = await fetchSandboxResource(sessionUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config),
            });
            if (!res.ok) {
              const details = await res.text();
              return {
                success: false,
                error: `Preview session failed: HTTP ${res.status}`,
                details,
                retryHint:
                  "Check validationWarnings for the specific fields that failed. " +
                  "Call getTemplateDetails for this template and use configRoots schemas to correct the config. " +
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
                error: "Session endpoint did not return a previewUrl.",
              };
            }
            return {
              success: true,
              templateId: tid,
              versionId: versionId ?? entry.versionId,
              previewUrl: toAbsolute(
                baseUrl,
                withVersion(data.previewUrl, versionId),
              ),
              downloadUrl: toAbsolute(
                baseUrl,
                withVersion(data.downloadUrl ?? "/api/download", versionId),
              ),
              title: entry.title,
              customized: true,
              config,
              summary: `Opened ${entry.title} with custom configuration.`,
              validationWarnings: data.validationWarnings ?? [],
              ...(entry.previewFrame
                ? { previewFrame: entry.previewFrame }
                : {}),
            };
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }

        return {
          success: true,
          templateId: tid,
          versionId: versionId ?? entry.versionId,
          previewUrl: entry.previewUrl ?? baseUrl,
          downloadUrl: entry.downloadUrl ?? `${baseUrl}/api/download`,
          ...(entry.previewFrame ? { previewFrame: entry.previewFrame } : {}),
          title: entry.title,
          customized: false,
          summary: `Opened ${entry.title}.`,
        };
      },
    }),
  };
}
