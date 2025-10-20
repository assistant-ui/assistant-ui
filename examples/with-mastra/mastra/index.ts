import { Mastra } from "@mastra/core";
import { chefAgent } from "./agents/chefAgent";
import { weatherAgent } from "./agents/weatherAgent";

export const mastra = new Mastra({
  agents: {
    chefAgent,
    weatherAgent,
  },
});
