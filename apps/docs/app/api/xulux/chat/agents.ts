import type { FrontendTools } from "@assistant-ui/react-ai-sdk";
import type { ToolSet } from "ai";
import { NextResponse } from "next/server";
import { parseLearnContext } from "@/lib/xulux/learn/context";
import { APP_BUILDER_SYSTEM_PROMPT, LEARN_SYSTEM_PROMPT } from "./prompts";
import { createAppBuilderTools, createLearnAgentTools } from "./tools";

type PrepareAgentToolsOptions = {
  body: Record<string, unknown>;
  clientTools: FrontendTools;
  routeUrl: string;
};

export type XuluxAgentDefinition = {
  systemPrompt: string;
  maxSteps: number;
  activeToolsAfterFirstStep?: string[];
  prepareTools: (options: PrepareAgentToolsOptions) => ToolSet | NextResponse;
};

export const appBuilderAgent: XuluxAgentDefinition = {
  systemPrompt: APP_BUILDER_SYSTEM_PROMPT,
  maxSteps: 50,
  prepareTools: ({ clientTools, routeUrl }) =>
    createAppBuilderTools({ clientTools, routeUrl }),
};

export const learnAgent: XuluxAgentDefinition = {
  systemPrompt: LEARN_SYSTEM_PROMPT,
  maxSteps: 50,
  activeToolsAfterFirstStep: [
    "inspectSourceMap",
    "readSourceMapFile",
    "listDocs",
    "readDoc",
  ],
  prepareTools: ({ body, routeUrl }) => {
    const learnContext = parseLearnContext(body.learnContext);
    if (!learnContext) {
      return NextResponse.json(
        { error: "Invalid Learn context." },
        { status: 400 },
      );
    }
    return createLearnAgentTools({ routeUrl, learnContext });
  },
};
