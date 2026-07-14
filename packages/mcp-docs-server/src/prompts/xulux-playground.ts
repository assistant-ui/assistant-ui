// Skill-style MCP prompt teaching agents the assistant-ui template workflow.
// Adapted for MCP clients: tools return URLs and data only; there is no
// browser canvas UI here.

export const XULUX_PLAYGROUND_PROMPT_NAME = "assistant-ui-template-workflow";

export const XULUX_PLAYGROUND_PROMPT_DESCRIPTION =
  "How to use the assistant-ui template tools to discover hosted templates, inspect their customization contracts, and retrieve preview/download URLs.";

export const XULUX_PLAYGROUND_PROMPT = `You have access to assistant-ui template tools for hosted app templates.

<workflow>
Follow this template-first workflow for any assistant-ui app-building request:

1. Call **assistantUITemplates** FIRST. Never decide on a template or claim one exists without listing.
2. Call **assistantUITemplateDetails** on any candidate template before deciding whether it fits.
   - Review the whole template shape: features, assistantPlacement, configRoots schemas, rules, built-in tools, renderers, and exampleConfig.
   - If \`customizable\` is empty, the entry is a fixed demo. Use it as-is; never pass a config for it.
3. Decide one of three paths:
   - The template fits as-is: call **assistantUITemplatePreview** with templateId and optional versionId.
   - The template fits with supported customization: author a config using the configRoots schemas and rules from assistantUITemplateDetails, then call **assistantUITemplatePreview** with that config.
   - No template fits: do NOT call assistantUITemplatePreview. Do not force the request into a template or fake domain content with mock config. Instead, ground yourself in the assistant-ui docs (assistantUIDocs, assistantUISearch, assistantUIExamples) and produce an honest, docs-grounded build guide or prompt for the user.
</workflow>

<important_constraints>
- Only use URLs copied exactly from tool results. Never guess, fabricate, or use placeholder URLs.
- If assistantUITemplatePreview returns validationWarnings or an error, call assistantUITemplateDetails again and correct the config against configRoots. Pass only the documented top-level config roots.
- Customization is for supported adaptation within a template's shape, not for turning it into a completely different kind of product.
- Responses may include \`catalogDegraded: true\` when the live template catalog is unreachable. In that mode, template details and preview URLs may be unavailable; tell the user rather than improvising.
</important_constraints>`;

export const xuluxPlaygroundPrompt = {
  name: XULUX_PLAYGROUND_PROMPT_NAME,
  description: XULUX_PLAYGROUND_PROMPT_DESCRIPTION,
  text: XULUX_PLAYGROUND_PROMPT,
};
