"use client";

import { useState, useEffect } from "react";
import type { A2uiComponentProps } from "@assistant-ui/react-a2ui";
import { resolveValue } from "@assistant-ui/react-a2ui";

export const StyledTextField = ({
  def,
  surfaceId,
  getData,
  onAction,
}: A2uiComponentProps) => {
  const boundValue = resolveValue(def.props?.value, getData);
  const label =
    typeof def.props?.label === "string" ? def.props.label : undefined;
  const placeholder =
    typeof def.props?.placeholder === "string"
      ? def.props.placeholder
      : undefined;

  const pathRef = def.props?.value;
  const path =
    pathRef && typeof pathRef === "object" && "path" in pathRef
      ? (pathRef as { path: string }).path
      : undefined;

  const [localValue, setLocalValue] = useState(
    boundValue != null ? String(boundValue) : "",
  );

  useEffect(() => {
    if (boundValue != null) setLocalValue(String(boundValue));
  }, [boundValue]);

  const inputId = `textfield-${def.id}`;
  return (
    <div className="mb-3">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block font-medium text-foreground text-sm"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onAction({
            name: "change",
            surfaceId,
            sourceComponentId: def.id,
            timestamp: new Date().toISOString(),
            context: { value: e.target.value, ...(path ? { path } : {}) },
          });
        }}
      />
    </div>
  );
};
