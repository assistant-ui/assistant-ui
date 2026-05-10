import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { SuggestionConfig } from "../../store/scopes/suggestions";

export type AssistantSuggestionProps = SuggestionConfig;

export const useAssistantSuggestion = (
  suggestion: AssistantSuggestionProps,
) => {
  const aui = useAui();

  const isString = typeof suggestion === "string";
  const title = isString ? suggestion : suggestion.title;
  const label = isString ? "" : suggestion.label;
  const prompt = isString ? suggestion : suggestion.prompt;

  useEffect(() => {
    return aui.suggestions().add({ title, label, prompt });
  }, [aui, title, label, prompt]);
};
