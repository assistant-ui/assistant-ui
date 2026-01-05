import type { z } from "zod";

export interface ToolUIComponentConfig<TSchema extends z.ZodType> {
  /** Component name (must match server registration) */
  name: string;
  /** Props schema for validation */
  schema: TSchema;
  /** Render function */
  render: (props: z.infer<TSchema>) => HTMLElement | string;
}

export interface ToolUIRuntime {
  /** Register a component */
  register: <TSchema extends z.ZodType>(
    config: ToolUIComponentConfig<TSchema>,
  ) => void;
  /** Start the runtime (call after all components registered) */
  start: () => void;
}

/**
 * Create a runtime for tool UI components in the iframe.
 *
 * @example
 * ```typescript
 * const runtime = createToolUIRuntime();
 *
 * runtime.register({
 *   name: "WeatherCard",
 *   schema: WeatherPropsSchema,
 *   render: (props) => `
 *     <div class="weather-card">
 *       <h2>${props.location}</h2>
 *       <p>${props.temperature}°</p>
 *     </div>
 *   `,
 * });
 *
 * runtime.start();
 * ```
 */
export function createToolUIRuntime(): ToolUIRuntime {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components = new Map<string, ToolUIComponentConfig<any>>();
  let currentProps: Record<string, unknown> | null = null;

  function register<TSchema extends z.ZodType>(
    config: ToolUIComponentConfig<TSchema>,
  ) {
    components.set(config.name, config);
  }

  function renderComponent(
    componentName: string,
    props: Record<string, unknown>,
  ) {
    const config = components.get(componentName);
    if (!config) {
      throw new Error(`Unknown component: ${componentName}`);
    }

    const parseResult = config.schema.safeParse(props);
    if (!parseResult.success) {
      throw new Error(`Invalid props: ${parseResult.error.message}`);
    }

    const output = config.render(parseResult.data);
    const container = document.getElementById("root");

    if (container) {
      if (typeof output === "string") {
        container.innerHTML = output;
      } else {
        container.innerHTML = "";
        container.appendChild(output);
      }

      // Report height to parent
      requestAnimationFrame(() => {
        const height = container.scrollHeight;
        window.parent.postMessage({ type: "resize", payload: height }, "*");
      });
    }
  }

  function start() {
    // Listen for messages from parent
    window.addEventListener("message", (event) => {
      // SECURITY: Only accept messages from our parent window
      if (event.source !== window.parent) return;

      const { type, props, component } = event.data || {};

      switch (type) {
        case "render":
          currentProps = props;
          try {
            // Component name comes from URL or message
            const componentName =
              component ||
              new URLSearchParams(window.location.search).get("component");
            if (componentName) {
              // The result contains the tool output data
              // Parse it if it's a string (MCP returns JSON strings)
              let resultData = (props as { result?: unknown })?.result;
              if (typeof resultData === "string") {
                try {
                  resultData = JSON.parse(resultData);
                } catch {
                  // Keep as string if not valid JSON
                }
              }
              // Handle MCP content format: { content: [{ type: "text", text: "..." }] }
              if (
                resultData &&
                typeof resultData === "object" &&
                "content" in resultData
              ) {
                const content = (
                  resultData as {
                    content: Array<{ type: string; text?: string }>;
                  }
                ).content;
                const textContent = content?.find((c) => c.type === "text");
                if (textContent?.text) {
                  try {
                    resultData = JSON.parse(textContent.text);
                  } catch {
                    // Keep as-is if not valid JSON
                  }
                }
              }
              // Handle component result format: { component: "Name", props: {...}, text: "..." }
              // Extract the props if the result has a component/props structure
              if (
                resultData &&
                typeof resultData === "object" &&
                "props" in resultData &&
                typeof (resultData as { props?: unknown }).props === "object"
              ) {
                resultData = (resultData as { props: Record<string, unknown> })
                  .props;
              }
              renderComponent(componentName, resultData ?? props);
            }
          } catch (error) {
            window.parent.postMessage(
              {
                type: "error",
                payload:
                  error instanceof Error ? error.message : "Render failed",
              },
              "*",
            );
          }
          break;

        case "update":
          if (currentProps) {
            const updatedProps = { ...currentProps, ...props };
            currentProps = updatedProps;
            // Re-render with updated props
            const componentName = new URLSearchParams(
              window.location.search,
            ).get("component");
            if (componentName) {
              renderComponent(componentName, updatedProps);
            }
          }
          break;
      }
    });

    // Signal ready
    window.parent.postMessage({ type: "ready" }, "*");
  }

  return { register, start };
}

/**
 * Helper to emit actions to parent.
 */
export function emitAction(actionId: string) {
  window.parent.postMessage({ type: "action", payload: actionId }, "*");
}

/**
 * Helper to emit result (for human-in-loop tools).
 */
export function emitResult(result: unknown) {
  window.parent.postMessage({ type: "addResult", payload: result }, "*");
}
