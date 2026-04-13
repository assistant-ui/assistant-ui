"use client";

import { cn } from "@/lib/ui/cn";

export interface WelcomeCardProps {
  title: string;
  message: string;
  theme?: "light" | "dark";
  isFullscreen?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export function WelcomeCard({
  title,
  message,
  theme = "light",
  isFullscreen = false,
  onExpand,
  onCollapse,
}: WelcomeCardProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center p-8",
        isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900",
      )}
    >
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">👋</div>

        <h1
          className={cn(
            "mb-3 font-semibold text-2xl",
            isDark ? "text-white" : "text-zinc-900",
          )}
        >
          {title}
        </h1>

        <p
          className={cn(
            "mb-6 text-base leading-relaxed",
            isDark ? "text-zinc-400" : "text-zinc-600",
          )}
        >
          {message}
        </p>

        {isFullscreen
          ? onCollapse && (
              <button
                onClick={onCollapse}
                className={cn(
                  "rounded-lg px-4 py-2 font-medium text-sm transition-colors",
                  isDark
                    ? "bg-white text-zinc-900 hover:bg-zinc-200"
                    : "bg-zinc-900 text-white hover:bg-zinc-700",
                )}
              >
                Exit Fullscreen
              </button>
            )
          : onExpand && (
              <button
                onClick={onExpand}
                className={cn(
                  "rounded-lg px-4 py-2 font-medium text-sm transition-colors",
                  isDark
                    ? "bg-white text-zinc-900 hover:bg-zinc-200"
                    : "bg-zinc-900 text-white hover:bg-zinc-700",
                )}
              >
                View Fullscreen
              </button>
            )}
      </div>
    </div>
  );
}
