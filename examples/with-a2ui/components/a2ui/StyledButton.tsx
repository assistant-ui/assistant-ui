"use client";

import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";

export const StyledButton = ({
  def,
  surfaceId,
  onAction,
}: A2uiComponentProps) => {
  const label =
    typeof def.props?.label === "string" ? def.props.label : "Button";
  const variant =
    typeof def.props?.variant === "string" ? def.props.variant : "default";

  const baseClasses =
    "w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer";
  const variantClasses =
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"
      : "border border-border bg-background text-foreground hover:bg-accent active:scale-[0.98]";

  return (
    <button
      className={`${baseClasses} ${variantClasses}`}
      onClick={() => {
        onAction({
          name: "click",
          surfaceId,
          sourceComponentId: def.id,
          timestamp: new Date().toISOString(),
          context: { label },
        });
      }}
    >
      {label}
    </button>
  );
};
