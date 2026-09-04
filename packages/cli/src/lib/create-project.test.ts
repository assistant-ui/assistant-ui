import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { reconcileAssistantUIImportLayout } from "./create-project";

describe("reconcileAssistantUIImportLayout", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-cli-test-"));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  const write = (file: string, content: string) => {
    const fullPath = path.join(projectDir, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  };

  const read = (file: string) =>
    fs.readFileSync(path.join(projectDir, file), "utf8");

  it("rewrites a legacy import when only the elements layout exists", async () => {
    write(
      "app/page.tsx",
      'import { Thread } from "@/components/assistant-ui/thread";\n' +
        'import { ThreadList } from "@/components/assistant-ui/thread-list";\n',
    );
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");
    write("components/assistant-ui/elements/thread-list.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n' +
        'import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";\n',
    );
  });

  it("rewrites module declarations without changing import-like source text", async () => {
    write(
      "app/page.tsx",
      'import { Thread } from "@/components/assistant-ui/thread";\n' +
        'export { ThreadList } from "@/components/assistant-ui/thread-list";\n' +
        "const example = 'from \"@/components/assistant-ui/thread\"';\n" +
        '// from "@/components/assistant-ui/thread-list"\n',
    );
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");
    write("components/assistant-ui/elements/thread-list.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n' +
        'export { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";\n' +
        "const example = 'from \"@/components/assistant-ui/thread\"';\n" +
        '// from "@/components/assistant-ui/thread-list"\n',
    );
  });

  it("rewrites a legacy import to a bare elements file without the .aui segment", async () => {
    write(
      "app/MyThread.tsx",
      'import { MarkdownText } from "@/components/assistant-ui/markdown-text";\n' +
        'import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";\n',
    );
    write("components/assistant-ui/elements/markdown-text.tsx", "export {};");
    write(
      "components/assistant-ui/elements/tooltip-icon-button.tsx",
      "export {};",
    );

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/MyThread.tsx")).toBe(
      'import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";\n' +
        'import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";\n',
    );
  });

  it("prefers the .aui variant when both variants share a basename", async () => {
    write(
      "app/page.tsx",
      'import { Reasoning } from "@/components/assistant-ui/reasoning";\n',
    );
    write("components/assistant-ui/elements/reasoning.tsx", "export {};");
    write("components/assistant-ui/elements/reasoning.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(
      'import { Reasoning } from "@/components/assistant-ui/elements/reasoning.aui";\n',
    );
  });

  it("supports the src/ project layout", async () => {
    write(
      "src/routes/index.tsx",
      'import { Thread } from "@/components/assistant-ui/thread";\n',
    );
    write("src/components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("src/routes/index.tsx")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n',
    );
  });

  it("leaves imports alone when the legacy file exists", async () => {
    const source =
      'import { Thread } from "@/components/assistant-ui/thread";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/thread.tsx", "export {};");
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });

  it("leaves imports alone when neither layout has the file", async () => {
    const source =
      'import { Custom } from "@/components/assistant-ui/custom-part";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });

  it("leaves elements imports untouched", async () => {
    const source =
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });

  it("parses TypeScript files with generic arrow functions", async () => {
    write(
      "app/helpers.ts",
      'import { Thread } from "@/components/assistant-ui/thread";\n' +
        "export const identity = <T>(value: T) => value;\n",
    );
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/helpers.ts")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n' +
        "export const identity = <T>(value: T) => value;\n",
    );
  });

  it("leaves unparseable source files untouched", async () => {
    const source =
      'import { Thread } from "@/components/assistant-ui/thread";\nconst broken = ;\n';
    write("app/broken.ts", source);
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    await expect(
      reconcileAssistantUIImportLayout(projectDir),
    ).resolves.toBeUndefined();
    expect(read("app/broken.ts")).toBe(source);
  });
});
