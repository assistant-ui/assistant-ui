import {
  defineToolkit,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  CloudIcon,
  CloudRainIcon,
  CloudSunIcon,
  SunIcon,
  WindIcon,
  type LucideIcon,
} from "lucide-react";

type WeatherArgs = { city: string };
type WeatherResult = { temperature: number; condition: string };

const ICONS: Record<string, LucideIcon> = {
  Sunny: SunIcon,
  "Partly cloudy": CloudSunIcon,
  Cloudy: CloudIcon,
  Rain: CloudRainIcon,
  Windy: WindIcon,
};

const WeatherCard: ToolCallMessagePartComponent<WeatherArgs, WeatherResult> = ({
  args,
  result,
  status,
}) => {
  if (status.type === "running") {
    return (
      <div className={card}>
        <p className="text-muted-foreground text-sm">
          Checking the weather in {args.city}…
        </p>
      </div>
    );
  }
  if (!result) {
    return (
      <div className={card}>
        <p className="text-muted-foreground text-sm">
          No weather for {args.city}.
        </p>
      </div>
    );
  }

  const Icon = ICONS[result.condition] ?? CloudIcon;
  return (
    <div className={card}>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{args.city}</p>
        <p className="text-3xl font-medium tabular-nums">
          {result.temperature}°C
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 text-sm">
        <Icon aria-hidden className="size-6" />
        {result.condition}
      </div>
    </div>
  );
};

const card =
  "border-foreground/10 my-2 flex w-full max-w-xs items-center justify-between rounded-xl border p-4";

export const toolkit = defineToolkit({
  getWeather: {
    type: "backend",
    display: "standalone",
    render: WeatherCard,
  },
});
