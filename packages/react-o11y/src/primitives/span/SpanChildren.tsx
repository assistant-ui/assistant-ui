import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import type { SpanState } from "../../o11y-scope";
import { SpanByIndexProvider } from "../../context/SpanByIndexProvider";

type SpanChildrenComponentConfig = {
  Span: ComponentType;
};

export namespace SpanPrimitiveChildren {
  export type Props =
    | {
        components: SpanChildrenComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each child span. Receives the span. */
        children: (value: { span: SpanState }) => ReactNode;
        components?: never;
      };
}

export namespace SpanPrimitiveChildByIndex {
  export type Props = {
    index: number;
    components: SpanChildrenComponentConfig;
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

const SpanPrimitiveChildrenInner: FC<{
  children: (value: { span: SpanState }) => ReactNode;
}> = ({ children }) => {
  const childrenLength = useAuiState((s) => s.span.children.length);

  return useMemo(() => {
    if (childrenLength === 0) return null;
    return Array.from({ length: childrenLength }, (_, index) => (
      <SpanByIndexProvider key={index} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) => aui.span().getState()}
        >
          {(getItem) =>
            children({
              get span() {
                return getItem();
              },
            })
          }
        </RenderChildrenWithAccessor>
      </SpanByIndexProvider>
    ));
  }, [childrenLength, children]);
};

const SpanPrimitiveChildrenImpl: FC<SpanPrimitiveChildren.Props> = ({
  components,
  children,
}) => {
  if (components) {
    return (
      <SpanPrimitiveChildrenInner>
        {() => <components.Span />}
      </SpanPrimitiveChildrenInner>
    );
  }
  return <SpanPrimitiveChildrenInner>{children}</SpanPrimitiveChildrenInner>;
};

export const SpanPrimitiveChildren: FC<SpanPrimitiveChildren.Props> = memo(
  SpanPrimitiveChildrenImpl,
  (prev, next) => {
    if (prev.children || next.children) {
      return prev.children === next.children;
    }
    return prev.components!.Span === next.components!.Span;
  },
);

SpanPrimitiveChildren.displayName = "SpanPrimitive.Children";
