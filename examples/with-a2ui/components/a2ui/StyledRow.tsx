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
        <div className="font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-muted-foreground text-xs">{detail}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-foreground">{price}</div>
        {highlight && (
          <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary">
            Best Value
          </span>
        )}
      </div>
    </button>
  );
};
