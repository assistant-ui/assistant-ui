"use client";

import { useEffect, useState } from "react";
import {
  PlayIcon,
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  SearchIcon,
  MapPinIcon,
} from "lucide-react";
import type { ToolCallMessagePartStatus } from "@assistant-ui/react";
import {
  ToolGroupRoot,
  ToolGroupTrigger,
  ToolGroupContent,
} from "@/components/assistant-ui/tool-group";
import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
} from "@/components/assistant-ui/tool-fallback";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";

// Custom Weather Tool UI
function WeatherToolUI({
  location,
  temperature,
  condition,
}: {
  location: string;
  temperature: number;
  condition: "Sunny" | "Cloudy" | "Rainy";
}) {
  const conditionConfig = {
    Sunny: { icon: SunIcon, color: "text-yellow-500", bg: "bg-yellow-50" },
    Cloudy: { icon: CloudIcon, color: "text-gray-500", bg: "bg-gray-50" },
    Rainy: { icon: CloudRainIcon, color: "text-blue-500", bg: "bg-blue-50" },
  };

  const config = conditionConfig[condition];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={`rounded-full p-2 ${config.bg}`}>
        <Icon className={`size-5 ${config.color}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <MapPinIcon className="size-3" />
          {location}
        </div>
        <div className="font-medium text-lg">{temperature}°F</div>
      </div>
      <div className="text-muted-foreground text-sm">{condition}</div>
    </div>
  );
}

// Custom Search Tool UI
function SearchToolUI({ query, results }: { query: string; results: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="rounded-full bg-purple-50 p-2">
        <SearchIcon className="size-5 text-purple-500" />
      </div>
      <div className="flex-1">
        <div className="text-muted-foreground text-xs">Search query</div>
        <div className="font-medium">&quot;{query}&quot;</div>
      </div>
      <div className="text-muted-foreground text-sm">{results} results</div>
    </div>
  );
}

function ToolGroupDemo({
  variant = "outline",
}: {
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <ToolGroupRoot variant={variant}>
      <ToolGroupTrigger count={3} />
      <ToolGroupContent>
        <WeatherToolUI
          location="New York"
          temperature={65}
          condition="Cloudy"
        />
        <WeatherToolUI location="London" temperature={55} condition="Rainy" />
        <SearchToolUI query="best restaurants nearby" results={24} />
      </ToolGroupContent>
    </ToolGroupRoot>
  );
}

function VariantRow({
  label,
  variant = "outline",
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ToolGroupDemo variant={variant} />
    </div>
  );
}

export function ToolGroupSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <VariantRow label="Outline (default)" variant="outline" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}

// Streaming Weather Tool UI with loading state
function StreamingWeatherToolUI({
  location,
  temperature,
  condition,
  isLoading,
}: {
  location: string | undefined;
  temperature: number | undefined;
  condition: "Sunny" | "Cloudy" | "Rainy" | undefined;
  isLoading: boolean;
}) {
  const conditionConfig = {
    Sunny: { icon: SunIcon, color: "text-yellow-500", bg: "bg-yellow-50" },
    Cloudy: { icon: CloudIcon, color: "text-gray-500", bg: "bg-gray-50" },
    Rainy: { icon: CloudRainIcon, color: "text-blue-500", bg: "bg-blue-50" },
  };

  const config = condition ? conditionConfig[condition] : null;
  const Icon = config?.icon ?? CloudIcon;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={`rounded-full p-2 ${config?.bg ?? "bg-muted"}`}>
        {isLoading ? (
          <div className="size-5 animate-pulse rounded-full bg-muted-foreground/20" />
        ) : (
          <Icon
            className={`size-5 ${config?.color ?? "text-muted-foreground"}`}
          />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <MapPinIcon className="size-3" />
          {location ?? (
            <span className="h-3 w-16 animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className="font-medium text-lg">
          {temperature !== undefined ? (
            `${temperature}°F`
          ) : (
            <span className="inline-block h-6 w-12 animate-pulse rounded bg-muted" />
          )}
        </div>
      </div>
      <div className="text-muted-foreground text-sm">
        {condition ??
          (isLoading && (
            <span className="h-4 w-12 animate-pulse rounded bg-muted" />
          ))}
      </div>
    </div>
  );
}

function ToolGroupStreamingDemo() {
  const [phase, setPhase] = useState<
    "idle" | "tool1" | "tool2" | "tool3" | "done"
  >("idle");
  const [isOpen, setIsOpen] = useState(false);

  // Weather tool 1 state
  const [weather1, setWeather1] = useState<{
    location?: string;
    temperature?: number;
    condition?: "Sunny" | "Cloudy" | "Rainy";
  }>({});

  // Weather tool 2 state (custom UI)
  const [weather2, setWeather2] = useState<{
    location?: string;
    temperature?: number;
    condition?: "Sunny" | "Cloudy" | "Rainy";
  }>({});

  // Search tool state (fallback UI)
  const [searchStatus, setSearchStatus] = useState<ToolCallMessagePartStatus>({
    type: "complete",
  });
  const [searchArgs, setSearchArgs] = useState("");
  const [searchResult, setSearchResult] = useState<object | undefined>(
    undefined,
  );

  const isActive = phase !== "idle" && phase !== "done";
  const toolCount =
    phase === "idle" ? 0 : phase === "tool1" ? 1 : phase === "tool2" ? 2 : 3;

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (phase === "tool1") {
      setIsOpen(true);
      setWeather1({});
      setWeather2({});
      setSearchArgs("");
      setSearchResult(undefined);

      // Simulate streaming weather data
      const steps = [
        () => setWeather1({ location: "Paris" }),
        () => setWeather1((w) => ({ ...w, temperature: 68 })),
        () => {
          setWeather1((w) => ({ ...w, condition: "Sunny" }));
          timeout = setTimeout(() => setPhase("tool2"), 300);
        },
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (step < steps.length) {
          steps[step]?.();
          step++;
        } else {
          clearInterval(interval);
        }
      }, 400);
      return () => {
        clearInterval(interval);
        if (timeout) clearTimeout(timeout);
      };
    }

    if (phase === "tool2") {
      const steps = [
        () => setWeather2({ location: "Berlin" }),
        () => setWeather2((w) => ({ ...w, temperature: 55 })),
        () => {
          setWeather2((w) => ({ ...w, condition: "Rainy" }));
          timeout = setTimeout(() => setPhase("tool3"), 300);
        },
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (step < steps.length) {
          steps[step]?.();
          step++;
        } else {
          clearInterval(interval);
        }
      }, 400);
      return () => {
        clearInterval(interval);
        if (timeout) clearTimeout(timeout);
      };
    }

    // phase === "tool3" - Search with ToolFallback
    setSearchStatus({ type: "running" });
    const fullArgs = JSON.stringify({ query: "weather comparison" }, null, 2);

    let index = 0;
    const interval = setInterval(() => {
      if (index < fullArgs.length) {
        setSearchArgs(fullArgs.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        timeout = setTimeout(() => {
          setSearchResult({ results: 24, relevance: "high" });
          setSearchStatus({ type: "complete" });
          setPhase("done");
        }, 400);
      }
    }, 25);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [phase]);

  const handleStart = () => {
    setPhase("tool1");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isActive}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isActive ? "Running..." : "Start Tool Calls"}
        </Button>
      </div>
      {toolCount > 0 && (
        <ToolGroupRoot open={isOpen} onOpenChange={setIsOpen}>
          <ToolGroupTrigger count={toolCount} active={isActive} />
          <ToolGroupContent aria-busy={isActive}>
            {/* Custom Weather UI */}
            <StreamingWeatherToolUI
              location={weather1.location}
              temperature={weather1.temperature}
              condition={weather1.condition}
              isLoading={phase === "tool1" && !weather1.condition}
            />

            {/* Second Custom Weather UI */}
            {toolCount >= 2 && (
              <StreamingWeatherToolUI
                location={weather2.location}
                temperature={weather2.temperature}
                condition={weather2.condition}
                isLoading={phase === "tool2" && !weather2.condition}
              />
            )}

            {/* ToolFallback for search */}
            {toolCount >= 3 && (
              <ToolFallbackRoot defaultOpen>
                <ToolFallbackTrigger
                  toolName="search_web"
                  status={searchStatus}
                />
                <ToolFallbackContent>
                  {searchArgs && <ToolFallbackArgs argsText={searchArgs} />}
                  {searchResult && <ToolFallbackResult result={searchResult} />}
                </ToolFallbackContent>
              </ToolFallbackRoot>
            )}
          </ToolGroupContent>
        </ToolGroupRoot>
      )}
      {toolCount === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm italic">
          Click &quot;Start Tool Calls&quot; to see mixed custom UI + fallback
        </div>
      )}
    </div>
  );
}

export function ToolGroupStreamingSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ToolGroupStreamingDemo />
    </SampleFrame>
  );
}
