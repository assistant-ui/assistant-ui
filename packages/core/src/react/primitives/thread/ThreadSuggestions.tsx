import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { useShallowSelector } from "@assistant-ui/store/internal";
import type { SuggestionState } from "../../../store/scopes/suggestion";
import type { ThreadSuggestion } from "../../../runtime/interfaces/thread-runtime-core";
import { SuggestionByIndexProvider } from "../../providers/SuggestionByIndexProvider";

/**
 * A suggestion carries no id, so its identity is its content. Repeats of the
 * same content get an occurrence suffix, because React keys must be unique
 * and two suggestions that render the same thing are interchangeable.
 */
const toSuggestionKeys = (
  suggestions: readonly ThreadSuggestion[],
): string[] => {
  const seen = new Map<string, number>();
  return suggestions.map((suggestion) => {
    const content = JSON.stringify([
      suggestion.title,
      suggestion.label,
      suggestion.prompt,
    ]);
    const occurrence = seen.get(content) ?? 0;
    seen.set(content, occurrence + 1);
    return occurrence === 0 ? content : `${content}:${occurrence}`;
  });
};

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
  const suggestionKeys = useAuiState(
    useShallowSelector((s) => toSuggestionKeys(s.suggestions.suggestions)),
  );

  return useMemo(() => {
    if (suggestionKeys.length === 0) return null;
    return suggestionKeys.map((suggestionKey, index) => (
      <SuggestionByIndexProvider key={suggestionKey} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) =>
            aui.suggestions.suggestion({ index }).getState()
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
  }, [suggestionKeys, children]);
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
