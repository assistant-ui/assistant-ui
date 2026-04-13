"use client";

import { cn } from "@/lib/ui/cn";
import { useWorkbenchTheme, useDeviceType } from "@/lib/workbench/store";
import type { DeviceType } from "@/lib/workbench/types";

interface DeviceFrameProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const FRAME_CONFIG: Record<
  Exclude<DeviceType, "desktop">,
  {
    borderRadius: string;
    showNotch: boolean;
  }
> = {
  mobile: {
    borderRadius: "rounded-[2rem]",
    showNotch: false,
  },
  tablet: {
    borderRadius: "rounded-[1.25rem]",
    showNotch: false,
  },
  resizable: {
    borderRadius: "rounded-[1rem]",
    showNotch: false,
  },
};

function DynamicIsland({ isDark }: { isDark: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
      <div
        className={cn(
          "h-7 w-24 rounded-full",
          isDark ? "bg-black" : "bg-neutral-950",
        )}
      />
    </div>
  );
}

export function DeviceFrame({ children, className, style }: DeviceFrameProps) {
  const theme = useWorkbenchTheme();
  const deviceType = useDeviceType();
  const isDark = theme === "dark";

  if (deviceType === "desktop") {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const config = FRAME_CONFIG[deviceType];

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden border shadow-xl transition-colors",
        config.borderRadius,
        isDark
          ? "border-neutral-700/50 bg-neutral-900 shadow-black/30"
          : "border-neutral-300/50 bg-white shadow-black/10",
        className,
      )}
      style={style}
    >
      {config.showNotch && <DynamicIsland isDark={isDark} />}
      {children}
    </div>
  );
}
