import { type ComponentType, type FC, memo, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { SpanByIndexProvider } from "../../context/SpanByIndexProvider";

export namespace SpanPrimitiveChildren {
  export type Props = {
    components: {
      Span: ComponentType;
    };
  };
}

export namespace SpanPrimitiveChildByIndex {
  export type Props = {
    index: number;
    components: SpanPrimitiveChildren.Props["components"];
  };
}

export const SpanPrimitiveChildByIndex: FC<SpanPrimitiveChildByIndex.Props> =
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

SpanPrimitiveChildByIndex.displayName = "SpanPrimitive.ChildByIndex";

const SpanPrimitiveChildrenImpl: FC<SpanPrimitiveChildren.Props> = ({
  components,
}) => {
  const childrenLength = useAuiState((s) => s.span.children.length);

  const childElements = useMemo(() => {
    if (childrenLength === 0) return null;
    return Array.from({ length: childrenLength }, (_, index) => (
      <SpanPrimitiveChildByIndex
        key={index}
        index={index}
        components={components}
      />
    ));
  }, [childrenLength, components]);

  return childElements;
};

export const SpanPrimitiveChildren: FC<SpanPrimitiveChildren.Props> = memo(
  SpanPrimitiveChildrenImpl,
  (prev, next) => prev.components.Span === next.components.Span,
);

SpanPrimitiveChildren.displayName = "SpanPrimitive.Children";
