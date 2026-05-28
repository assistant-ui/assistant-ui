"use client";

import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";

export const StyledCard = ({ def }: A2uiComponentProps) => {
  const title =
    typeof def.props?.title === "string" ? def.props.title : undefined;
  const subtitle =
    typeof def.props?.subtitle === "string" ? def.props.subtitle : undefined;

  return (
    <div className="border-border/60 bg-card overflow-hidden rounded-xl border shadow-lg">
      {(title || subtitle) && (
        <div className="border-border/40 bg-muted/30 border-b px-5 py-4">
          {title && (
            <h3 className="text-foreground text-base font-semibold">{title}</h3>
          )}
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
};
