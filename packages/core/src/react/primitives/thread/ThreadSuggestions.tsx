import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import type { SuggestionState } from "../../../store/scopes/suggestion";
import { SuggestionByIndexProvider } from "../../providers/SuggestionByIndexProvider";

type SuggestionsComponentConfig = {
  /** Component used to render each suggestion */
  Suggestion: ComponentType;
};

export namespace ThreadPrimitiveSuggestions {
  export type Props =
    | {
        /** @deprecated Use the children render function instead. */
        components: SuggestionsComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each suggestion. Receives the suggestion. */
        children: (value: { suggestion: SuggestionState }) => ReactNode;
        components?: never;
      };
}

type SuggestionComponentProps = {
  components: SuggestionsComponentConfig;
};

const SuggestionComponent: FC<SuggestionComponentProps> = ({ components }) => {
  const Component = components.Suggestion;
  return <Component />;
};

export namespace ThreadPrimitiveSuggestionByIndex {
  export type Props = {
    index: number;
    components: SuggestionsComponentConfig;
  };
}

/**
 * Renders a single suggestion at the specified index.
 */
export const ThreadPrimitiveSuggestionByIndex: FC<ThreadPrimitiveSuggestionByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <SuggestionByIndexProvider index={index}>
          <SuggestionComponent components={components} />
        </SuggestionByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.components.Suggestion === next.components.Suggestion,
  );

ThreadPrimitiveSuggestionByIndex.displayName =
  "ThreadPrimitive.SuggestionByIndex";

const ThreadPrimitiveSuggestionsInner: FC<{
  children: (value: { suggestion: SuggestionState }) => ReactNode;
}> = ({ children }) => {
  const suggestionsLength = useAuiState(
    (s) => s.suggestions.suggestions.length,
  );

  return useMemo(() => {
    if (suggestionsLength === 0) return null;
    return Array.from({ length: suggestionsLength }, (_, index) => (
      <SuggestionByIndexProvider key={index} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) =>
            aui.suggestions().suggestion({ index }).getState()
          }
        >
          {(getItem) =>
            children({
              get suggestion() {
                return getItem();
              },
            })
          }
        </RenderChildrenWithAccessor>
      </SuggestionByIndexProvider>
    ));
  }, [suggestionsLength, children]);
};

/**
 * Renders all suggestions.
 */
export const ThreadPrimitiveSuggestionsImpl: FC<
  ThreadPrimitiveSuggestions.Props
> = ({ components, children }) => {
  if (components) {
    return (
      <ThreadPrimitiveSuggestionsInner>
        {() => <SuggestionComponent components={components} />}
      </ThreadPrimitiveSuggestionsInner>
    );
  }
  return (
    <ThreadPrimitiveSuggestionsInner>
      {children}
    </ThreadPrimitiveSuggestionsInner>
  );
};

ThreadPrimitiveSuggestionsImpl.displayName = "ThreadPrimitive.Suggestions";

export const ThreadPrimitiveSuggestions = memo(
  ThreadPrimitiveSuggestionsImpl,
  (prev, next) => {
    if (prev.children || next.children) {
      return prev.children === next.children;
    }
    return prev.components!.Suggestion === next.components!.Suggestion;
  },
);
