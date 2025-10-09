import { z } from "zod";

export const weatherTool = {
  description: "Get current weather information for a specific location",
  parameters: z.object({
    location: z.string().describe("The city and state/country, e.g., 'San Francisco, CA' or 'London, UK'"),
    units: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature units (default: celsius)"),
  }),
  execute: async ({ location, units = "celsius" }) => {
    // Mock weather data for demonstration
    // In a real implementation, you would integrate with a weather API
    const mockWeatherData = {
      "San Francisco, CA": {
        temperature: 18,
        condition: "Foggy",
        humidity: 75,
        windSpeed: 12,
        units: "celsius"
      },
      "New York, NY": {
        temperature: 22,
        condition: "Partly Cloudy",
        humidity: 60,
        windSpeed: 8,
        units: "celsius"
      },
      "London, UK": {
        temperature: 15,
        condition: "Rainy",
        humidity: 85,
        windSpeed: 15,
        units: "celsius"
      }
    };

    // Find matching location or return default
    const weatherData = mockWeatherData[location as keyof typeof mockWeatherData] || {
      temperature: 20,
      condition: "Clear",
      humidity: 50,
      windSpeed: 10,
      units
    };

    return {
      location,
      ...weatherData,
      lastUpdated: new Date().toISOString()
    };
  }
};