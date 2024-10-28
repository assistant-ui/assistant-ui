import { highlightText } from "@/lib/utils";
import { SortedResult } from "fumadocs-core/server";
import { SharedProps } from "fumadocs-ui/components/dialog/search";
import { SearchDialog } from "fumadocs-ui/components/dialog/search";
import { useEffect, useState } from "react";
import {
  ChunkGroup,
  ChunkMetadata,
  SearchOverGroupsReqPayload,
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

export type GroupChunk = {
  chunks: ChunkWithHighlights[];
  group: ChunkGroup;
};

export type GroupSearchResults = {
  groups: GroupChunk[];
  requestID: string;
};

const trieveSDK = new TrieveSDK({
  apiKey: process.env["NEXT_PUBLIC_TRIEVE_API_KEY"] as string,
  datasetId: process.env["NEXT_PUBLIC_TRIEVE_DATASET_ID"] as string,
});

function groupResults(results: GroupChunk[]): SortedResult[] {
  const grouped: SortedResult[] = [];

  for (const result of results) {
    grouped.push({
      id: result.group.id,
      type: "page",
      url: result.chunks[0]?.chunk.link || "",
      content: result.group.name,
    });

    for (const c of result.chunks) {
      const chunk = c.chunk;
      grouped.push({
        id: chunk.tracking_id || "",
        type:
          chunk.chunk_html === chunk.metadata["section"] ? "heading" : "text",
        url: chunk.metadata["section_id"]
          ? `${chunk.link}#${chunk.metadata["section_id"]}`
          : chunk.link || "",
        content: chunk.chunk_html || "",
      });
    }
  }
  return grouped;
}

export default function TrieveSearchDialog(props: SharedProps) {
  const [results, setResults] = useState<SortedResult[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!search) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const request: SearchOverGroupsReqPayload = {
      query: search,
      search_type: "fulltext",
      score_threshold: 1,
      group_size: 3,
    };

    setIsLoading(true);
    trieveSDK.searchOverGroups(request).then((data) => {
      const resultsWithHighlight = data.results.map((group) => {
        group.chunks = group.chunks.map((chunk) => {
          const c = chunk.chunk as unknown as Chunk;
          return {
            ...chunk,
            chunk: {
              ...chunk.chunk,
              highlight: highlightText(search, c.chunk_html),
            },
          };
        });
        return group;
      });

      const trieveResults = {
        groups: resultsWithHighlight,
        requestID: data.id,
      } as unknown as GroupSearchResults;

      const results = groupResults(trieveResults.groups);

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
      footer={
        <a href="https://trieve.ai/?ref=assistant-ui" target="_blank">
          <div className="text-muted-foreground text-end text-xs">
            Powered by <span className="font-semibold">Trieve.ai</span>
          </div>
        </a>
      }
      {...props}
    />
  );
}
