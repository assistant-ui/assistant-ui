import { promises as fs } from "node:fs";
import path from "node:path";

export async function readChartSource(slug: string): Promise<string> {
  const source = await fs.readFile(
    path.join(
      process.cwd(),
      "components",
      "diagrammatic",
      "demos",
      `${slug}.tsx`,
    ),
    "utf8",
  );
  return source.trimEnd();
}
