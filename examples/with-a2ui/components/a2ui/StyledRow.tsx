"use client";

import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";

export const StyledRow = ({ def, surfaceId, onAction }: A2uiComponentProps) => {
  const label = typeof def.props?.label === "string" ? def.props.label : "";
  const detail = typeof def.props?.detail === "string" ? def.props.detail : "";
  const price = typeof def.props?.price === "string" ? def.props.price : "";
  const highlight = def.props?.highlight === true;

  return (
    <button
      className={`mb-2 flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${
        highlight
          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
          : "border-border/60 bg-background hover:bg-accent/50"
      }`}
      onClick={() => {
        onAction({
          name: "click",
          surfaceId,
          sourceComponentId: def.id,
          timestamp: new Date().toISOString(),
          context: { label, detail, price },
        });
      }}
    >
      <div>
        <div className="text-foreground font-medium">{label}</div>
        <div className="text-muted-foreground mt-0.5 text-xs">{detail}</div>
      </div>
      <div className="text-right">
        <div className="text-foreground font-semibold">{price}</div>
        {highlight && (
          <span className="bg-primary/10 text-primary mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium">
            Best Value
          </span>
        )}
      </div>
    </button>
  );
};
