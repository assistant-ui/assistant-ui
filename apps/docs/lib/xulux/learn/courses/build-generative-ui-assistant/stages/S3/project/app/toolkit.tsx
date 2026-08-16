"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

const locations = {
  "san francisco": {
    name: "San Francisco",
    country: "United States",
    latitude: 37.7749,
    longitude: -122.4194,
    temperature: 16,
    condition: "Partly cloudy",
    windSpeed: 18,
  },
  singapore: {
    name: "Singapore",
    country: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    temperature: 29,
    condition: "Light rain",
    windSpeed: 11,
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    temperature: 22,
    condition: "Clear",
    windSpeed: 9,
  },
  london: {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    temperature: 13,
    condition: "Overcast",
    windSpeed: 21,
  },
} as const;

function findLocation(query: string) {
  const normalized = query.trim().toLowerCase();
  return Object.values(locations).find(
    ({ name }) => name.toLowerCase() === normalized,
  );
}

export default defineToolkit({
  geocode_location: {
    description:
      "Resolve San Francisco, Singapore, Tokyo, or London to coordinates before calling get_weather.",
    parameters: z.object({
      query: z.string().describe("A supported city name"),
    }),
    execute: async ({ query }) => {
      const location = findLocation(query);
      if (!location) {
        return { success: false as const, error: `No fixture for ${query}` };
      }
      return {
        success: true as const,
        result: {
          name: location.name,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      };
    },
  },
  get_weather: {
    description:
      "Return deterministic current weather after geocode_location provides coordinates.",
    parameters: z.object({
      location: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    execute: async ({ location, latitude, longitude }) => {
      const fixture = findLocation(location);
      if (!fixture) {
        return { success: false as const, error: `No fixture for ${location}` };
      }
      return {
        success: true as const,
        id: `course-weather-${fixture.name.toLowerCase().replaceAll(" ", "-")}`,
        location: fixture.name,
        coordinates: { latitude, longitude },
        widget: {
          units: { temperature: "celsius" as const, windSpeed: "km/h" },
          current: {
            temperature: fixture.temperature,
            conditionCode: fixture.condition,
            windSpeed: fixture.windSpeed,
          },
        },
      };
    },
  },
});
