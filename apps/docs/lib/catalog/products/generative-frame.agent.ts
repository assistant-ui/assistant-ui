import "server-only";

export const GENERATIVE_FRAME_AGENT_PROMPTS = new Map<string, string>([
  [
    "generative-frame",
    `Add generative-frame to the project so the model can show HTML and SVG widgets that stream into a sandboxed frame while it writes them. Preserve any other requirements in the user's setup instructions.

Read https://www.assistant-ui.com/generative-frame/docs and https://github.com/assistant-ui/assistant-ui/tree/main/packages/generative-frame for the API before writing code. Do not invent options or methods that the docs do not list.

1. Inspect the selected project, its framework, its package manager, and whether it already uses assistant-ui. Install generative-frame with that package manager.
2. If the project uses assistant-ui (@assistant-ui/react), use generative-frame/assistant-ui: create the toolkit once with createWidgetToolkit(), pass widgets.toolkit to Tools({ toolkit }) in the AuiConfig given to AssistantRuntimeProvider, and call useWidgetInstructions(widgets.tools) inside the provider. With the default frontend execution, forward the tool schemas from the server route with frontendTools from @assistant-ui/ai-sdk. Do not add a second renderer for show_widget.
3. Without assistant-ui, add the model tools from generative-frame/tools (createWidgetTools, and toAISDKTools(tools, { jsonSchema }) for the AI SDK) and render show_widget calls with <Widget code streaming tokens /> from generative-frame/react, or createWidget from the core entry outside React. Route the widget's onPrompt to the app's send-message function.
4. Keep the default Content Security Policy. Widen it only with the csp option when the user names an origin the widgets need.
5. If the project has its own component library and the user wants model UI built from it, add spec mode: defineCatalog from generative-frame/spec with the components to expose, and pass catalog and components to createWidgetToolkit (or SpecRenderer in plain React).
6. Build and typecheck. Ask the assistant for a small chart, confirm the widget streams into the thread, resizes to its content, follows the light and dark theme, and that a button calling sendPrompt sends a message.

Report where the widget tools were added, whether spec mode was set up, and the verification result.`,
  ],
]);
