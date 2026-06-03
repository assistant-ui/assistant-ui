import { useEffect, useMemo } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { AssistantToolProps as CoreAssistantToolProps } from "../..";
import {
  isStandaloneToolDisplay,
  makeToolCallTextComponent,
  type ToolCallText,
} from "./toolbox";

/**
 * Props used to register a tool from React.
 *
 * @deprecated Use a toolkit with `Tools({ toolkit })` and register it via
 * `useAui({ tools: Tools({ toolkit }) })` instead. See
 * https://assistant-ui.com/docs/migrations/toolkit-tools.
 */
export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = CoreAssistantToolProps<TArgs, TResult> & {
  /** Component used to render calls to this tool in assistant messages. */
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  /** Lightweight text rendered while a tool call is running or complete. */
  renderText?: ToolCallText<TArgs, TResult> | undefined;
};

/**
 * Registers a tool with the assistant model context while the component is
 * mounted.
 *
 * If `render` is provided, it is also installed as the renderer for matching
 * tool-call message parts. The registration is removed automatically when the
 * component unmounts or the tool definition changes.
 *
 * Pass a referentially stable tool object, such as one declared at module
 * scope or memoized with `useMemo`, to avoid re-registering on every render.
 *
 * @param tool - Tool definition and name to register.
 *
 * @deprecated Use a toolkit with `Tools({ toolkit })` and register it via
 * `useAui({ tools: Tools({ toolkit }) })` instead. See
 * https://assistant-ui.com/docs/migrations/toolkit-tools.
 *
 * @example
 * ```tsx
 * const weatherTool = {
 *   toolName: "get_weather",
 *   type: "frontend",
 *   description: "Get the weather for a city.",
 *   parameters: weatherSchema,
 *   execute: async ({ city }: { city: string }) => fetchWeather(city),
 *   render: WeatherToolUI,
 * } satisfies AssistantToolProps<{ city: string }, Weather>;
 *
 * function WeatherToolRegistration() {
 *   useAssistantTool(weatherTool);
 *   return null;
 * }
 * ```
 */
export const useAssistantTool = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const aui = useAui();

  const standalone = isStandaloneToolDisplay(tool);
  const renderTextComponent = useMemo(
    () =>
      tool.renderText ? makeToolCallTextComponent(tool.renderText) : undefined,
    [tool.renderText],
  );
  const render = tool.render ?? renderTextComponent;

  useEffect(() => {
    if (!render) return undefined;
    return aui.tools().setToolUI(tool.toolName, render, { standalone });
  }, [aui, tool.toolName, render, standalone]);

  useEffect(() => {
    // `render`, `renderText`, and `display` are client-only presentation
    // concerns and never reach the model.
    const { toolName, render, renderText, display, ...rest } = tool;
    const context = {
      tools: {
        [toolName]: rest,
      },
    };
    return aui.modelContext().register({
      getModelContext: () => context,
    });
  }, [aui, tool]);
};
