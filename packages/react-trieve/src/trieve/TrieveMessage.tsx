"use client";

import { ChunkMetadata } from "trieve-ts-sdk";

export interface TrieveMessage {
  sort_order: number;
  role: string;
  content: string;
  citations?: ChunkMetadata[] | undefined;
}
