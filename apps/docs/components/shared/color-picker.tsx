"use client";

import { useState, useEffect, useRef } from "react";

import type { ThemeColor } from "@/components/builder/types";
import { cn } from "@/lib/utils";

export type { ThemeColor };

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 50);
  };

  return (
    <label className="relative cursor-pointer">
      <div
        className="size-5 rounded-md shadow-sm ring-1 ring-black/10 ring-inset"
        style={{ backgroundColor: localValue }}
      />
      <input
        type="color"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  );
}

export function ThemeColorPicker({
  value,
  onChange,
}: {
  value: ThemeColor;
  onChange: (value: ThemeColor) => void;
}) {
  return (
    <div className="flex gap-1">
      <ColorPicker
        value={value.light}
        onChange={(light) => onChange({ ...value, light })}
      />
      <ColorPicker
        value={value.dark}
        onChange={(dark) => onChange({ ...value, dark })}
      />
    </div>
  );
}

export function OptionalThemeColorPicker({
  value,
  defaultValue,
  onChange,
}: {
  value: ThemeColor | undefined;
  defaultValue: ThemeColor;
  onChange: (value: ThemeColor | undefined) => void;
}) {
  const displayValue = value ?? defaultValue;
  const isCustom = value !== undefined;

  return (
    <div className="flex gap-1">
      <label className="relative cursor-pointer">
        <div
          className={cn(
            "size-5 rounded-md shadow-sm ring-1 ring-inset",
            isCustom ? "ring-black/10" : "opacity-50 ring-black/5",
          )}
          style={{ backgroundColor: displayValue.light }}
        />
        <input
          type="color"
          value={displayValue.light}
          onChange={(e) => onChange({ ...displayValue, light: e.target.value })}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <label className="relative cursor-pointer">
        <div
          className={cn(
            "size-5 rounded-md shadow-sm ring-1 ring-inset",
            isCustom ? "ring-black/10" : "opacity-50 ring-black/5",
          )}
          style={{ backgroundColor: displayValue.dark }}
        />
        <input
          type="color"
          value={displayValue.dark}
          onChange={(e) => onChange({ ...displayValue, dark: e.target.value })}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
