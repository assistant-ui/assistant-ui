"use generative";

import { cn } from "@/lib/utils";
import {
  WeatherWidget,
  type TemperatureUnit,
  type WeatherWidgetPayload,
} from "@/components/tool-ui/weather-widget/runtime";
import {
  fetchWeatherWidgetFromOpenMeteo,
  geocodeLocationWithOpenMeteo,
} from "@/lib/open-meteo-weather-adapter";
import { MapPin, CloudSun, AlertCircle, ChevronRight } from "lucide-react";
import { z } from "zod";
import {
  defineToolkit,
  useAuiState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  JSONGenerativeUI,
  defineGenerativeComponents,
  generativeUIToJSX,
} from "@assistant-ui/react-generative-ui";

const weatherFormatSchema = z.enum(["fahrenheit", "celsius"]);

type GeocodeLocationArgs = {
  query: string;
};

type GeocodeLocationResult = Awaited<
  ReturnType<typeof geocodeLocationWithOpenMeteo>
>;

type GetWeatherArgs = {
  location: string;
  latitude: number;
  longitude: number;
};

type GetWeatherResult =
  | {
      success: true;
      id: string;
      location: string;
      widget: WeatherWidgetPayload;
    }
  | {
      success: false;
      error: string;
    };

const GeocodeLocationToolUI: ToolCallMessagePartComponent<
  GeocodeLocationArgs,
  GeocodeLocationResult
