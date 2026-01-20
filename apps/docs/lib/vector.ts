import { Index } from "@upstash/vector";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export interface DocMetadata {
  [key: string]: unknown;
  url: string;
  title: string;
  content: string;
  contentHash: string;
  chunkIndex: number;
}

interface SparseVector {
  indices: number[];
  values: number[];
}

let cachedIndex: Index | null = null;

function getVectorIndex(): Index {
  if (!cachedIndex) {
    const url = process.env["UPSTASH_VECTOR_REST_URL"];
    const token = process.env["UPSTASH_VECTOR_REST_TOKEN"];
    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN",
      );
    }
    cachedIndex = new Index({ url, token });
  }
  return cachedIndex;
}

async function getDenseVector(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });
  return embedding;
}

function hashTerm(term: string): number {
  let hash = 0;
  for (let i = 0; i < term.length; i++) {
    hash = (hash * 31 + term.charCodeAt(i)) >>> 0;
  }
  return hash % 100000;
}

function getSparseVector(text: string): SparseVector {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
  }

  const indices: number[] = [];
  const values: number[] = [];

  for (const [term, freq] of termFreq) {
    indices.push(hashTerm(term));
    values.push(freq / tokens.length);
  }

  return { indices, values };
}

export async function upsertDoc(
  id: string,
  text: string,
  metadata: DocMetadata,
): Promise<void> {
  const index = getVectorIndex();
  const vector = await getDenseVector(text);
  const sparseVector = getSparseVector(text);

  await index.upsert([{ id, vector, sparseVector, metadata }]);
}

export async function searchDocs(query: string, topK = 5) {
  const index = getVectorIndex();
  const vector = await getDenseVector(query);
  const sparseVector = getSparseVector(query);

  return index.query<DocMetadata>({
    vector,
    sparseVector,
    topK,
    includeMetadata: true,
  });
}

export async function fetchAllDocMeta(): Promise<Map<string, string>> {
  const index = getVectorIndex();
  const idToHash = new Map<string, string>();
  let cursor = "0";

  do {
    const res = await index.range<DocMetadata>({
      cursor,
      limit: 100,
      includeMetadata: true,
    });
    for (const v of res.vectors) {
      idToHash.set(v.id as string, v.metadata?.contentHash ?? "");
    }
    cursor = res.nextCursor;
  } while (cursor && cursor !== "0");

  return idToHash;
}

export async function deleteDocs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getVectorIndex().delete(ids);
}
