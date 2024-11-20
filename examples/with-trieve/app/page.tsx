"use client";

import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
import {
  makeTrieveMarkdownText,
  TrieveComposer,
  TrieveThreadWelcome,
  useTrieveExtras,
  useTrieveRuntime,
} from "@assistant-ui/react-trieve";
import { TrieveSDK } from "trieve-ts-sdk";

const TrieveMarkdownText = makeTrieveMarkdownText();

const trieve = new TrieveSDK({
  baseUrl: process.env["NEXT_PUBLIC_TRIEVE_API_URL"]!,
  apiKey: process.env["NEXT_PUBLIC_TRIEVE_API_KEY"]!,
  datasetId: process.env["NEXT_PUBLIC_TRIEVE_DATASET_ID"]!,
});

const RuntimeProvider = () => {
  const runtime = useTrieveRuntime({
    trieve,
    ownerId: "abcd",
    tags: [
      {
        name: "Stories",
        value: "story",
      },
      {
        name: "Comments",
        value: "comment",
      },
      {
        name: "Ask HN",
        value: "ask",
      },
      {
        name: "Show HN",
        value: "show",
      },
      {
        name: "Jobs",
        value: "job",
      },
      {
        name: "Polls",
        value: "poll",
      },
    ],
    search_type: "fulltext",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MyAssistant />
    </AssistantRuntimeProvider>
  );
};

export default RuntimeProvider;

function MyAssistant() {
  const { title } = useTrieveExtras();

  return (
    <div className="flex h-full flex-col overflow-hidden pt-8">
      <p className="text-center text-xl font-bold">{title}</p>
      <div className="flex-grow overflow-hidden">
        <Thread
          components={{
            Composer: TrieveComposer,
            ThreadWelcome: TrieveThreadWelcome,
          }}
          assistantMessage={{ components: { Text: TrieveMarkdownText } }}
        />
      </div>
    </div>
  );
}
