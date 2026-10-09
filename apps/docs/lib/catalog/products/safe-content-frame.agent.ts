import "server-only";

export const SAFE_CONTENT_FRAME_AGENT_PROMPTS = new Map<string, string>([
  [
    "safe-content-frame",
    `Add safe-content-frame to the project so untrusted HTML (model-generated UI, third-party widgets, MCP App resources) renders in a sandboxed iframe on its own domain. Preserve any other requirements in the user's setup instructions.

Read https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame for the API before writing code. Do not invent options or methods that the README does not list.

1. Inspect the selected project, its framework, and its package manager. Install safe-content-frame with that package manager. It has no runtime dependencies and works with any framework.
2. Find where the project renders untrusted HTML today, for example dangerouslySetInnerHTML, an iframe with srcdoc, or a sandboxed iframe. If there is no such place, ask what content should be sandboxed before adding one; in a setup session use \`ask "What HTML should Safe Content Frame render?" --wait\`.
3. Create one SafeContentFrame per product with a stable product identifier, for example new SafeContentFrame("my-app"). Render with renderHtml(html, container), or renderPdf / renderRaw for other content. Keep the returned RenderedFrame, await fullyLoadedPromiseWithTimeout(ms) before relying on the frame, and call dispose() when the content is replaced or the component unmounts. In React, do this in an effect with cleanup and pass an AbortSignal through the render options so an unmounted render is cancelled.
4. Communicate with the frame only through rendered.sendMessage(data), which is scoped to the frame's origin. When listening for messages from the frame, check both event.source === rendered.iframe.contentWindow and event.origin === rendered.origin.
5. Add extra iframe sandbox permissions only if the content needs them, through the sandbox option. allow-same-origin and allow-scripts are always present. Use enableBrowserCaching only when identical content should reuse one origin and its HTTP cache.
6. If the project uses assistant-ui's MCP Apps renderer, it already renders widgets with Safe Content Frame; configure it through that renderer instead of adding a second frame.
7. Build and typecheck. Render a sample that runs a script, confirm it displays, confirm the frame's origin is a subdomain of scf.auiusercontent.com, and confirm the content cannot read the host page's cookies or DOM.

Report where Safe Content Frame was added, the product identifier you chose, and the verification result.`,
  ],
]);
