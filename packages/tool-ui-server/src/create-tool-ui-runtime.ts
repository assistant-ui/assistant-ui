import type { z } from "zod";
import type { AUIGlobals, WindowAUI } from "./types/protocol";

declare global {
  interface Window {
    aui?: WindowAUI;
    __initAUIGlobals?: (globals: AUIGlobals) => void;
  }
}

export interface ToolUIComponentConfig<TSchema extends z.ZodType> {
  name: string;
  schema: TSchema;
  render: (props: z.infer<TSchema>) => HTMLElement | string;
}

export interface ToolUIRuntime {
  register: <TSchema extends z.ZodType>(
    config: ToolUIComponentConfig<TSchema>,
  ) => void;
  start: () => void;
}

export function getGlobals(): AUIGlobals | null {
  if (typeof window === "undefined" || !window.aui) return null;
  return {
    theme: window.aui.theme,
    locale: window.aui.locale,
    displayMode: window.aui.displayMode,
    previousDisplayMode: window.aui.previousDisplayMode,
    maxHeight: window.aui.maxHeight,
    toolInput: window.aui.toolInput,
    toolOutput: window.aui.toolOutput,
    widgetState: window.aui.widgetState,
    userAgent: window.aui.userAgent,
    safeArea: window.aui.safeArea,
    userLocation: window.aui.userLocation,
    toolResponseMetadata: window.aui.toolResponseMetadata,
    view: window.aui.view,
  };
}

export function onGlobalsChange(
  callback: (changed: Partial<AUIGlobals>) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ globals: Partial<AUIGlobals> }>;
    callback(customEvent.detail.globals);
  };

  window.addEventListener("aui:set_globals", handler);
  return () => window.removeEventListener("aui:set_globals", handler);
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.callTool(name, args);
}

export function setWidgetState(state: Record<string, unknown> | null): void {
  if (typeof window === "undefined" || !window.aui) {
    console.warn("AUI bridge not available");
    return;
  }
  window.aui.setWidgetState(state);
}

export async function requestDisplayMode(
  mode: "inline" | "fullscreen" | "pip",
): Promise<{ mode: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.requestDisplayMode({ mode });
}

export async function sendFollowUpMessage(prompt: string): Promise<void> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.sendFollowUpMessage({ prompt });
}

export async function requestModal(options: {
  title?: string;
  params?: Record<string, unknown>;
}): Promise<void> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.requestModal(options);
}

export function requestClose(): void {
  if (typeof window === "undefined" || !window.aui) {
    console.warn("AUI bridge not available");
    return;
  }
  window.aui.requestClose();
}

export function openExternal(href: string): void {
  if (typeof window === "undefined" || !window.aui) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  window.aui.openExternal({ href });
}

export function notifyIntrinsicHeight(height: number): void {
  if (typeof window === "undefined" || !window.aui) {
    window.parent?.postMessage({ type: "resize", payload: height }, "*");
    return;
  }
  window.aui.notifyIntrinsicHeight(height);
}

export async function uploadFile(file: File): Promise<{ fileId: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.uploadFile(file);
}

export async function getFileDownloadUrl(
  fileId: string,
): Promise<{ downloadUrl: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.getFileDownloadUrl({ fileId });
}

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

      requestAnimationFrame(() => {
        const firstChild = container.firstElementChild as HTMLElement | null;
        let height = container.scrollHeight;
        if (firstChild) {
          const style = window.getComputedStyle(firstChild);
          const marginTop = parseFloat(style.marginTop) || 0;
          const marginBottom = parseFloat(style.marginBottom) || 0;
          height = Math.max(
            height,
            firstChild.offsetHeight + marginTop + marginBottom,
          );
        }
        window.parent.postMessage({ type: "resize", payload: height }, "*");
      });
    }
  }

  function start() {
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) return;

      const { type, props, component } = event.data || {};

      switch (type) {
        case "render":
          currentProps = props;
          try {
            const componentName =
              component ||
              new URLSearchParams(window.location.search).get("component");
            if (componentName) {
              let resultData = (props as { result?: unknown })?.result;
              if (typeof resultData === "string") {
                try {
                  resultData = JSON.parse(resultData);
                } catch {
                  // Keep as string if not valid JSON
                }
              }
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

    window.parent.postMessage({ type: "ready" }, "*");
  }

  return { register, start };
}

export function emitAction(actionId: string) {
  window.parent.postMessage({ type: "action", payload: actionId }, "*");
}

export function emitResult(result: unknown) {
  window.parent.postMessage({ type: "addResult", payload: result }, "*");
}
