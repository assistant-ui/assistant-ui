"use client";

import { MarkdownText as KitMarkdownText } from "@assistant-ui/ui/components/assistant-ui/markdown-text";
import { memo } from "react";

import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";

const components = { SyntaxHighlighter };

const MarkdownTextImpl = () => <KitMarkdownText components={components} />;

export const MarkdownText = memo(MarkdownTextImpl);
