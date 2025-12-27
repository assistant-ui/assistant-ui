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
    <div className="flex flex-col md:flex-row gap-4 my-4">
      <WeatherCard data={data.location1} />
      <WeatherCard data={data.location2} />
    </div>
  );
}
