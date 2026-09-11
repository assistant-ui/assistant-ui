import {
  BASE_URL,
  DEFAULT_PLATFORM,
  PLATFORMS,
  type Platform,
} from "./constants";

export function isPlatform(
  value: string | null | undefined,
): value is Platform {
  return value != null && (PLATFORMS as readonly string[]).includes(value);
}

export function resolveDocsPlatform(
  value: string | null | undefined,
): Platform {
  return isPlatform(value) ? value : DEFAULT_PLATFORM;
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
