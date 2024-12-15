import { Root as HastRoot } from "hast";
import { createElement, FC, Fragment, useEffect, useState } from "react";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeReact from "rehype-react";
import * as prod from "react/jsx-runtime";
import { visit } from "unist-util-visit";
import { ChunkMetadata } from "trieve-ts-sdk";
import { useTrieveExtras } from "./useTrieveRuntime";

function rehypeWrapFirstHeading(
  options: { headerUrl?: string | undefined } = {},
) {
  const { headerUrl = "#" } = options; // Default to '#' if no URL is provided

  return (tree: HastRoot) => {
    let firstHeadingFound = false;

    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (!firstHeadingFound && /^h[1-6]$/.test(node.tagName)) {
        firstHeadingFound = true;

        // Create a new link node with the specified headerUrl
        const linkNode = {
          type: "element",
          tagName: "a",
          properties: {
            href: headerUrl,
          },
          children: [Object.assign({}, node)],
        };

        // Replace the heading node with the link node
        parent.children[index] = linkNode as any;
      }
    });

    if (!firstHeadingFound) {
      // If no heading was found, insert a "Source" link at the top of the document
      const sourceHeadingNode = {
        type: "element",
        tagName: "h2",
        children: [
          {
            type: "element",
            tagName: "a",
            properties: {
              href: headerUrl,
            },
            children: [
              {
                type: "text",
                value: "Source",
              },
            ],
          },
        ],
      };
      tree.children.unshift(sourceHeadingNode as any);
    }
  };
}

const TrieveLink = ({
  citation,
  position,
  ...props
}: CitationHoverContentProps) => {
  const trackLinkClick = useTrieveExtras((t) => t.trackLinkClick);
  return (
    <a
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        trackLinkClick(citation, position);
      }}
      {...props}
    />
  );
};

export type CitationHoverContentProps = {
  citation: ChunkMetadata;
  position: number;
};

export const TrieveCitationHoverContent: FC<CitationHoverContentProps> = ({
  citation,
  position,
}) => {
  const [Content, setContent] = useState<React.ReactNode>(
    createElement(Fragment),
  );

  useEffect(() => {
    (async function () {
      if (!citation.chunk_html) return;

      const file = await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeSanitize)
        .use(rehypeWrapFirstHeading, { headerUrl: citation.link ?? undefined })
        .use(rehypeReact, {
          Fragment: prod.Fragment,
          jsx: prod.jsx,
          jsxs: prod.jsxs,
          components: {
            a: ({ node, ...rest }: { node: unknown }) => (
              <TrieveLink citation={citation} position={position} {...rest} />
            ),
          },
        })
        .process(citation.chunk_html);

      setContent(file.result);
    })();
  }, [citation, position]);

  return <>{Content}</>;
};
