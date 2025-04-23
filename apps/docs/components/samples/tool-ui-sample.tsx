"use client";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Sun, Moon, Loader2 } from "lucide-react";
import { Thread } from "../assistant-ui/thread";
import { SampleFrame } from "./sample-frame";
import { useState, useEffect } from "react";

type WebSearchArgs = {
  query: string;
};

type WebSearchResult = {
  title: string;
  description: string;
  url: string;
};

// Define a separate component for rendering
const WebSearchDisplay = ({ args }: { args: WebSearchArgs }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isDay, setIsDay] = useState(true);
  const [temp, setTemp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&hourly=temperature_2m&models=jma_seamless",
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Simulate a 2-second delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const data = await response.json();

        if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
          // Find the index for the current hour (closest past hour)
          const now = new Date();
          // The API returns times in GMT (UTC). Convert current time to UTC string for comparison.
          const nowUtcString = now.toISOString().substring(0, 14) + "00"; // Format like YYYY-MM-DDTHH:00

          let currentHourIndex = data.hourly.time.findIndex(
            (t: string) => t >= nowUtcString,
          );
          // If not found or it's the first hour, use index 0. If found, use the previous index if not the first.
          currentHourIndex =
            currentHourIndex > 0
              ? currentHourIndex - 1
              : currentHourIndex === -1
                ? data.hourly.time.length - 1
                : 0;

          const currentTemp = data.hourly.temperature_2m[currentHourIndex];
          setTemp(currentTemp);

          // Determine if it's day or night in Tokyo (JST = UTC+9)
          const currentHourTokyo = now.getUTCHours() + 9;
          setIsDay(currentHourTokyo >= 6 && currentHourTokyo < 18);
        } else {
          throw new Error("Invalid API response format");
        }
      } catch (e) {
        console.error("Failed to fetch weather:", e);
        setError(e instanceof Error ? e.message : "Failed to fetch weather");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, []); // Fetch only once on mount

  return (
    <div className="bg-muted/50 hover:bg-muted/70 flex min-h-[68px] items-center gap-3 rounded-md border-2 border-blue-400 p-3 transition-all duration-300 hover:border-blue-500 hover:shadow-md">
      {isLoading ? (
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      ) : error ? (
        <span className="text-red-500">⚠️</span> // Error icon
      ) : isDay ? (
        <Sun className="h-5 w-5 flex-shrink-0 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 flex-shrink-0 text-blue-300" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {isLoading
            ? "Searching the web..."
            : error
              ? "Error Fetching Weather"
              : "Weather in Tokyo"}
        </span>
        <span className="text-muted-foreground text-sm">
          {isLoading
            ? args.query
            : error
              ? error
              : temp !== null
                ? `${temp}°C`
                : "N/A"}
        </span>
      </div>
    </div>
  );
};

export const WebSearchToolUI = makeAssistantToolUI<
  WebSearchArgs,
  WebSearchResult
>({
  toolName: "web_search",
  render: ({ args }) => {
    // Use the dedicated component for rendering
    return <WebSearchDisplay args={args} />;
  },
});

export const ToolUISample = () => {
  return (
    <SampleFrame
      sampleText="Sample Tool UI"
      description="Ask 'what is the weather in Tokyo?'"
    >
      <Thread />
      <WebSearchToolUI />
    </SampleFrame>
  );
};
