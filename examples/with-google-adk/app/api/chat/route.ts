import { createAdkApiRoute } from "@assistant-ui/react-google-adk/server";
import { InMemoryRunner, LlmAgent, FunctionTool } from "@google/adk";
import { z } from "zod";

// Refuses chat requests that a browser sends from another site, so a page the
// visitor opens cannot spend this app's model key. This is not authentication:
// add your own before you deploy the route publicly.
function isAllowedRequestContext(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = req.headers.get("origin");
  if (origin === null) return true;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

const weatherTool = new FunctionTool({
  name: "get_weather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The city name"),
  }),
  execute: async ({ city }) => {
    return {
      city,
      temperature: Math.round(15 + Math.random() * 20),
      condition: ["sunny", "cloudy", "rainy", "snowy"][
        Math.floor(Math.random() * 4)
      ],
    };
  },
});

const agent = new LlmAgent({
  name: "assistant",
  model: "gemini-3.8-flash",
  instruction:
    "You are a helpful assistant. You can check the weather for any city using the get_weather tool.",
  tools: [weatherTool],
});

const runner = new InMemoryRunner({ agent, appName: "adk-example" });

const handler = createAdkApiRoute({
  runner,
  userId: "user_1",
  sessionId: (_req, clientSessionId) => {
    if (!clientSessionId) throw new Error("Missing ADK session ID");
    return clientSessionId;
  },
});

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  return handler(req);
}
