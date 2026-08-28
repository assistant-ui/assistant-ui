import { fetchSandboxResource } from "./fetch-sandbox";

export type TemplateSandboxConfig = Record<string, unknown>;

export interface TemplatePreviewSession {
  previewUrl?: string;
  downloadUrl?: string;
  validationWarnings?: unknown[];
}

export function toAbsolute(baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function withVersion(
  url: string,
  versionId: string | null | undefined,
): string {
  if (!versionId) return url;
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex === -1 ? "" : url.slice(hashIndex);
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const [path, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("v")) params.set("v", versionId);
  return `${path}?${params.toString()}${fragment}`;
}

export function hasConfig(
  config: TemplateSandboxConfig | undefined,
): config is TemplateSandboxConfig {
  return !!config && Object.keys(config).length > 0;
}

export async function fetchTemplateContract(
  sandboxBaseUrl: string,
  versionId: string | null | undefined,
): Promise<Record<string, unknown> | null> {
  try {
    const url = new URL("/api/template/contract", sandboxBaseUrl);
    if (versionId) url.searchParams.set("v", versionId);
    const response = await fetchSandboxResource(url.toString());
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function fetchPreviewSession(
  sandboxBaseUrl: string,
  versionId: string | null | undefined,
  config: TemplateSandboxConfig,
): Promise<Response> {
  const url = new URL("/api/preview/session", sandboxBaseUrl);
  if (versionId) url.searchParams.set("v", versionId);
  return fetchSandboxResource(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}
