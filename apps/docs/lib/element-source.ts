import { cacheLife } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";

export async function readElementSource(file: string): Promise<string> {
  "use cache";
  cacheLife("max");
  // Literal roots bound Turbopack's filesystem tracing to the source directories.
  try {
    const source = await fs.readFile(
      path.join(
        process.cwd(),
        "../../packages/ui/src/components/react/assistant-ui/elements",
        file,
      ),
      "utf8",
    );
    return source.trimEnd();
  } catch {
    try {
      const source = await fs.readFile(
        path.join(process.cwd(), "components/demo/elements", file),
        "utf8",
      );
      return source.trimEnd();
    } catch (cause) {
      throw new Error(`Element source not found: ${file}`, { cause });
    }
  }
}

export async function highlightElementSource(
  code: string,
  lang: "tsx" | "json" = "tsx",
): Promise<string> {
  "use cache";
  cacheLife("max");
  return codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light-dark()",
  });
}
