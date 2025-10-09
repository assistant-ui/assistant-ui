import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weatherTool";

// Create OpenAI model
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: `You are a helpful weather assistant that provides accurate weather information and climate-related advice. You help people with:

1. Current weather conditions and forecasts
2. Weather alerts and safety information
3. Climate patterns and seasonal trends
4. Travel weather recommendations

Always use the weather tool to get current, accurate weather information. Provide helpful context about how the weather might impact daily activities, travel plans, or outdoor events.`,

  model: openai("gpt-4o-mini"),
  tools: {
    weatherTool,
  },
  memory: true,
});