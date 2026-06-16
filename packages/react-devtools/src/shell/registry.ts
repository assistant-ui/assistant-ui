import type { ComponentType } from "react";
import type { ApiInfo } from "../data/types";
import { ActivityTab } from "./tabs/ActivityTab";
import { ContextTab } from "./tabs/ContextTab";
import { RawTab } from "./tabs/RawTab";
import { ThreadTab } from "./tabs/ThreadTab";

export interface DevToolsTabContext {
  /** The id of the assistant instance the panel is currently inspecting. */
  apiId: number;
  /** Projected, render-ready data for the inspected instance. */
  data: ApiInfo;
  /** Clears the buffered event log for an instance. */
  clearEvents: (apiId: number) => void;
  /** The resolved theme of the panel. */
  theme: "light" | "dark";
}

export interface DevToolsPanelPlugin {
  /** Stable identifier used as the tab key. */
  id: string;
  /** Tab label shown in the navigation bar. */
  label: string;
  /** Lower numbers sort earlier; builtins occupy 10, 20, 30, 40. */
  order?: number;
  /** When provided and it returns false, the tab is hidden for the current instance. */
  isAvailable?: (ctx: DevToolsTabContext) => boolean;
  /** The tab body. Receives the tab context as props. */
  Component: ComponentType<DevToolsTabContext>;
}

export const createDevToolsPlugin = (
  plugin: DevToolsPanelPlugin,
): DevToolsPanelPlugin => plugin;

export const builtinPlugins: DevToolsPanelPlugin[] = [
  { id: "thread", label: "Thread", order: 10, Component: ThreadTab },
  { id: "context", label: "Context", order: 20, Component: ContextTab },
  { id: "activity", label: "Activity", order: 30, Component: ActivityTab },
  { id: "raw", label: "Raw", order: 40, Component: RawTab },
];
