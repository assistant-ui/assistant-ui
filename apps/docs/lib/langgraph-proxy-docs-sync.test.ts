import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const read = (relative: string) =>
  readFileSync(path.join(ROOT, relative), "utf8").replace(/\r\n/g, "\n");

const docsProxySnippet = () => {
  const doc = read("apps/docs/content/docs/runtimes/langgraph/quickstart.mdx");
  const open = '```ts title="@/app/api/[..._path]/route.ts"\n';
  const start = doc.indexOf(open);
  if (start === -1) throw new Error("proxy snippet not found");
  const end = doc.indexOf("\n```", start + open.length);
  return doc.slice(start + open.length, end);
};

describe("langgraph quickstart mirrors the example proxy route", () => {
  it("shows the example's route.ts verbatim", () => {
    expect(docsProxySnippet()).toBe(
      read("examples/with-langgraph/app/api/[..._path]/route.ts").trimEnd(),
    );
  });
});
