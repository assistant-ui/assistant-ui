import { expect, it } from "vitest";
import { GET } from "./route";

it("returns cache validators and the homepage markdown", async () => {
  const response = await GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-cache, must-revalidate");
  expect(response.headers.get("Content-Type")).toBe(
    "text/markdown; charset=utf-8",
  );
  expect(response.headers.get("ETag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");

  const body = await response.text();
  expect(body).toMatch(/^# assistant-ui · The frontend library for AI agents\n\n> For AI agents:/);
  expect(body).toContain("[llms.txt](/llms.txt)");
  expect(body).toContain("## @assistant-ui/react");
  expect(body).toContain("### Mastra");
  expect(body).toContain("process.env.NEXT_PUBLIC_MASTRA_URL");
  expect(body).toContain("(/docs/integrations/frameworks/mastra/separate-server)");
});

it.each(["LangGraph", "Custom"])(
  "labels the %s setup code as an abridged excerpt",
  async (label) => {
    const body = await (await GET()).text();
    const section = body.split(`### ${label}\n\n`)[1]?.split("\n\n### ")[0];

    expect(section).toMatch(/\n\nAbridged excerpt\..*\n\n```tsx\n/);
  },
);
