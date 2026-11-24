import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The URL of an appOS example's packed bundle, e.g. "/appos/with-article-assistant.<hash>.wbn".
 * scripts/build-appos-examples.mjs writes the names before `next dev` and
 * `next build`; undefined if it hasn't run.
 */
export function getAppOSExampleSrc(name: string): string | undefined {
  try {
    const manifest = JSON.parse(
      readFileSync(
        join(process.cwd(), "generated/appos-examples.json"),
        "utf8",
      ),
    ) as Record<string, string>;
    return manifest[name];
  } catch {
    return undefined;
  }
}
