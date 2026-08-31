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

  it("rewrites a legacy import when only the elements layout exists", () => {
    write(
      "app/page.tsx",
      'import { Thread } from "@/components/assistant-ui/thread";\n' +
        'import { ThreadList } from "@/components/assistant-ui/thread-list";\n',
    );
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");
    write("components/assistant-ui/elements/thread-list.aui.tsx", "export {};");

    reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n' +
        'import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";\n',
    );
  });

  it("supports the src/ project layout", () => {
    write(
      "src/routes/index.tsx",
      'import { Thread } from "@/components/assistant-ui/thread";\n',
    );
    write("src/components/assistant-ui/elements/thread.aui.tsx", "export {};");

    reconcileAssistantUIImportLayout(projectDir);

    expect(read("src/routes/index.tsx")).toBe(
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n',
    );
  });

  it("leaves imports alone when the legacy file exists", () => {
    const source =
      'import { Thread } from "@/components/assistant-ui/thread";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/thread.tsx", "export {};");
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });

  it("leaves imports alone when neither layout has the file", () => {
    const source =
      'import { Custom } from "@/components/assistant-ui/custom-part";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });

  it("leaves elements imports untouched", () => {
    const source =
      'import { Thread } from "@/components/assistant-ui/elements/thread.aui";\n';
    write("app/page.tsx", source);
    write("components/assistant-ui/elements/thread.aui.tsx", "export {};");

    reconcileAssistantUIImportLayout(projectDir);

    expect(read("app/page.tsx")).toBe(source);
  });
});
