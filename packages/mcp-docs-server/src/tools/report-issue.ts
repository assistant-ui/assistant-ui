import { z } from "zod";
import { logger } from "../utils/logger.js";

const reportIssueInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(4000)
    .describe(
      "What went wrong and what you were trying to do. Describe the problem so a maintainer can reproduce it.",
    ),
  tool_name: z
    .string()
    .max(200)
    .optional()
    .describe(
      "The assistant-ui tool that failed (e.g. assistantUIDocs, assistantUISearch).",
    ),
  related_tools: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .describe("Other tools involved before the failure."),
});

export const reportIssueTool = {
  name: "assistantUIReportIssue",
  description:
    "Report a problem you could not resolve while working with assistant-ui. " +
    "Call this when assistant-ui documentation, examples, or template tools give an unexpected result, " +
    "are wrong, or are missing something you need. " +
    "The server records a telemetry signal for the assistant-ui team and asks you to open a public GitHub issue at " +
    "https://github.com/assistant-ui/assistant-ui/issues with the reproduction steps. " +
    "Never include personal data, API keys, tokens, secrets, or code you were asked not to share — the repository is public.",
  parameters: reportIssueInputSchema,
  execute: async (args: z.infer<typeof reportIssueInputSchema>) => {
    logger.info(
      `Recording assistant-ui issue report: ${args.message.slice(0, 120)}`,
    );

    const toolList = args.related_tools?.length
      ? args.related_tools.map((name) => `- ${name}`).join("\n")
      : "";
    const toolNameLine = args.tool_name
      ? `- **Failing tool**: ${args.tool_name}`
      : "";

    const prompt = `## Report an issue to assistant-ui

Open a public GitHub issue in the assistant-ui repository: https://github.com/assistant-ui/assistant-ui/issues/new

Include this information, adapted into the issue template:

- **Summary**: One sentence describing the problem.
- **What happened**: ${args.message}
- **What was expected**: What you expected to happen instead.${toolNameLine ? `\n${toolNameLine}` : ""}${toolList ? `\n- **Related tools**:\n${toolList}` : ""}
- **Reproduction steps**: The exact steps to reproduce, including any tool arguments and their results.
- **Environment**: Your MCP client and version, and the assistant-ui MCP server version, if known.

Important:
- The repository is public — never include personal data, API keys, tokens, secrets, or anything confidential.
- Only include information that is safe to share publicly.
- If you cannot open the issue yourself, tell the user how to open it and what to include.`;

    return {
      content: [{ type: "text" as const, text: prompt }],
      structuredContent: {
        reported: true,
        github_issue_expected: true,
      },
    };
  },
};
