import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { AssistantToolProps as CoreAssistantToolProps } from "../..";

/**
 * Props used to register a tool from React.
 */
export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = CoreAssistantToolProps<TArgs, TResult> & {
  /** Component used to render calls to this tool in assistant messages. */
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  /**
   * When true, this tool is contributed as a deferred tool — adapters that
   * support progressive disclosure (Anthropic Tool Search Tool, OpenAI tool
   * filter) translate it to a searchable catalog rather than shipping it on
   * every request. Adapters without native support fall back to treating it
   * as a normal tool and emit a console warning past 50 deferred tools.
   */
  deferLoading?: boolean | undefined;
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

  useEffect(() => {
    if (!tool.render) return undefined;
    return aui.tools().setToolUI(tool.toolName, tool.render);
  }, [aui, tool.toolName, tool.render]);

  useEffect(() => {
    const { toolName, render, deferLoading, ...rest } = tool;
    const context = deferLoading
      ? { deferredTools: { [toolName]: rest } }
      : { tools: { [toolName]: rest } };
    return aui.modelContext().register({
      getModelContext: () => context,
    });
  }, [aui, tool]);
};
