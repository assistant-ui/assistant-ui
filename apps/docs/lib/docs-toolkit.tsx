"use generative";

import { cn } from "@/lib/utils";
import { WeatherWidget } from "@/components/tool-ui/weather-widget/runtime";
import {
  fetchWeatherWidgetFromOpenMeteo,
  geocodeLocationWithOpenMeteo,
} from "@/lib/open-meteo-weather-adapter";
import { MapPin, CloudSun, AlertCircle, ChevronRight } from "lucide-react";
import { z } from "zod";
import { defineToolkit, useAuiState } from "@assistant-ui/react";

export default defineToolkit({
  // Weather data powered by Open-Meteo (https://open-meteo.com/)
  geocode_location: {
    description:
      "Geocode a location name into latitude/longitude (Open-Meteo). Pass the " +
      "coordinates to `get_weather`.",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }: { query: string }) =>
      geocodeLocationWithOpenMeteo(query),
    render: ({ toolName, args, result }: any) => {
      const signature = formatToolCall(toolName, args);

      if (result?.success === false) {
        return (
          <ToolCard variant="error">
            <ToolCardIcon>
              <AlertCircle className="size-4" />
            </ToolCardIcon>
            <ToolCardContent>
              <ToolCardTitle mono>{signature}</ToolCardTitle>
              <ToolCardDescription>
                {result?.error || "Unknown error"}
              </ToolCardDescription>
            </ToolCardContent>
          </ToolCard>
        );
      }
      if (!result) {
        return (
          <ToolCard>
            <ToolCardIcon loading>
              <MapPin className="size-4" />
            </ToolCardIcon>
            <ToolCardContent>
              <ToolCardTitle mono>{signature}</ToolCardTitle>
              <ToolCardDescription>Finding location...</ToolCardDescription>
            </ToolCardContent>
          </ToolCard>
        );
      }

      const { name, latitude, longitude } = result.result;
      return (
        <ToolTraceCard
          icon={<MapPin className="size-4" />}
          signature={signature}
          description={`${name} · ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}
          result={result}
        />
      );
    },
  },
  get_weather: {
    description:
      "Fetch the weather for coordinates from `geocode_location`. Returns an " +
      "`id`; pass that `id` to `present_weather` to show the user a card.",
    parameters: z.object({
      location: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    execute: async ({
      location,
      latitude,
      longitude,
    }: {
      location: string;
      latitude: number;
      longitude: number;
    }) => {
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
    render: ({ toolName, args, result }: any) => {
      const signature = formatToolCall(toolName, args);

      if (result?.success === false) {
        return (
          <ToolCard variant="error">
            <ToolCardIcon>
              <AlertCircle className="size-4" />
            </ToolCardIcon>
            <ToolCardContent>
              <ToolCardTitle mono>{signature}</ToolCardTitle>
              <ToolCardDescription>
                {result?.error || "Unknown error"}
              </ToolCardDescription>
            </ToolCardContent>
          </ToolCard>
        );
      }
      if (!result) {
        return (
          <ToolCard>
            <ToolCardIcon loading>
              <CloudSun className="size-4" />
            </ToolCardIcon>
            <ToolCardContent>
              <ToolCardTitle mono>{signature}</ToolCardTitle>
              <ToolCardDescription>Fetching weather...</ToolCardDescription>
            </ToolCardContent>
          </ToolCard>
        );
      }

      const current = result.widget?.current;
      return (
        <ToolTraceCard
          icon={<CloudSun className="size-4" />}
          signature={signature}
          description={
            current
              ? `${Math.round(current.temperature)}°F · ${current.conditionCode} in ${result.location}`
              : "Weather ready"
          }
          result={result}
        />
      );
    },
  },
  present_weather: {
    display: "standalone",
    description:
      "Show the user a rich weather card. Pass the `id` returned by " +
      "`get_weather`; the card reads that result's payload.",
    parameters: z.object({
      id: z.string(),
    }),
    execute: async ({ id }: { id: string }) => ({ id }),
    render: (props: any) => <PresentWeatherCard {...props} />,
  },
});

const PresentWeatherCard = ({ toolName, args }: any) => {
  // The payload lives on the `get_weather` result; `present_weather` only
  // carries the `id`. Scan the whole thread (the two calls usually land in
  // separate assistant messages) for the matching result.
  const source = useAuiState((s) => {
    for (const message of s.thread.messages) {
      for (const part of message.content) {
        if (
          part.type === "tool-call" &&
          part.toolName === "get_weather" &&
          (part.result as any)?.id === args?.id
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

  return (
    <div className="mt-2 mb-4 flex flex-col items-center">
      <WeatherWidget {...source.widget} />
      <p className="text-muted-foreground/70 mt-1.5 text-center font-mono text-xs">
        {formatToolCall(toolName, args)}
      </p>
    </div>
  );
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
