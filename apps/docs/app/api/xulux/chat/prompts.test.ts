import { createHash } from "node:crypto";
import { APP_BUILDER_SYSTEM_PROMPT, LEARN_SYSTEM_PROMPT } from "./prompts";

describe("Xulux agent prompts", () => {
  it("preserves the App Builder prompt byte-for-byte", () => {
    expect(APP_BUILDER_SYSTEM_PROMPT).toHaveLength(10_716);
    expect(
      createHash("sha256").update(APP_BUILDER_SYSTEM_PROMPT).digest("hex"),
    ).toBe("51b64cf78f03d799439411f17abf8f182f0766de67f0f71e679467a17748665f");
  });

  it("gives Learn shared assistant-ui guidance without template workflow", () => {
    expect(LEARN_SYSTEM_PROMPT).toContain("<about_assistant_ui>");
    expect(LEARN_SYSTEM_PROMPT).toContain("getNextCourseStep");
    expect(LEARN_SYSTEM_PROMPT).toContain("listDocs");
    expect(LEARN_SYSTEM_PROMPT).toContain("inspectSourceMap");
    expect(LEARN_SYSTEM_PROMPT).toContain("scope=course");
    expect(LEARN_SYSTEM_PROMPT).toContain("/course");
    expect(LEARN_SYSTEM_PROMPT).toContain("scope=repo");
    expect(LEARN_SYSTEM_PROMPT).toContain("xulux-file:course:app/page.tsx");
    expect(LEARN_SYSTEM_PROMPT).toContain(
      "Do not use this token for /repo files",
    );
    expect(LEARN_SYSTEM_PROMPT).not.toContain("openTemplatePreview");
    expect(LEARN_SYSTEM_PROMPT).not.toContain("2–4 useful sentences");
  });
});
