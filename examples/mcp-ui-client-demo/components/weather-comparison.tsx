"use client";

import { WeatherCard } from "./weather-card";

interface WeatherData {
  location: string;
  temperature: number;
  unit: "celsius" | "fahrenheit";
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

interface ComparisonData {
  location1: WeatherData;
  location2: WeatherData;
}

export function WeatherComparison({ data }: { data: ComparisonData }) {
  return (
    <div className="my-4 flex flex-col gap-4 md:flex-row">
      <WeatherCard data={data.location1} />
      <WeatherCard data={data.location2} />
    </div>
  );
}
