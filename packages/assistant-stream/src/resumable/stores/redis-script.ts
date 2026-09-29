import { createHash } from "node:crypto";

export function redisScriptSha(script: string): string {
  return createHash("sha1").update(script).digest("hex");
}

export async function runCachedRedisScript<T>(
  runSha: () => Promise<T>,
  runSource: () => Promise<T>,
): Promise<T> {
  try {
    return await runSha();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("NOSCRIPT")) {
      throw error;
    }
    return runSource();
  }
}
