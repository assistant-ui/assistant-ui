import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useMastraRAG,
  useMastraRAGQuery,
  useMastraRAGDocuments,
  useMastraRAGAnalytics,
  useMastraRAGConfig,
} from "./useMastraRAG";
import { MastraRAGConfig, MastraDocument } from "./types";

describe("useMastraRAG", () => {
  const mockConfig: MastraRAGConfig = {
    embedder: {
      provider: "openai" as const,
      model: "text-embedding-ada-002",
      dimensions: 1536,
    },
    vectorStore: {
      provider: "pinecone" as const,
      connectionString: "mock-connection",
      indexName: "test-index",
    },
    chunking: {
      strategy: "fixed",
      maxChunkSize: 1000,
      overlap: 200,
    },
  };

  const mockDocument: MastraDocument = {
    id: "doc-1",
    content: "This is a test document for RAG ingestion.",
    metadata: { source: "test", type: "documentation" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraRAG(mockConfig));

    expect(result.current.documents).toEqual([]);
    expect(result.current.isIndexing).toBe(false);
    expect(result.current.isQuerying).toBe(false);
    expect(result.current.queryHistory).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it("should ingest documents", async () => {
    const mockChunk = {
      id: "chunk-1",
      documentId: "doc-1",
      content: "This is a test document for RAG ingestion.",
      metadata: { source: "test", type: "documentation", chunkIndex: 0 },
      embedding: [],
    };

    mastraRAG.ingestDocuments.mockResolvedValue([mockChunk]);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    const chunks = await act(async () => {
      return await result.current.ingestDocuments([mockDocument]);
    });

    expect(mastraRAG.ingestDocuments).toHaveBeenCalledWith([mockDocument]);
    expect(chunks).toEqual([mockChunk]);
    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0]).toEqual(mockDocument);
    expect(result.current.isIndexing).toBe(false);
  });

  it("should handle ingestion errors", async () => {
    const error = new Error("Ingestion failed");
    mastraRAG.ingestDocuments.mockRejectedValue(error);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    await act(async () => {
      try {
        await result.current.ingestDocuments([mockDocument]);
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    expect(result.current.isIndexing).toBe(false);
  });

  it("should query the RAG system", async () => {
    const mockResult = {
      document: mockDocument,
      chunk: {
        id: "chunk-1",
        documentId: "doc-1",
        content: "This is a test document for RAG ingestion.",
        metadata: { source: "test", type: "documentation", chunkIndex: 0 },
        embedding: [],
      },
      score: 0.85,
      metadata: { queryTime: 50, model: "text-embedding-ada-002" },
    };

    mastraRAG.query.mockResolvedValue([mockResult]);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    const results = await act(async () => {
      return await result.current.query({
        query: "test query",
        limit: 5,
      });
    });

    expect(mastraRAG.query).toHaveBeenCalledWith({
      query: "test query",
      limit: 5,
      filters: undefined,
      includeMetadata: true,
      rerank: false,
    });
    expect(results).toEqual([mockResult]);
    expect(result.current.results).toEqual([mockResult]);
    expect(result.current.queryHistory).toHaveLength(1);
    expect(result.current.isQuerying).toBe(false);
  });

  it("should delete documents", async () => {
    mastraRAG.deleteDocuments.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    // First ingest a document
    await act(async () => {
      await result.current.ingestDocuments([mockDocument]);
    });

    expect(result.current.documents).toHaveLength(1);

    // Then delete it
    await act(async () => {
      await result.current.deleteDocuments(["doc-1"]);
    });

    expect(mastraRAG.deleteDocuments).toHaveBeenCalledWith(["doc-1"]);
    expect(result.current.documents).toHaveLength(0);
  });

  it("should get documents", async () => {
    mastraRAG.getDocuments.mockResolvedValue([mockDocument]);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    const documents = await act(async () => {
      return await result.current.getDocuments({ source: "test" });
    });

    expect(mastraRAG.getDocuments).toHaveBeenCalledWith({ source: "test" });
    expect(documents).toEqual([mockDocument]);
    expect(result.current.documents).toEqual([mockDocument]);
  });

  it("should update documents", async () => {
    mastraRAG.updateDocument.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMastraRAG(mockConfig));

    // First ingest a document
    await act(async () => {
      await result.current.ingestDocuments([mockDocument]);
    });

    // Then update it
    await act(async () => {
      await result.current.updateDocument("doc-1", {
        metadata: { source: "updated" },
      });
    });

    expect(mastraRAG.updateDocument).toHaveBeenCalledWith("doc-1", {
      metadata: { source: "updated" },
    });

    const updatedDoc = result.current.documents[0];
    if (updatedDoc) {
      expect(updatedDoc.metadata?.['source']).toBe("updated");
    }
  });

  it("should clear results and history", () => {
    const { result } = renderHook(() => useMastraRAG(mockConfig));

    act(() => {
      result.current.clearResults();
      result.current.clearHistory();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.queryHistory).toEqual([]);
  });
});

describe("useMastraRAGQuery", () => {
  const mockConfig: MastraRAGConfig = {
    embedder: { provider: "openai" as const, model: "text-embedding-ada-002" },
    vectorStore: { provider: "pinecone" as const, connectionString: "test" },
    chunking: { strategy: "fixed", maxChunkSize: 1000, overlap: 200 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute and track queries", async () => {
    const mockResult = {
      document: { id: "doc-1", content: "test", metadata: {} },
      chunk: { id: "chunk-1", documentId: "doc-1", content: "test", metadata: {}, embedding: [] },
      score: 0.85,
      metadata: {},
    };

    mastraRAG.query.mockResolvedValue([mockResult]);

    const { result } = renderHook(() => useMastraRAGQuery(mockConfig));

    const queryId = await act(async () => {
      return await result.current.executeQuery({
        query: "test query",
      });
    });

    expect(queryId).toBeDefined();
    expect(queryId).toMatch(/^query-\d+-[a-z0-9]+$/);
    expect(result.current.activeQueries).toHaveLength(0); // Should be empty after completion

    const queries = Array.from(result.current.queries);
    expect(queries).toHaveLength(1);
    expect(queries[0]?.[1]?.query).toBe("test query");

    const results = Array.from(result.current.results);
    expect(results).toHaveLength(1);
    expect(results[0]?.[1]).toEqual([mockResult]);
  });

  it("should manage query lifecycle", async () => {
    mastraRAG.query.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));

    const { result } = renderHook(() => useMastraRAGQuery(mockConfig));

    const queryPromise = act(async () => {
      return await result.current.executeQuery({
        query: "async query",
      });
    });

    // Query should be active during execution
    expect(result.current.activeQueries).toHaveLength(1);

    await queryPromise;

    // Query should be inactive after completion
    expect(result.current.activeQueries).toHaveLength(0);
  });

  it("should clear queries", async () => {
    mastraRAG.query.mockResolvedValue([]);

    const { result } = renderHook(() => useMastraRAGQuery(mockConfig));

    const queryId = await act(async () => {
      return await result.current.executeQuery({
        query: "test query",
      });
    });

    expect(result.current.queries).toHaveLength(1);

    act(() => {
      result.current.clearQuery(queryId);
    });

    expect(result.current.queries).toHaveLength(0);

    // Add another query and clear all
    await act(async () => {
      await result.current.executeQuery({
        query: "another query",
      });
    });

    expect(result.current.queries).toHaveLength(1);

    act(() => {
      result.current.clearAllQueries();
    });

    expect(result.current.queries).toHaveLength(0);
  });
});

