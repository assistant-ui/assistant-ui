import type {
  RegistryFlavor,
  ResolvedFile,
} from "@/components/pages/docs/fumadocs/install/component-source";

const REGISTRY_FILES_URL = "https://r.assistant-ui.com/files";

export type LinkedFile = ResolvedFile & { sourceUrl: string };

export function registryFileUrl(
  file: ResolvedFile,
  flavor: RegistryFlavor,
): string {
  const filePath = file.path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const itemPath = file.name
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${REGISTRY_FILES_URL}/${flavor}/${itemPath}/${filePath}`;
}

export function buildDownloadCommand(files: LinkedFile[]): string {
  const args = files
    .map((file) => `  -o ${file.path} ${file.sourceUrl}`)
    .join(" \\\n");
  return `curl -sSL --create-dirs \\\n${args}`;
}
