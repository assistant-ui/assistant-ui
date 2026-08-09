"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface SettingToggle {
  key: string;
  label: string;
  detail: string;
  on: boolean;
}

export function SettingsPanel({
  model,
  models,
  systemPrompt,
  temperature,
  toggles,
  onModelChange,
  onSystemPromptChange,
  onTemperatureChange,
  onToggle,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "model"
  | "models"
  | "systemPrompt"
  | "temperature"
  | "toggles"
  | "onModelChange"
  | "onSystemPromptChange"
  | "onTemperatureChange"
  | "onToggle"
> & {
  model: string;
  models: readonly string[];
  systemPrompt: string;
  temperature: number;
  toggles: readonly SettingToggle[];
  onModelChange?: (model: string) => void;
  onSystemPromptChange?: (prompt: string) => void;
  onTemperatureChange?: (temperature: number) => void;
  onToggle?: (key: string) => void;
}) {
  return (
    <div
      data-slot="settings-panel"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-4 rounded-[20px] p-4",
        className,
      )}

      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <span className={cn(mono, "text-foreground/30")}>model</span>
        <div className={cn(field, "flex gap-0.5 rounded-full p-0.5")}>
          {models.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === model}
              onClick={() => onModelChange?.(option)}
              className={cn(
                "flex-1 rounded-full py-1 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.97]",
                option === model
                  ? "bg-background text-foreground/90 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-foreground/45 hover:text-foreground/70",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={cn(mono, "text-foreground/30")}>system prompt</span>
        <textarea
          value={systemPrompt}
          onChange={(event) => onSystemPromptChange?.(event.target.value)}
          rows={3}
          aria-label="System prompt"
          className={cn(
            field,
            "text-foreground/80 focus-visible:ring-foreground/20 resize-none rounded-xl px-3 py-2 text-xs leading-relaxed outline-none focus-visible:ring-2",
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between">
          <span className={cn(mono, "text-foreground/30")}>temperature</span>
          <span className={cn(mono, "text-foreground/55 tabular-nums")}>
            {Math.min(2, Math.max(0, temperature)).toFixed(1)}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={Math.min(2, Math.max(0, temperature))}
          aria-label="Temperature"
          onChange={(event) =>
            onTemperatureChange?.(Number(event.target.value))
          }
          className="accent-foreground/80 h-1 w-full cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {toggles.map((toggle) => (
          <div key={toggle.key} className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px]">{toggle.label}</span>
              <span className="text-foreground/35 truncate text-xs">
                {toggle.detail}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={toggle.on}
              aria-label={toggle.label}
              onClick={() => onToggle?.(toggle.key)}
              className={cn(
                "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
                toggle.on ? "bg-foreground/80" : "bg-foreground/15",
              )}
            >
              <span
                className={cn(
                  "bg-background size-4 rounded-full transition-transform duration-200 motion-reduce:transition-none",
                  toggle.on && "translate-x-4",
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
