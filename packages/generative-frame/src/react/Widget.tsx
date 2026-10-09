import { useEffect, type CSSProperties } from "react";
import { syncWidgetCode } from "./sync";
import { useWidget, type UseWidgetOptions } from "./useWidget";

export type WidgetProps = UseWidgetOptions & {
  /** Widget code, complete or still growing. */
  code: string;
  /** True while `code` is still growing; scripts run once it turns false. */
  streaming?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Renders model-generated HTML or SVG in a Safe Content Frame, streaming as `code` grows. */
export function Widget({
  code,
  streaming = false,
  className,
  style,
  ...options
}: WidgetProps) {
  const { ref, widget } = useWidget(options);

  useEffect(() => {
    if (widget) syncWidgetCode(widget, code, streaming);
  }, [widget, code, streaming]);

  return <div ref={ref} className={className} style={style} />;
}
