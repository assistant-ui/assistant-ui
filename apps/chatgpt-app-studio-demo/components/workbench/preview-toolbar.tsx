"use client";

import { useShallow } from "zustand/react/shallow";
import {
  useWorkbenchStore,
  useDisplayMode,
  useWorkbenchTheme,
  useDeviceType,
  useConversationMode,
} from "@/lib/workbench/store";
import {
  LOCALE_OPTIONS,
  type DisplayMode,
  type DeviceType,
  type UserLocation,
} from "@/lib/workbench/types";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { SafeAreaInsetsControl } from "./safe-area-insets-control";
import {
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Square,
  PictureInPicture2,
  Moon,
  Sun,
  MoreHorizontal,
  MapPin,
  X,
  Layers,
  MoveHorizontal,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/ui/cn";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  INPUT_GROUP_CLASSES,
  INPUT_CLASSES,
  ADDON_CLASSES,
  LABEL_CLASSES,
  SELECT_CLASSES,
  TOGGLE_BUTTON_CLASSES,
  TOGGLE_BUTTON_ACTIVE_CLASSES,
} from "./styles";

const DISPLAY_MODES: ReadonlyArray<{
  id: DisplayMode;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "inline", label: "Inline", icon: Square },
  { id: "pip", label: "PiP", icon: PictureInPicture2 },
  { id: "fullscreen", label: "Fullscreen", icon: Maximize2 },
];

const DEVICE_TYPES: ReadonlyArray<{
  id: DeviceType;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "resizable", label: "Resizable", icon: MoveHorizontal },
];

