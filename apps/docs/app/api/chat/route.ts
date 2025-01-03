import { createOpenAI } from "@ai-sdk/openai";
import { getEdgeRuntimeResponse } from "@assistant-ui/react/edge";

const openai = createOpenAI({
  baseURL: process.env["OPENAI_BASE_URL"] as string,
});

export const runtime = "edge";

export const POST = async (request: Request) => {
  const requestData = await request.json();

  return getEdgeRuntimeResponse({
    options: {
      model: openai("gpt-4o-mini"),
    },
    requestData,
    abortSignal: request.signal,
  });
};
