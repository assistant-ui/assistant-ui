import type { XuluxTemplate } from "@/components/xulux/templates/types";

const ALLOWED_SANDBOX_HOST_SUFFIXES = [".bl.run", ".blaxel.ai"] as const;
const SANDBOX_DOWNLOAD_PATHNAME = "/api/download";
const MAX_DOWNLOAD_SEARCH_LENGTH = 2048;
const MAX_DOWNLOAD_SEARCH_VALUE_LENGTH = 512;
const DOWNLOAD_SEARCH_KEY_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;

function getTemplateId(template: XuluxTemplate): string {
  return template.templateId ?? template.id;
}

function isAllowedSandboxHost(hostname: string): boolean {
  return ALLOWED_SANDBOX_HOST_SUFFIXES.some((suffix) =>
    hostname.endsWith(suffix),
  );
}

function findTemplate(
  templates: readonly XuluxTemplate[],
  id: string,
  versionId: string | undefined,
): XuluxTemplate | undefined {
  if (versionId) {
    const version = templates.find(
      (template) =>
        getTemplateId(template) === id && template.versionId === versionId,
    );
    if (version) return version;
  }

  return templates.find((template) => getTemplateId(template) === id);
}

export function resolveSandboxDownloadUrl({
  templates,
  templateId,
  versionId,
  downloadSearch,
}: {
  templates: readonly XuluxTemplate[];
  templateId: string;
  versionId: string | undefined;
  downloadSearch: string | undefined;
}): URL | null {
  const template = findTemplate(templates, templateId, versionId);
  if (!template?.sandboxBaseUrl) return null;

  let baseUrl: URL;
  try {
    baseUrl = new URL(template.sandboxBaseUrl);
  } catch {
    return null;
  }

  if (baseUrl.protocol !== "https:") return null;
  if (!isAllowedSandboxHost(baseUrl.hostname)) return null;

  const resolved = new URL(SANDBOX_DOWNLOAD_PATHNAME, baseUrl);

  if (downloadSearch) {
    if (downloadSearch.length > MAX_DOWNLOAD_SEARCH_LENGTH) return null;

    const sourceParams = new URLSearchParams(downloadSearch);
    for (const [key, value] of sourceParams) {
      if (!DOWNLOAD_SEARCH_KEY_PATTERN.test(key)) return null;
      if (value.length > MAX_DOWNLOAD_SEARCH_VALUE_LENGTH) return null;
      resolved.searchParams.append(key, value);
    }
  }

  if (versionId && !resolved.searchParams.has("v")) {
    resolved.searchParams.set("v", versionId);
  }

  return resolved;
}