describe("useMastraRAGDocuments", () => {
  const mockConfig: MastraRAGConfig = {
    embedder: { provider: "openai" as const, model: "text-embedding-ada-002" },
    vectorStore: { provider: "pinecone" as const, connectionString: "test" },
    chunking: { strategy: "fixed", maxChunkSize: 1000, overlap: 200 },
  };

  const mockDocument: MastraDocument = {
    id: "doc-1",
    content: "test content",
    metadata: { source: "test", type: "documentation" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track document processing", async () => {
    const mockChunk = {
      id: "chunk-1",
      documentId: "doc-1",
      content: "test content",
      metadata: mockDocument.metadata,
      embedding: [],
    };

    mastraRAG.ingestDocuments.mockResolvedValue([mockChunk]);

    const { result } = renderHook(() => useMastraRAGDocuments(mockConfig));

    const promise = act(async () => {
      return await result.current.ingestDocument(mockDocument);
    });

    // Document should be processing during ingestion
    expect(result.current.processingDocuments.has("doc-1")).toBe(true);

    await promise;

    // Document should not be processing after completion
    expect(result.current.processingDocuments.has("doc-1")).toBe(false);
    expect(result.current.documents).toHaveLength(1);
  });

  it("should get document statistics", () => {
    const { result } = renderHook(() => useMastraRAGDocuments(mockConfig));

    const documents = [
      mockDocument,
      {
        id: "doc-2",
        content: "another document",
        metadata: { source: "test", type: "guide" },
      },
      {
        id: "doc-3",
        content: "third document",
        metadata: { source: "external", type: "documentation" },
      },
    ];

    act(() => {
      documents.forEach(doc => {
        result.current.ingestDocument(doc);
      });
    });

    const stats = result.current.getDocumentStats();

    expect(stats.total).toBe(3);
    expect(stats.bySource).toEqual({
      test: 2,
      external: 1,
    });
    expect(stats.byType).toEqual({
      documentation: 2,
      guide: 1,
    });
  });

  it("should search and filter documents", async () => {
    mastraRAG.getDocuments.mockImplementation((filters) => {
      if (filters?.source === "test") {
        return Promise.resolve([mockDocument]);
      }
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useMastraRAGDocuments(mockConfig));

    const testDocs = await act(async () => {
      return await result.current.getDocumentsBySource("test");
    });

    expect(mastraRAG.getDocuments).toHaveBeenCalledWith({ source: "test" });
    expect(testDocs).toEqual([mockDocument]);
  });
});

describe("useMastraRAGAnalytics", () => {
  const mockConfig: MastraRAGConfig = {
    embedder: { provider: "openai" as const, model: "text-embedding-ada-002" },
    vectorStore: { provider: "pinecone" as const, connectionString: "test" },
    chunking: { strategy: "fixed", maxChunkSize: 1000, overlap: 200 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate query analytics", async () => {
    const mockResult = {
      document: { id: "doc-1", content: "test", metadata: {} },
      chunk: { id: "chunk-1", documentId: "doc-1", content: "test", metadata: {}, embedding: [] },
      score: 0.85,
      metadata: {},
    };

    mastraRAG.query.mockResolvedValue([mockResult]);

    const { result: ragResult } = renderHook(() => useMastraRAG(mockConfig));
    const { result } = renderHook(() => useMastraRAGAnalytics(mockConfig));

    // Execute some queries
    await act(async () => {
      await ragResult.current.query({ query: "test query 1" });
      await ragResult.current.query({ query: "test query 2" });
      await ragResult.current.query({ query: "test query 1" }); // Duplicate
    });

    const analytics = result.current;

    expect(analytics.totalQueries).toBe(3);
    expect(analytics.topQueries).toHaveLength(2);
    expect(analytics.topQueries[0]).toEqual({
      query: "test query 1",
      count: 2,
    });
    expect(analytics.resultStats.averageResults).toBe(1);
    expect(analytics.resultStats.averageScore).toBe(0.85);
  });
});

describe("useMastraRAGConfig", () => {
  it("should create embedder configurations", () => {
    const { result } = renderHook(() => useMastraRAGConfig());

    const embedderConfig = result.current.createEmbedderConfig("openai", {
      model: "text-embedding-3-large",
      dimensions: 3072,
    });

    expect(embedderConfig).toEqual({
      provider: "openai",
      model: "text-embedding-3-large",
      dimensions: 3072,
    });
  });

  it("should create vector store configurations", () => {
    const { result } = renderHook(() => useMastraRAGConfig());

    const vectorStoreConfig = result.current.createVectorStoreConfig("chroma", {
      connectionString: "http://localhost:8000",
      indexName: "my-index",
    });

    expect(vectorStoreConfig).toEqual({
      provider: "chroma",
      connectionString: "http://localhost:8000",
      indexName: "my-index",
    });
  });

  it("should create chunking configurations", () => {
    const { result } = renderHook(() => useMastraRAGConfig());

    const chunkingConfig = result.current.createChunkingConfig("semantic", {
      chunkSize: 500,
      chunkOverlap: 100,
    });

    expect(chunkingConfig).toEqual({
      strategy: "semantic",
      chunkSize: 500,
      chunkOverlap: 100,
    });
  });

  it("should create complete RAG configurations", () => {
    const { result } = renderHook(() => useMastraRAGConfig());

    const embedder = result.current.createEmbedderConfig("openai", {});
    const vectorStore = result.current.createVectorStoreConfig("pinecone", {});
    const chunking = result.current.createChunkingConfig("fixed", {});

    const ragConfig = result.current.createRAGConfig(embedder, vectorStore, chunking);

    expect(ragConfig).toEqual({
      embedder,
      vectorStore,
      chunking,
    });
  });
});