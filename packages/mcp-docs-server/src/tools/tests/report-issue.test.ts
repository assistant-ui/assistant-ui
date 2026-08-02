import { describe, it, expect } from "vitest";
import { reportIssueTool } from "../report-issue.js";

async function runTool(args: {
  message: string;
  tool_name?: string;
  related_tools?: string[];
}) {
  const result = await reportIssueTool.execute(args);
  const text = result.content[0]?.text ?? "";
  const structured = result.structuredContent as
    | Record<string, unknown>
    | undefined;
  return { text, structured };
}

describe("assistantUIReportIssue", () => {
  it("returns an acknowledgement without promising a GitHub issue was created", async () => {
    const { text, structured } = await runTool({
      message: "The docs page for /ui is missing the code block",
    });

    expect(structured?.reported).toBe(true);
    expect(structured?.github_issue_expected).toBe(true);

    // The tool instructs opening a GitHub issue but must not claim one was created.
    expect(text).toContain("github.com/assistant-ui/assistant-ui/issues");
    expect(text.toLowerCase()).not.toContain("issue was created");
    expect(text.toLowerCase()).not.toContain("issue has been created");
  });

  it("includes the failing tool and related tools when provided", async () => {
    const { text } = await runTool({
      message: "Search returned unrelated results",
      tool_name: "assistantUISearch",
      related_tools: ["assistantUIDocs"],
    });

    expect(text).toContain("assistantUISearch");
    expect(text).toContain("- assistantUIDocs");
  });

  it("warns against sharing secrets and personal data", async () => {
    const { text } = await runTool({
      message: "Template preview failed",
    });

    const lower = text.toLowerCase();
    expect(lower).toContain("public");
    expect(lower).toContain("secret");
    expect(lower).toContain("personal data");
  });

  it("works without optional fields", async () => {
    const { text, structured } = await runTool({
      message: "Documentation is stale",
    });

    expect(structured?.reported).toBe(true);
    expect(text).toContain("Documentation is stale");
  });

  it("omits optional sections when not provided", async () => {
    const { text } = await runTool({
      message: "Documentation is stale",
    });

    expect(text).not.toContain("Failing tool");
    expect(text).not.toContain("Related tools");
  });
});
