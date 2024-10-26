import { highlightText } from "@/lib/utils";
import { SortedResult } from "fumadocs-core/server";
import { SharedProps } from "fumadocs-ui/components/dialog/search";
import { SearchDialog } from "fumadocs-ui/components/dialog/search";
import { useEffect, useState } from "react";
import {
  AutocompleteReqPayload,
  ChunkMetadata,
  TrieveSDK,
} from "trieve-ts-sdk";

export type Chunk = Omit<ChunkMetadata, "metadata"> & {
  highlight?: string | undefined | null;
  highlightTitle?: string | undefined | null;
  highlightDescription?: string | undefined | null;
  metadata: {
    [key: string]: string;
  };
};

type ChunkWithHighlights = {
  chunk: Chunk;
  highlights: string[];
};

export type SearchResults = {
  chunks: ChunkWithHighlights[];
  requestID: string;
};

export default function TrieveSearchDialog(props: SharedProps) {
  let trieveSDK = new TrieveSDK({
    apiKey: "tr-94tqT16o97Txym7OZc1CRaJOpsyUD1ul",
    datasetId: "72dba745-7748-46ac-8102-f5765f1ba9ac",
  });

  const [results, setResults] = useState<SortedResult[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const capitalizeWord = (word: string): string => {
    // If the word is 2-4 characters and all uppercase, keep it uppercase
    if (word.length <= 3 && word.toUpperCase() === word) {
      return word;
    }

    // If word is likely an acronym (all caps, possibly with numbers)
    if (word.length <= 3 && /^[A-Z0-9]+$/i.test(word)) {
      return word.toUpperCase();
    }

    // Handle regular words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  const parseChunk = (item: ChunkWithHighlights) => {
    let descriptionHtml = item.highlights
      ? item.highlights.join("...")
      : item.chunk.chunk_html || "";
    const $descriptionHtml = document.createElement("div");
    $descriptionHtml.innerHTML = descriptionHtml;
    $descriptionHtml.querySelectorAll("b").forEach((b) => {
      return b.replaceWith(b.textContent || "");
    });
    let descriptionText = Array.from($descriptionHtml.children)
      .map((element) => element.textContent || "")
      .filter((text) => text.trim() !== "")
      .filter((text, index, array) => array.indexOf(text) === index)
      .filter((text) => !text.includes("Next") && !text.includes("Previous"));

    const chunkHtmlHeadingsDiv = document.createElement("div");
    chunkHtmlHeadingsDiv.innerHTML = item.chunk.chunk_html || "";
    const chunkHtmlHeadings = chunkHtmlHeadingsDiv.querySelectorAll(
      "h1, h2, h3, h4, h5, h6",
    );

    const $firstHeading = chunkHtmlHeadings[0] ?? document.createElement("h1");
    $firstHeading?.querySelectorAll(":not(mark)")?.forEach((tag) => {
      return tag.replaceWith(tag.textContent || "");
    });

    const cleanFirstHeading = $firstHeading?.innerHTML;

    let title = `${
      cleanFirstHeading ||
      item.chunk.metadata?.["title"] ||
      item.chunk.metadata?.["page_title"] ||
      item.chunk.metadata?.["name"]
    }`.replace("#", "");

    if (!title.trim() || title == "undefined") {
      return null;
    }

    const linkSuffix = (text: string) => `#:~:text=${encodeURIComponent(text)}`;

    const link = `${
      item.chunk.link?.endsWith("/")
        ? item.chunk.link.slice(0, -1)
        : item.chunk.link
    }`;

    const pageTitle = item.chunk.link
      ?.split("/")
      .slice(3, -1)
      .map((word) => {
        return word.split("-").map(capitalizeWord).join(" ");
      })
      .join(" > ");

    let results: SortedResult[] = [
      {
        id: `${link}`,
        content: pageTitle || title,
        type: "page",
        url: `${link}`,
      },
    ];

    descriptionText.forEach((description) => {
      if (description.trim() !== "") {
        results.push({
          id: `${link}${linkSuffix(description)}`,
          content: description,
          type: "text",
          url: `${link}${linkSuffix(description)}`,
        });
      }
    });

    return results as SortedResult[];
  };

  useEffect(() => {
    if (!search) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let request: AutocompleteReqPayload = {
      query: search,
      search_type: "fulltext",
      extend_results: true,
      score_threshold: 1,
    };

    setIsLoading(true);
    trieveSDK.autocomplete(request).then((data) => {
      const resultsWithHighlight = data.chunks
        .filter((chunk, index, array) => {
          const currentScore = chunk.score;
          const nextScore = array[index + 1]?.score;
          return Math.abs(currentScore - (nextScore ?? 0.0)) >= 0.05;
        })
        .map((chunk) => {
          const c = chunk.chunk as unknown as Chunk;
          return {
            ...chunk,
            chunk: {
              ...chunk.chunk,
              highlight: highlightText(search, c.chunk_html),
            },
          };
        });

      const trieveResults = {
        chunks: resultsWithHighlight,
        requestID: data.id,
      } as unknown as SearchResults;

      const results = trieveResults.chunks
        .map((item) => {
          return parseChunk(item);
        })
        .filter((item) => item !== null)
        .flat() as SortedResult[];

      setResults(results);
      setIsLoading(false);
    });
  }, [search]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={results}
      isLoading={isLoading}
      {...props}
    />
  );
}
