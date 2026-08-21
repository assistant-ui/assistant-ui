import type { ElementDoc } from "./element-docs";

const usageOnly = (usage: string): ElementDoc => ({ usage, props: [] });

export const AUI_ELEMENT_DOCS: Record<string, ElementDoc> = {
  "aui-thread":
    usageOnly(`import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread";

<AssistantRuntimeProvider runtime={runtime}>
  <Thread />
</AssistantRuntimeProvider>`),
  "aui-assistant-modal": usageOnly(
    `import { AssistantModal } from "@/components/assistant-ui/elements/assistant-modal";

<AssistantModal />`,
  ),
  "aui-assistant-sidebar": usageOnly(
    `import { AssistantSidebar } from "@/components/assistant-ui/elements/assistant-sidebar";

<AssistantSidebar>
  <main>{children}</main>
</AssistantSidebar>`,
  ),
  "aui-thread-list": usageOnly(
    `import { ThreadList } from "@/components/assistant-ui/elements/thread-list.kit";

<ThreadList />`,
  ),
  "aui-thread-list-sidebar": usageOnly(
    `import { ThreadListSidebar } from "@/components/assistant-ui/elements/threadlist-sidebar";

<ThreadListSidebar />`,
  ),
  "aui-voice": usageOnly(
    `import { VoiceOrb, VoiceConnectButton, VoiceMuteButton } from "@/components/assistant-ui/elements/voice";

<div>
  <VoiceOrb />
  <VoiceConnectButton />
  <VoiceMuteButton />
</div>`,
  ),
  "aui-reasoning": usageOnly(
    `import { ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText } from "@/components/assistant-ui/elements/reasoning";

<ReasoningRoot>
  <ReasoningTrigger />
  <ReasoningContent>
    <ReasoningText>{children}</ReasoningText>
  </ReasoningContent>
</ReasoningRoot>`,
  ),
  "aui-message-timing": usageOnly(
    `import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.kit";

<MessageTiming side="right" />`,
  ),
  "aui-context-display": usageOnly(
    `import { ContextDisplay } from "@/components/assistant-ui/elements/context-display";

<ContextDisplay.Ring modelContextWindow={128_000} />`,
  ),
  "aui-mcp-config": usageOnly(
    `import { McpConfigDialog } from "@/components/assistant-ui/elements/mcp-config";

<McpConfigDialog />`,
  ),
  "aui-attachment": usageOnly(
    `import { ComposerAddAttachment, ComposerAttachments, UserMessageAttachments } from "@/components/assistant-ui/elements/attachment";

<ComposerAttachments />
<ComposerAddAttachment />
<UserMessageAttachments />`,
  ),
  "aui-follow-up-suggestions": usageOnly(
    `import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions";

<ThreadFollowupSuggestions />`,
  ),
  "aui-tool-fallback": usageOnly(
    `import { ToolFallbackRoot, ToolFallbackTrigger, ToolFallbackContent, ToolFallbackArgs, ToolFallbackResult } from "@/components/assistant-ui/elements/tool-fallback";

<ToolFallbackRoot>
  <ToolFallbackTrigger toolName="search_web" status={{ type: "complete" }} />
  <ToolFallbackContent>
    <ToolFallbackArgs argsText={argsText} />
    <ToolFallbackResult result={result} />
  </ToolFallbackContent>
</ToolFallbackRoot>`,
  ),
  "aui-tool-group": usageOnly(
    `import { ToolGroupRoot, ToolGroupTrigger, ToolGroupContent } from "@/components/assistant-ui/elements/tool-group.kit";

<ToolGroupRoot>
  <ToolGroupTrigger count={3} />
  <ToolGroupContent>{toolCalls}</ToolGroupContent>
</ToolGroupRoot>`,
  ),
  "aui-quote": usageOnly(
    `import { SelectionToolbar, ComposerQuotePreview } from "@/components/assistant-ui/elements/quote";

<SelectionToolbar />
<ComposerQuotePreview />`,
  ),
  "aui-sources": usageOnly(
    `import { Source, SourceIcon, SourceTitle } from "@/components/assistant-ui/elements/sources.kit";

<Source href="https://assistant-ui.com">
  <SourceIcon url="https://assistant-ui.com" />
  <SourceTitle>assistant-ui</SourceTitle>
</Source>`,
  ),
  "aui-image": usageOnly(
    `import { Image } from "@/components/assistant-ui/elements/image";

<Image type="image" image={url} status={{ type: "complete" }} />`,
  ),
  "aui-file": usageOnly(
    `import { File } from "@/components/assistant-ui/elements/file";

<File type="file" filename="report.pdf" mimeType="application/pdf" data={data} />`,
  ),
  "aui-model-selector": usageOnly(
    `import { ModelSelector } from "@/components/assistant-ui/elements/model-selector";

<ModelSelector models={models} value={model} onValueChange={setModel} />`,
  ),
  "aui-composer-trigger-popover": usageOnly(
    `import { unstable_useMentionAdapter } from "@assistant-ui/react";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover";

function MentionPopover() {
  const mention = unstable_useMentionAdapter();
  return <ComposerTriggerPopover char="@" {...mention} />;
}`,
  ),
  "aui-directive-text": usageOnly(
    `import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { createDirectiveText } from "@/components/assistant-ui/elements/directive-text";

const DirectiveText = createDirectiveText(unstable_defaultDirectiveFormatter);`,
  ),
  "aui-markdown-text": usageOnly(
    `import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";

<MarkdownText />`,
  ),
  "aui-syntax-highlighter": usageOnly(
    `import { unstable_memoizeMarkdownComponents as memoizeMarkdownComponents } from "@assistant-ui/react-markdown";
import { SyntaxHighlighter } from "@/components/assistant-ui/elements/syntax-highlighter";

const defaultComponents = memoizeMarkdownComponents({
  SyntaxHighlighter,
});`,
  ),
  "aui-shiki-highlighter": usageOnly(
    `import { SyntaxHighlighter } from "@/components/assistant-ui/elements/shiki-highlighter";

<SyntaxHighlighter language="tsx" code={code} />`,
  ),
  "aui-mermaid-diagram": usageOnly(
    `import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { MermaidDiagram } from "@/components/assistant-ui/elements/mermaid-diagram";

<MarkdownTextPrimitive
  componentsByLanguage={{
    mermaid: { SyntaxHighlighter: MermaidDiagram },
  }}
/>`,
  ),
  "aui-generative-ui": usageOnly(
    `import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";

{renderGenerativeUI(spec, styledGenerativeUILibrary, { status: "done" })}`,
  ),
  "aui-tooltip-icon-button": usageOnly(
    `import { CopyIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";

<TooltipIconButton tooltip="Copy">
  <CopyIcon />
</TooltipIconButton>`,
  ),
  "aui-logos": usageOnly(
    `import { OpenAILogo, ClaudeLogo, GeminiLogo } from "@/components/assistant-ui/elements/logos";

<OpenAILogo />
<ClaudeLogo />
<GeminiLogo />`,
  ),
  "aui-heat-graph": usageOnly(
    `import { HeatGraph } from "@/components/assistant-ui/elements/heat-graph";

<HeatGraph data={activity} />`,
  ),
};