> = ({ toolName, args, result }) => {
  const signature = formatToolCall(toolName, args);
  const icon = <MapPin className="size-4" />;

  if (result?.success === false) {
    return <ToolErrorCard signature={signature} error={result.error} />;
  }
  if (!result) {
    return (
      <ToolStatusCard
        signature={signature}
        icon={icon}
        message="Finding location..."
        loading
      />
    );
  }

  const { name, latitude, longitude } = result.result;
  return (
    <ToolTraceCard
      icon={icon}
      signature={signature}
      description={`${name} · ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}
      result={result}
    />
  );
};

const GetWeatherToolUI: ToolCallMessagePartComponent<
  GetWeatherArgs,
  GetWeatherResult
> = ({ toolName, args, result }) => {
  const signature = formatToolCall(toolName, args);
  const icon = <CloudSun className="size-4" />;

  if (result?.success === false) {
    return <ToolErrorCard signature={signature} error={result.error} />;
  }
  if (!result) {
    return (
      <ToolStatusCard
        signature={signature}
        icon={icon}
        message="Fetching weather..."
        loading
      />
    );
  }

  const current = result.widget?.current;
  const unitSymbol = result.widget?.units.temperature === "celsius" ? "C" : "F";
  return (
    <ToolTraceCard
      icon={icon}
      signature={signature}
      description={
        current
          ? `${Math.round(current.temperature)}°${unitSymbol} · ${current.conditionCode} in ${result.location}`
          : "Weather ready"
      }
      result={result}
    />
  );
};

// The user-facing component library the model renders through the `present`
// tool. `Weather` shows the rich card for a `get_weather` result by `id`.
const generative = new JSONGenerativeUI({
  library: defineGenerativeComponents({
    Weather: {
      description:
        "Show the user a rich weather card for a `get_weather` result.",
      properties: z.object({
        id: z.string().describe("The `id` returned by `get_weather`."),
        format: weatherFormatSchema
          .optional()
          .describe("Temperature format to display in the weather card."),
      }),
      render: (props) => <WeatherCard {...props} />,
    },
  }),
});

export default defineToolkit({
  // Weather data powered by Open-Meteo (https://open-meteo.com/)
  geocode_location: {
    description:
      "Geocode a location name into latitude/longitude (Open-Meteo). Pass the " +
      "coordinates to `get_weather`.",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => geocodeLocationWithOpenMeteo(query),
    render: GeocodeLocationToolUI,
  },
  get_weather: {
    description:
      "Fetch the weather for coordinates from `geocode_location`. Returns an " +
      '`id`; call `present` with `{ $type: "Weather", id }` to show the user a card.',
    parameters: z.object({
      location: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    execute: async ({ location, latitude, longitude }) => {
      const weather = await fetchWeatherWidgetFromOpenMeteo({
        query: location,
        latitude,
        longitude,
      });
      if (!weather.success) {
        return { success: false as const, error: weather.error };
      }

      return {
        success: true as const,
        id: crypto.randomUUID().slice(0, 8),
        location,
        widget: weather.widget,
      };
    },
    render: GetWeatherToolUI,
  },
  present: generative.present({ display: "standalone" }),
});

const WeatherCard = ({
  id,
  format,
}: {
  id: string;
  format?: TemperatureUnit;
}) => {
  // The payload lives on the `get_weather` result; the `Weather` component only
  // carries the `id`. Scan the whole thread (the two calls usually land in
  // separate assistant messages) for the matching result.
  const source = useAuiState((s) => {
    for (const message of s.thread.messages) {
      for (const part of message.content) {
        if (
          part.type === "tool-call" &&
          part.toolName === "get_weather" &&
          (part.result as any)?.id === id
        ) {
          return part.result as any;
        }
      }
    }
    return undefined;
  });

  if (source?.success === false) {
    return (
      <ToolCard variant="error">
        <ToolCardIcon>
          <AlertCircle className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>Weather unavailable</ToolCardTitle>
          <ToolCardDescription>{source.error}</ToolCardDescription>
        </ToolCardContent>
      </ToolCard>
    );
  }

  if (!source?.widget) {
    return (
      <ToolCard>
        <ToolCardIcon loading>
          <CloudSun className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>Preparing weather...</ToolCardTitle>
        </ToolCardContent>
      </ToolCard>
    );
  }

  const widget = format
    ? convertWeatherWidgetFormat(source.widget, format)
    : source.widget;
  const generativeNode = {
    $type: "Weather",
    id,
    ...(format !== undefined && { format }),
  };

  return (
    <div className="mt-2 mb-4 flex flex-col items-center">
      <WeatherWidget {...widget} />
      <p className="text-muted-foreground/70 mt-1.5 text-center font-mono text-xs">
        present({generativeUIToJSX(generativeNode)})
      </p>
    </div>
  );
};

const convertTemperature = (
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
) => {
  if (from === to) return value;
  return to === "celsius" ? ((value - 32) * 5) / 9 : (value * 9) / 5 + 32;
};

const convertWeatherWidgetFormat = (
  widget: WeatherWidgetPayload,
  format: TemperatureUnit,
): WeatherWidgetPayload => {
  const sourceFormat = widget.units.temperature;
  if (sourceFormat === format) return widget;

  return {
    ...widget,
    units: { ...widget.units, temperature: format },
    current: {
      ...widget.current,
      temperature: convertTemperature(
        widget.current.temperature,
        sourceFormat,
        format,
      ),
      tempMin: convertTemperature(widget.current.tempMin, sourceFormat, format),
      tempMax: convertTemperature(widget.current.tempMax, sourceFormat, format),
    },
    forecast: widget.forecast.map((day) => ({
      ...day,
      tempMin: convertTemperature(day.tempMin, sourceFormat, format),
      tempMax: convertTemperature(day.tempMax, sourceFormat, format),
    })),
  };
};

// Shared Tool Card Components
const ToolCard = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "error";
}) => (
  <div
    className={cn(
      "my-2 flex items-center gap-3 rounded-lg border px-3 py-2.5",
      variant === "error"
        ? "border-destructive/30 bg-destructive/5"
        : "bg-muted/30",
    )}
  >
    {children}
  </div>
);

/**
 * A backend tool's trace: the call signature and a one-line summary, with the
 * full JSON result tucked inside a collapsible.
 */
const ToolTraceCard = ({
  icon,
  signature,
  description,
  result,
}: {
  icon: React.ReactNode;
  signature: string;
  description: React.ReactNode;
  result: unknown;
}) => (
  <details className="group bg-muted/30 my-2 overflow-hidden rounded-lg border">
    <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2.5 select-none">
      <ToolCardIcon>{icon}</ToolCardIcon>
      <ToolCardContent>
        <ToolCardTitle mono>{signature}</ToolCardTitle>
        <ToolCardDescription>{description}</ToolCardDescription>
      </ToolCardContent>
      <ChevronRight className="text-muted-foreground/70 mt-1.5 ml-auto size-4 shrink-0 transition-transform group-open:rotate-90" />
    </summary>
    <pre className="text-muted-foreground bg-muted/50 mx-3 mb-3 max-h-60 overflow-auto rounded-md p-2 text-[11px] leading-relaxed">
      {JSON.stringify(result, null, 2)}
    </pre>
  </details>
);

/** A backend tool's pending/loading trace: the call signature with a spinner icon. */
const ToolStatusCard = ({
  icon,
  signature,
  message,
  loading = false,
}: {
  icon: React.ReactNode;
  signature: string;
  message: string;
  loading?: boolean;
}) => (
  <ToolCard>
    <ToolCardIcon loading={loading}>{icon}</ToolCardIcon>
    <ToolCardContent>
      <ToolCardTitle mono>{signature}</ToolCardTitle>
      <ToolCardDescription>{message}</ToolCardDescription>
    </ToolCardContent>
  </ToolCard>
);

/** A backend tool's error trace: the call signature with the error message. */
const ToolErrorCard = ({
  signature,
  error,
}: {
  signature: string;
  error?: string;
}) => (
  <ToolCard variant="error">
    <ToolCardIcon>
      <AlertCircle className="size-4" />
    </ToolCardIcon>
    <ToolCardContent>
      <ToolCardTitle mono>{signature}</ToolCardTitle>
      <ToolCardDescription>{error || "Unknown error"}</ToolCardDescription>
    </ToolCardContent>
  </ToolCard>
);

const ToolCardIcon = ({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) => (
  <div
    className={cn(
      "bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md shadow-sm",
      loading && "animate-pulse",
    )}
  >
    {children}
  </div>
);

const ToolCardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
);

const ToolCardTitle = ({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) => (
  <span
    className={cn(
      "truncate text-sm font-medium",
      mono && "font-mono text-[13px] font-normal",
    )}
  >
    {children}
  </span>
);

const ToolCardDescription = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground truncate text-xs">{children}</span>
);

/** Renders a tool call as a readable signature, e.g. `get_weather({ location: "SF" })`. */
const formatToolCall = (
  toolName: string,
  args: Record<string, unknown> | undefined,
): string => {
  const entries = Object.entries(args ?? {});
  if (entries.length === 0) return `${toolName}()`;
  const body = entries
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
  return `${toolName}({ ${body} })`;
};
