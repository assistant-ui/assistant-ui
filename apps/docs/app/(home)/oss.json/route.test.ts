import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /oss.json", () => {
  it("preserves absolute destination URLs for every project", async () => {
    const response = await GET();
    const body = await response.json();
    const projects = new Map(
      body.projects.map((project: { id: string }) => [project.id, project]),
    );

    expect(projects.get("assistant-ui")).toMatchObject({
      url: "https://www.assistant-ui.com/docs",
      docs: "https://www.assistant-ui.com/docs",
      repoUrl: "https://github.com/assistant-ui/assistant-ui",
      npmUrl: "https://www.npmjs.com/package/@assistant-ui/react",
    });
    expect(projects.get("assistant-stream")).toMatchObject({
      repoUrl:
        "https://github.com/assistant-ui/assistant-ui/tree/main/packages/assistant-stream",
      npmUrl: "https://www.npmjs.com/package/assistant-stream",
      pypiUrl: "https://pypi.org/project/assistant-stream/",
    });
    expect(projects.get("skills")).toMatchObject({
      url: "https://github.com/assistant-ui/skills",
      repoUrl: "https://github.com/assistant-ui/skills",
    });
  });
});
