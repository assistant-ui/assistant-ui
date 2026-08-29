const REPO = "assistant-ui/assistant-ui";
const GITHUB_BLOB = `https://github.com/${REPO}/blob/main`;
const GITHUB_RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const UI_SOURCE_PREFIX = "../../packages/ui/src/";
const UI_REPO_PREFIX = "packages/ui/src/";
const REGISTRY_REPO_PREFIX = "apps/registry/";

export function githubSourcePath(sourcePath: string): string {
  if (sourcePath.startsWith(UI_SOURCE_PREFIX)) {
    return `${UI_REPO_PREFIX}${sourcePath.slice(UI_SOURCE_PREFIX.length)}`;
  }

  return `${REGISTRY_REPO_PREFIX}${sourcePath}`;
}

export function githubBlobUrl(sourcePath: string): string {
  return `${GITHUB_BLOB}/${githubSourcePath(sourcePath)}`;
}

export function githubRawUrl(sourcePath: string): string {
  return `${GITHUB_RAW}/${githubSourcePath(sourcePath)}`;
}
