import type { ToolCallMessagePartComponent } from "@assistant-ui/react";

type WeatherArgs = { city: string };

type Weather = {
  city: string;
  temperatureC: number;
  condition: string;
  humidity: number;
};

export const WeatherCard: ToolCallMessagePartComponent<
  WeatherArgs,
  Weather
> = ({ args, result, status }) => {
  if (status.type === "incomplete") {
    return <p className="text-destructive">Couldn't get the weather.</p>;
  }
  if (result === undefined) {
    return (
      <p className="text-muted-foreground">
        Checking the weather in {args.city ?? "…"}
      </p>
    );
  }
  return (
    <div className="bg-card my-2 w-64 rounded-xl border p-4">
      <p className="text-muted-foreground text-sm">{result.city}</p>
      <p className="text-4xl font-semibold">{result.temperatureC}°C</p>
      <p>{result.condition}</p>
      <p className="text-muted-foreground text-sm">
        Humidity {result.humidity}%
      </p>
    </div>
  );
};
