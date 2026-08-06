import { homedir } from "node:os";
import { join } from "node:path";

export type CachePathEnv = {
  HOME?: string;
  XDG_CACHE_HOME?: string;
  LOCALAPPDATA?: string;
};

/**
 * Platform certificate cache root:
 * Linux:   ~/.cache/assistant-ui/course/certificates/
 * macOS:   ~/Library/Caches/assistant-ui/course/certificates/
 * Windows: %LOCALAPPDATA%\assistant-ui\course\certificates\
 */
export function getCertificatesDirectory(
  platform: NodeJS.Platform = process.platform,
  env: CachePathEnv = process.env,
  home: string = homedir(),
): string {
  if (platform === "darwin") {
    return join(home, "Library", "Caches", "assistant-ui", "course", "certificates");
  }

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA ?? join(home, "AppData", "Local");
    return join(localAppData, "assistant-ui", "course", "certificates");
  }

  const cacheHome = env.XDG_CACHE_HOME ?? join(env.HOME ?? home, ".cache");
  return join(cacheHome, "assistant-ui", "course", "certificates");
}
