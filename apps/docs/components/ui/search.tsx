"use client";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import SearchDialog from "trieve-fumadocs-adapter/components/dialog/search";
import { TrieveSDK } from "trieve-ts-sdk";

const trieveSDK = new TrieveSDK({
  apiKey: process.env["NEXT_PUBLIC_TRIEVE_API_KEY"] as string,
  datasetId: process.env["NEXT_PUBLIC_TRIEVE_DATASET_ID"] as string,
});

export default function CustomSearchDialog(props: SharedProps) {
  return <SearchDialog trieveClient={trieveSDK} {...props} />;
}
