"use client";

import { WeatherCard, WeatherData } from "./weather-card";

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
