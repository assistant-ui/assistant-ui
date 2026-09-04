import type { RegistryFlavor } from "@/components/pages/docs/fumadocs/install/component-source";

export type PackagedFileRef = {
  name: string;
  path: string;
};

// The registry serves each item's packaged file contents under files/, so the
// copy path ships exactly what `shadcn add` would install — raw GitHub sources
// differ for the radix flavor, whose shipped imports are rewritten. Segments
// (including item names, which may contain slashes) are percent-encoded so
// bracketed route paths ([streamId]) stay inside RFC 3986 and outside curl's
// URL globbing.
const encodeUrlPath = (value: string) =>
  value.split("/").map(encodeURIComponent).join("/");

const REGISTRY_ORIGIN = "https://r.assistant-ui.com";

export const packagedFileUrl = (
  flavor: RegistryFlavor,
  file: PackagedFileRef,
) => {
  const root = flavor === "base" ? `${REGISTRY_ORIGIN}/base` : REGISTRY_ORIGIN;
  return `${root}/files/${encodeUrlPath(file.name)}/${encodeUrlPath(file.path)}`;
};

export function buildDownloadCommand(
  files: PackagedFileRef[],
  flavor: RegistryFlavor,
): string {
  // The -o path is quoted: bracketed route segments ([streamId]) are zsh
  // globs, and an unmatched glob aborts the whole command under the default
  // nomatch option.
  const args = files
    .map((file) => `  -o '${file.path}' ${packagedFileUrl(flavor, file)}`)
    .join(" \\\n");
  return `curl -fsSL --create-dirs \\\n${args}`;
}
