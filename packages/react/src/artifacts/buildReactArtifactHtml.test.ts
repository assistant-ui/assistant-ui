import { describe, expect, it } from "vitest";
import { buildReactArtifactHtml } from "./buildReactArtifactHtml";
import { claudeParityImportMap, minimalImportMap } from "./defaultImportMap";

describe("buildReactArtifactHtml", () => {
  it("embeds the source, babel, the default import map, and the status/size protocol", () => {
    const html = buildReactArtifactHtml("export default () => null");
    expect(html).toContain("export default () => null");
    expect(html).toContain("@babel/standalone");
    expect(html).toContain(minimalImportMap.react);
    expect(html).toContain("aui-artifact:status");
    expect(html).toContain("aui-artifact:size");
  });

  it("escapes </script in the source so the stash block isn't closed early", () => {
    const html = buildReactArtifactHtml('const x = "</script>";');
    expect(html).toContain('const x = "<\\/script>";');
  });

  it("honors a custom import map and disabling tailwind", () => {
    const html = buildReactArtifactHtml("export default () => null", {
      importMap: claudeParityImportMap,
      tailwind: false,
    });
    expect(html).toContain(claudeParityImportMap["lucide-react"]!);
    expect(html).not.toContain("cdn.tailwindcss.com");
  });
});
