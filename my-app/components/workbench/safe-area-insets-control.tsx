"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { SafeAreaInsets } from "@/lib/workbench/types";
import {
  INPUT_GROUP_CLASSES,
  INPUT_CLASSES,
  COMPACT_ADDON_CLASSES,
  COMPACT_LABEL_CLASSES,
  LABEL_CLASSES,
  TRANSPARENT_CONTROL_BG_CLASSES,
} from "./styles";
import { Separator } from "@/components/ui/separator";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function InsetInput({
  side,
  value,
  onChange,
  align = "left",
}: {
  side: keyof SafeAreaInsets;
  value: number;
  onChange: (side: keyof SafeAreaInsets, value: string) => void;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  return (
    <InputGroup className={INPUT_GROUP_CLASSES}>
      <InputGroupInput
        type="number"
        value={value}
        onChange={(e) => onChange(side, e.target.value)}
        min={0}
        max={100}
        aria-label={`${side} inset`}
        className={`${INPUT_CLASSES} w-14 ${alignClass}`}
      />
    </InputGroup>
  );
}

interface SafeAreaInsetsControlProps {
  value: SafeAreaInsets;
  onChange: (next: Partial<SafeAreaInsets>) => void;
}

export function SafeAreaInsetsControl({
  value,
  onChange,
}: SafeAreaInsetsControlProps) {
  const [open, setOpen] = useState(false);
  const [customizeSides, setCustomizeSides] = useState(false);
  const [allInputValue, setAllInputValue] = useState("");

  const { top, bottom, left, right } = value;
  const isUniform = top === bottom && top === left && top === right;

  const [prevIsUniform, setPrevIsUniform] = useState(isUniform);
  const [prevTop, setPrevTop] = useState(top);

  if (isUniform !== prevIsUniform || top !== prevTop) {
    setPrevIsUniform(isUniform);
    setPrevTop(top);
    if (isUniform) {
      setAllInputValue(String(top));
    } else {
      setAllInputValue("");
    }
  }

  if (!isUniform && !customizeSides) {
    setCustomizeSides(true);
  }

  const handleAllChange = (inputValue: string) => {
    setAllInputValue(inputValue);
    const parsed = Number(inputValue);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(parsed, 0, 100);
      onChange({
        top: clamped,
        bottom: clamped,
        left: clamped,
        right: clamped,
      });
    }
  };

  const handleSideChange = (side: keyof SafeAreaInsets, inputValue: string) => {
    const parsed = Number(inputValue);
    const clamped = clamp(parsed, 0, 100);
    onChange({ [side]: clamped });
  };

  const handleReset = () => {
    onChange({ top: 0, bottom: 0, left: 0, right: 0 });
    setAllInputValue("0");
    setCustomizeSides(false);
  };

  const summaryItems = [
    { label: "L", value: left },
    { label: "T", value: top },
    { label: "R", value: right },
    { label: "B", value: bottom },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`${TRANSPARENT_CONTROL_BG_CLASSES} flex h-7 select-none items-center gap-2 rounded-md px-2 text-xs`}
          aria-label="Edit safe area insets"
        >
          <span className="tabular-nums">
            {summaryItems.map((item, i) => (
              <span key={item.label}>
                <span className="px-1">{item.value}</span>
                {i < summaryItems.length - 1 && (
                  <span className="text-muted-foreground/30"> / </span>
                )}
              </span>
            ))}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Safe area insets</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground text-xs"
            onClick={handleReset}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Label className={`${COMPACT_LABEL_CLASSES} w-12 shrink-0`}>
            All sides
          </Label>
          <InputGroup className={`${INPUT_GROUP_CLASSES} w-20`}>
            <InputGroupInput
              type="number"
              value={allInputValue}
              placeholder={isUniform ? undefined : "mixed"}
              onChange={(e) => handleAllChange(e.target.value)}
              min={0}
              max={100}
              className={INPUT_CLASSES}
              aria-label="All insets"
            />
            <InputGroupAddon
              align="inline-end"
              className={COMPACT_ADDON_CLASSES}
            >
              px
            </InputGroupAddon>
          </InputGroup>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Label htmlFor="customize-sides" className={LABEL_CLASSES}>
            Customize sides
          </Label>
          <Switch
            id="customize-sides"
            checked={customizeSides}
            onCheckedChange={setCustomizeSides}
          />
        </div>

        {customizeSides && (
          <div className="relative grid grid-cols-[auto_0px_auto] grid-rows-[auto_0px_auto] items-center justify-items-center gap-1">
            <div />
            <InsetInput
              side="top"
              value={value.top}
              onChange={handleSideChange}
              align="center"
            />
            <div />

            <InsetInput
              side="left"
              value={value.left}
              onChange={handleSideChange}
            />
            <div className="size-4"></div>
            <InsetInput
              side="right"
              value={value.right}
              onChange={handleSideChange}
              align="right"
            />

            <div />
            <InsetInput
              side="bottom"
              value={value.bottom}
              onChange={handleSideChange}
              align="center"
            />
            <div />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
