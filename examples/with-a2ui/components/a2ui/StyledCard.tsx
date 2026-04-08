"use client";

import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";

export const StyledCard = ({ def }: A2uiComponentProps) => {
  const title =
    typeof def.props?.title === "string" ? def.props.title : undefined;
  const subtitle =
    typeof def.props?.subtitle === "string" ? def.props.subtitle : undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
      {(title || subtitle) && (
        <div className="border-border/40 border-b bg-muted/30 px-5 py-4">
          {title && (
            <h3 className="font-semibold text-base text-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
};
