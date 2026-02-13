import { type ComponentType, type FC, memo, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { SpanByIndexProvider } from "../../context/SpanByIndexProvider";

export namespace TracePrimitiveSpans {
  export type Props = {
    components: {
      Span: ComponentType;
    };
  };
}

export namespace TracePrimitiveSpanByIndex {
  export type Props = {
    index: number;
    components: TracePrimitiveSpans.Props["components"];
  };
}

export const TracePrimitiveSpanByIndex: FC<TracePrimitiveSpanByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <SpanByIndexProvider index={index}>
          <components.Span />
        </SpanByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.components.Span === next.components.Span,
  );

TracePrimitiveSpanByIndex.displayName = "TracePrimitive.SpanByIndex";

const TracePrimitiveSpansImpl: FC<TracePrimitiveSpans.Props> = ({
  components,
}) => {
  const spansLength = useAuiState((s) => s.trace.spans.length);

  const spanElements = useMemo(() => {
    if (spansLength === 0) return null;
    return Array.from({ length: spansLength }, (_, index) => (
      <TracePrimitiveSpanByIndex
        key={index}
        index={index}
        components={components}
      />
    ));
  }, [spansLength, components]);

  return spanElements;
};

export const TracePrimitiveSpans: FC<TracePrimitiveSpans.Props> = memo(
  TracePrimitiveSpansImpl,
  (prev, next) => prev.components.Span === next.components.Span,
);

TracePrimitiveSpans.displayName = "TracePrimitive.Spans";
