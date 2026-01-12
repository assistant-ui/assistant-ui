import { cn } from "@/lib/ui/cn";

interface PanelIconProps {
  className?: string;
  active?: boolean;
}

export function LeftPanelIcon({ className, active }: PanelIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.5"
        className="stroke-current"
        strokeWidth="1"
        fill="none"
      />
      <rect
        x="2"
        y="3"
        width="4"
        height="10"
        rx="1"
        className={cn(
          "transition-colors",
          active ? "fill-current" : "fill-current opacity-30",
        )}
      />
    </svg>
  );
}

export function RightPanelIcon({ className, active }: PanelIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.5"
        className="stroke-current"
        strokeWidth="1"
        fill="none"
      />
      <rect
        x="10"
        y="3"
        width="4"
        height="10"
        rx="1"
        className={cn(
          "transition-colors",
          active ? "fill-current" : "fill-current opacity-30",
        )}
      />
    </svg>
  );
}
