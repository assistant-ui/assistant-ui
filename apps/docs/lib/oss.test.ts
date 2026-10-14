import { describe, expect, it } from "vitest";
import { OSS_PROJECTS, ossRepoUrl } from "./oss";

describe("OSS projects", () => {
  it("includes react-o11y with its site, package, and source links", () => {
    const project = OSS_PROJECTS.find((entry) => entry.id === "react-o11y");
    expect(project).toMatchObject({
      name: "react-o11y",
      site: "/react-o11y",
      npm: "@assistant-ui/react-o11y",
      path: "packages/react-o11y",
      category: "primitives",
    });
    expect(ossRepoUrl(project!)).toBe(
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-o11y",
    );
  });
});
