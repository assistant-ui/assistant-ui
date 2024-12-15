"use client";

import {
  getExternalStoreMessage,
  TextContentPartProvider,
  useContentPartText,
  useMessage,
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { visit, SKIP } from "unist-util-visit";
import remarkGfm from "remark-gfm";
import { TrieveMessage } from "../trieve/TrieveMessage";
import { Root } from "mdast";
import type { MakeMarkdownTextProps } from "@assistant-ui/react-markdown";
import { CitationHoverContentProps } from "./TrieveCitationHoverContent";
import { ComponentType } from "react";
import { TrieveCitation } from "./TrieveCitation";

function removeFootnoteDefinitions() {
  return (tree: Root) => {
    visit(tree, "footnoteDefinition", (_, index, parent) => {
      if (parent && index !== undefined) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      return undefined;
    });
  };
}

function generateDummyCitations(citationCount: number) {
  return Array.from(
    { length: citationCount },
    (_, i) => `\n[^${i}]: dummy`,
  ).join("");
}

export type TrieveMarkdownTextProps = Omit<
  MakeMarkdownTextProps,
  "components"
> & {
  components?:
    | (NonNullable<MakeMarkdownTextProps["components"]> & {
        CitationHoverContent?:
          | ComponentType<CitationHoverContentProps>
          | undefined;
      })
    | undefined;
  smooth?: boolean;
};

export const makeTrieveMarkdownText = (options?: TrieveMarkdownTextProps) => {
  const { CitationHoverContent, ...components } = options?.components ?? {};
  const MarkdownText = makeMarkdownText({
    ...options,
    remarkPlugins: [
      remarkGfm,
      removeFootnoteDefinitions,
      {
        plugins: options?.remarkPlugins ?? [],
      },
    ],

    components: {
      sup: (props) => (
        <TrieveCitation
          CitationHoverContent={CitationHoverContent}
          {...props}
        />
      ),
      ...components,
    },
  });

  const MarkdownTextWithFootnotes = () => {
    const message = useMessage();
    const citationCount =
      getExternalStoreMessage<TrieveMessage>(message)?.citations?.length ?? 0;

    const { text, status } = useContentPartText();
    const appendText = "\n\n" + generateDummyCitations(citationCount);
    return (
      <TextContentPartProvider
        text={text + appendText}
        isRunning={status.type === "running"}
      >
        <MarkdownText />
      </TextContentPartProvider>
    );
  };

  return MarkdownTextWithFootnotes;
};