const LOCATION_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  location: UserLocation | null;
}> = [
  { id: "none", label: "None", location: null },
  {
    id: "sf",
    label: "San Francisco",
    location: {
      city: "San Francisco",
      region: "California",
      country: "US",
      timezone: "America/Los_Angeles",
      latitude: 37.7749,
      longitude: -122.4194,
    },
  },
  {
    id: "nyc",
    label: "New York",
    location: {
      city: "New York",
      region: "New York",
      country: "US",
      timezone: "America/New_York",
      latitude: 40.7128,
      longitude: -74.006,
    },
  },
  {
    id: "london",
    label: "London",
    location: {
      city: "London",
      region: "England",
      country: "GB",
      timezone: "Europe/London",
      latitude: 51.5074,
      longitude: -0.1278,
    },
  },
  {
    id: "tokyo",
    label: "Tokyo",
    location: {
      city: "Tokyo",
      region: "Tokyo",
      country: "JP",
      timezone: "Asia/Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
    },
  },
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

interface SettingRowProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

function SettingRow({ label, htmlFor, children }: SettingRowProps) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4">
      <Label htmlFor={htmlFor} className={`${LABEL_CLASSES} shrink-0`}>
        {label}
      </Label>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AdvancedSettingsPopover() {
  const displayMode = useDisplayMode();

  const {
    locale,
    maxHeight,
    safeAreaInsets,
    view,
    userLocation,
    setLocale,
    setMaxHeight,
    setSafeAreaInsets,
    setView,
    setUserLocation,
  } = useWorkbenchStore(
    useShallow((s) => ({
      locale: s.locale,
      maxHeight: s.maxHeight,
      safeAreaInsets: s.safeAreaInsets,
      view: s.view,
      userLocation: s.userLocation,
      setLocale: s.setLocale,
      setMaxHeight: s.setMaxHeight,
      setSafeAreaInsets: s.setSafeAreaInsets,
      setView: s.setView,
      setUserLocation: s.setUserLocation,
    })),
  );

  return (
    <Popover>
      <TooltipPrimitive.Root delayDuration={500}>
        <TooltipPrimitive.Trigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipPrimitive.Trigger>
        <TooltipContent side="top">More options</TooltipContent>
      </TooltipPrimitive.Root>
      <PopoverContent align="end" className="w-72 space-y-1 pr-2">
        <div className="mb-4 font-medium text-sm">Environment Options</div>

        {view && (
          <SettingRow label="View">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                <Layers className="size-3" />
                {view.mode}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setView(null)}
                title="Dismiss view"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </SettingRow>
        )}

        {displayMode === "inline" && (
          <SettingRow label="Max height" htmlFor="max-height">
            <InputGroup className={INPUT_GROUP_CLASSES}>
              <InputGroupInput
                id="max-height"
                type="number"
                value={maxHeight}
                onChange={(e) => {
                  const clamped = clamp(Number(e.target.value), 100, 2000);
                  setMaxHeight(clamped);
                }}
                min={100}
                max={2000}
                className={INPUT_CLASSES}
              />
              <InputGroupAddon align="inline-end" className={ADDON_CLASSES}>
                px
              </InputGroupAddon>
            </InputGroup>
          </SettingRow>
        )}

        {displayMode === "fullscreen" && (
          <SettingRow label="Safe area">
            <SafeAreaInsetsControl
              value={safeAreaInsets}
              onChange={setSafeAreaInsets}
            />
          </SettingRow>
        )}

        <SettingRow label="Locale">
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className={SELECT_CLASSES}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Location">
          <div className="flex items-center gap-2">
            <Select
              value={
                LOCATION_PRESETS.find(
                  (p) =>
                    p.location?.city === userLocation?.city &&
                    p.location?.country === userLocation?.country,
                )?.id ?? "none"
              }
              onValueChange={(id) => {
                const preset = LOCATION_PRESETS.find((p) => p.id === id);
                setUserLocation(preset?.location ?? null);
              }}
            >
              <SelectTrigger className={SELECT_CLASSES}>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_PRESETS.map((preset) => (
                  <SelectItem
                    key={preset.id}
                    value={preset.id}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      {preset.location && <MapPin className="size-3" />}
                      {preset.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {userLocation && (
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setUserLocation(null)}
                title="Clear location"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </SettingRow>
      </PopoverContent>
    </Popover>
  );
}

export function PreviewToolbar() {
  const displayMode = useDisplayMode();
  const theme = useWorkbenchTheme();
  const deviceType = useDeviceType();
  const conversationMode = useConversationMode();

  const { setDisplayMode, setDeviceType, setTheme, setConversationMode } =
    useWorkbenchStore(
      useShallow((s) => ({
        setDisplayMode: s.setDisplayMode,
        setDeviceType: s.setDeviceType,
        setTheme: s.setTheme,
        setConversationMode: s.setConversationMode,
      })),
    );

  const isDark = theme === "dark";

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-border/50 border-b bg-neutral-100 px-4 dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="cursor-default select-none text-muted-foreground/60 text-xs">
              Device
            </span>
            <ButtonGroup>
              {DEVICE_TYPES.map(({ id, label, icon: Icon }) => (
                <TooltipPrimitive.Root key={id}>
                  <TooltipPrimitive.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "size-7 p-0",
                        deviceType === id
                          ? TOGGLE_BUTTON_ACTIVE_CLASSES
                          : TOGGLE_BUTTON_CLASSES,
                      )}
                      onClick={() => setDeviceType(id)}
                    >
                      <Icon className="size-3.5" />
                    </Button>
                  </TooltipPrimitive.Trigger>
                  <TooltipContent side="top">{label}</TooltipContent>
                </TooltipPrimitive.Root>
              ))}
            </ButtonGroup>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="cursor-default select-none text-muted-foreground/60 text-xs">
              Mode
            </span>
            <ButtonGroup>
              {DISPLAY_MODES.map(({ id, label, icon: Icon }) => (
                <TooltipPrimitive.Root key={id}>
                  <TooltipPrimitive.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "size-7 p-0",
                        displayMode === id
                          ? TOGGLE_BUTTON_ACTIVE_CLASSES
                          : TOGGLE_BUTTON_CLASSES,
                      )}
                      onClick={() => setDisplayMode(id)}
                    >
                      <Icon className="size-3.5" />
                    </Button>
                  </TooltipPrimitive.Trigger>
                  <TooltipContent side="top">{label}</TooltipContent>
                </TooltipPrimitive.Root>
              ))}
            </ButtonGroup>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={displayMode !== "inline"}
                className={cn(
                  "size-7",
                  displayMode !== "inline"
                    ? "cursor-not-allowed text-muted-foreground/40"
                    : conversationMode
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setConversationMode(!conversationMode)}
              >
                <MessageSquare className="size-4" />
              </Button>
            </TooltipPrimitive.Trigger>
            <TooltipContent side="top">
              {displayMode !== "inline"
                ? "Conversation Mode (inline only)"
                : "Conversation Mode"}
            </TooltipContent>
          </TooltipPrimitive.Root>

          <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                <Sun
                  className={cn(
                    "size-4 transition-all",
                    isDark ? "rotate-90 scale-0" : "rotate-0 scale-100",
                  )}
                />
                <Moon
                  className={cn(
                    "absolute size-4 transition-all",
                    isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0",
                  )}
                />
              </Button>
            </TooltipPrimitive.Trigger>
            <TooltipContent side="top">Toggle theme</TooltipContent>
          </TooltipPrimitive.Root>

          <AdvancedSettingsPopover />
        </div>
      </div>
    </TooltipProvider>
  );
}
