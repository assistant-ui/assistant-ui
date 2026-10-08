import type { AssistantDataUIProps, Toolkit } from "@assistant-ui/react";

/**
 * What a file in `webview/fixture-ui/` registers for the rich fixtures in
 * `src/fixtures/rich/`: tool UIs by tool name and data UIs by data part name.
 */
export type FixtureUI = {
  tools?: Toolkit;
  dataUIs?: readonly AssistantDataUIProps[];
};

/** Types the default export of a file in `webview/fixture-ui/`. */
export const defineFixtureUI = (ui: FixtureUI) => ui;
