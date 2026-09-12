import type * as PageTree from "fumadocs-core/page-tree";
import {
  BASE_URL,
  DEFAULT_PLATFORM,
  PLATFORMS,
  SURFACES,
  type Platform,
  type Surface,
} from "./constants";

export function isPlatform(
  value: string | null | undefined,
): value is Platform {
  return value != null && (PLATFORMS as readonly string[]).includes(value);
}

export function isSurface(value: string): value is Surface {
  return (SURFACES as readonly string[]).includes(value);
}

export const DOCS_PLATFORM_STORAGE_KEY = "assistant-ui::docs:platform";
export const DOCS_PLATFORM_URL_PARAM = "platform";

export function isVisibleForPlatform(
  platforms: readonly string[] | undefined,
  active: Platform,
): boolean {
  if (!platforms || platforms.length === 0) return true;
  return platforms.includes(active);
}

export function resolveDocsPlatform(
  value: string | null | undefined,
): Platform {
  return isPlatform(value) ? value : DEFAULT_PLATFORM;
}

export const PLATFORM_ENTRY_PATHS: Record<Platform, string> = {
  react: "/docs/installation",
  rn: "/docs/react-native",
  ink: "/docs/ink",
  tap: "/docs/tap",
  cloud: "/docs/cloud",
};

export const PLATFORM_QUICKSTART_COMMANDS: Record<Surface, string> = {
  react: "npx assistant-ui@latest create",
  rn: "npx assistant-ui@latest create --example with-expo",
  ink: "npx assistant-ui@latest create --ink",
};

// Surfaces whose folders mirror each other's page slugs, so a page can be
// swapped for its sibling on another surface.
export const MIRRORED_SURFACE_ROOTS: Partial<Record<Surface, string>> = {
  rn: PLATFORM_ENTRY_PATHS.rn,
  ink: PLATFORM_ENTRY_PATHS.ink,
};

function containsUrl(node: PageTree.Node, url: string): boolean {
  if (node.type === "page") return node.url === url;
  if (node.type === "separator") return false;
  return (
    node.index?.url === url ||
    node.children.some((child) => containsUrl(child, url))
  );
}

export function getPagePlatform(tree: PageTree.Root, url: string): Platform {
  for (const section of tree.children) {
    if (section.type !== "folder" || !containsUrl(section, url)) continue;
    const platforms = (section as { platforms?: readonly string[] }).platforms;
    const only = platforms?.length === 1 ? platforms[0] : undefined;
    return isPlatform(only) ? only : DEFAULT_PLATFORM;
  }
  return DEFAULT_PLATFORM;
}

export function getPlatformMarkdownUrl(
  markdownUrl: string,
  platform: Platform,
): string {
  const url = new URL(markdownUrl, BASE_URL);

  if (platform === DEFAULT_PLATFORM) {
    url.searchParams.delete("platform");
  } else {
    url.searchParams.set("platform", platform);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
