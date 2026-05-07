import { createAdkApiRoute } from "@assistant-ui/react-google-adk/server";
import { InMemoryRunner, LlmAgent, FunctionTool } from "@google/adk";
import { z } from "zod";

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
  model: "gemini-2.5-flash",
  instruction:
    "You are a helpful assistant. You can check the weather for any city using the get_weather tool.",
  tools: [weatherTool],
});

const runner = new InMemoryRunner({ agent, appName: "adk-example" });

const sessions = new Map<string, string>();

export const POST = createAdkApiRoute({
  runner,
  userId: "user_1",
  sessionId: async () => {
    const userId = "user_1";
    let sessionId = sessions.get(userId);
    if (!sessionId) {
      const session = await runner.sessionService.createSession({
        appName: "adk-example",
        userId,
      });
      sessionId = session.id;
      sessions.set(userId, sessionId);
    }
    return sessionId;
  },
});
