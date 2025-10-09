"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MastraRAGConfig,
  MastraRAGQuery,
  MastraRAGResult,
  MastraDocument,
  MastraDocumentChunk,
  MastraEmbedderConfig,
  MastraVectorStoreConfig,
  MastraChunkingConfig,
} from "./types";

// Mock Mastra RAG API - in real implementation, this would connect to actual Mastra APIs
const mastraRAG = {
  ingestDocuments: async (documents: MastraDocument[]): Promise<MastraDocumentChunk[]> => {
    console.log("Mastra RAG ingest documents:", documents);
    // Mock ingestion - in real implementation, this would process and chunk documents
    return documents.map(doc => ({
      id: `chunk-${doc.id}-1`,
      documentId: doc.id,
      content: doc.content.slice(0, 1000), // Mock chunking
      metadata: { ...doc.metadata, chunkIndex: 0 },
      embedding: [], // Mock embedding vector
      index: 0, // Add missing index property
    }));
  },
  query: async (query: MastraRAGQuery): Promise<MastraRAGResult[]> => {
    console.log("Mastra RAG query:", query);
    // Mock querying - in real implementation, this would perform similarity search
    return [
      {
        content: "This is a sample document that contains relevant information.",
        metadata: {
          queryTime: 50,
          model: "text-embedding-ada-002",
          source: "knowledge-base",
          documentId: "doc-1",
          chunkId: "chunk-1"
        },
        similarity: 0.85,
        documentId: "doc-1",
        chunkId: "chunk-1",
      },
    ];
  },
  deleteDocuments: async (documentIds: string[]): Promise<void> => {
    console.log("Mastra RAG delete documents:", documentIds);
    // Mock deletion - in real implementation, this would remove from vector store
  },
  getDocuments: async (filters?: Record<string, any>): Promise<MastraDocument[]> => {
    console.log("Mastra RAG get documents:", filters);
    // Mock retrieval - in real implementation, this would query document store
    return [];
  },
  updateDocument: async (documentId: string, updates: Partial<MastraDocument>): Promise<void> => {
    console.log("Mastra RAG update document:", { documentId, updates });
    // Mock update - in real implementation, this would update document metadata
  },
};

export const useMastraRAG = (_config: MastraRAGConfig) => {
  const [documents, setDocuments] = useState<MastraDocument[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryHistory, setQueryHistory] = useState<MastraRAGQuery[]>([]);
  const [results, setResults] = useState<MastraRAGResult[]>([]);

  // Ingest documents into the RAG system
  const ingestDocuments = useCallback(async (docs: MastraDocument[]): Promise<MastraDocumentChunk[]> => {
    setIsIndexing(true);

    try {
      const chunks = await mastraRAG.ingestDocuments(docs);

      setDocuments(prev => {
        const existing = new Map(prev.map(doc => [doc.id, doc]));
        docs.forEach(doc => existing.set(doc.id, doc));
        return Array.from(existing.values());
      });

      return chunks;
    } catch (error) {
      console.error("Document ingestion failed:", error);
      throw error;
    } finally {
      setIsIndexing(false);
    }
  }, []);

  // Query the RAG system
  const query = useCallback(async (queryOptions: MastraRAGQuery): Promise<MastraRAGResult[]> => {
    setIsQuerying(true);

    try {
      const queryWithDefaults: MastraRAGQuery = {
        query: queryOptions.query,
        limit: queryOptions.limit || 5,
        ...(queryOptions.filters && { filters: queryOptions.filters }),
        ...(queryOptions.similarityThreshold !== undefined && { similarityThreshold: queryOptions.similarityThreshold }),
      };

      const results = await mastraRAG.query(queryWithDefaults);

      setResults(results);
      setQueryHistory(prev => [...prev, queryWithDefaults].slice(-50)); // Keep last 50 queries

      // Callback to parent component if needed (config doesn't have onRAGQuery property)
      // config.onRAGQuery?.(queryWithDefaults, results);

      return results;
    } catch (error) {
      console.error("RAG query failed:", error);
      throw error;
    } finally {
      setIsQuerying(false);
    }
  }, []);

  // Delete documents from the RAG system
  const deleteDocuments = useCallback(async (documentIds: string[]): Promise<void> => {
    try {
      await mastraRAG.deleteDocuments(documentIds);

      setDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
      setResults(prev => prev.filter(result => !documentIds.includes(result.documentId)));
    } catch (error) {
      console.error("Document deletion failed:", error);
      throw error;
    }
  }, []);

  // Get documents with optional filtering
  const getDocuments = useCallback(async (filters?: Record<string, any>): Promise<MastraDocument[]> => {
    try {
      const docs = await mastraRAG.getDocuments(filters);
      setDocuments(docs);
      return docs;
    } catch (error) {
      console.error("Get documents failed:", error);
      throw error;
    }
  }, []);

  // Update document metadata
  const updateDocument = useCallback(async (
    documentId: string,
    updates: Partial<MastraDocument>
  ): Promise<void> => {
    try {
      await mastraRAG.updateDocument(documentId, updates);

      setDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, ...updates } : doc
      ));
    } catch (error) {
      console.error("Document update failed:", error);
      throw error;
    }
  }, []);

  // Clear query results
  const clearResults = useCallback((): void => {
    setResults([]);
  }, []);

  // Clear query history
  const clearHistory = useCallback((): void => {
    setQueryHistory([]);
  }, []);

  return {
    documents,
    isIndexing,
    isQuerying,
    queryHistory,
    results,
    ingestDocuments,
    query,
    deleteDocuments,
    getDocuments,
    updateDocument,
    clearResults,
    clearHistory,
  };
};

// Hook for RAG query management
export const useMastraRAGQuery = (config: MastraRAGConfig) => {
  const [queries, setQueries] = useState<Map<string, MastraRAGQuery>>(new Map());
  const [results, setResults] = useState<Map<string, MastraRAGResult[]>>(new Map());
  const [activeQueries, setActiveQueries] = useState<Set<string>>(new Set());

  const { query: baseQuery } = useMastraRAG(config);

  // Execute a query with tracking
  const executeQuery = useCallback(async (queryOptions: MastraRAGQuery): Promise<string> => {
    const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setQueries(prev => {
      const updated = new Map(prev);
      updated.set(queryId, queryOptions);
      return updated;
    });

    setActiveQueries(prev => new Set(prev).add(queryId));

    try {
      const queryResults = await baseQuery(queryOptions);

      setResults(prev => {
        const updated = new Map(prev);
        updated.set(queryId, queryResults);
        return updated;
      });

      return queryId;
    } finally {
      setActiveQueries(prev => {
        const updated = new Set(prev);
        updated.delete(queryId);
        return updated;
      });
    }
  }, [baseQuery]);

  // Get query by ID
  const getQuery = useCallback((queryId: string): MastraRAGQuery | undefined => {
    return queries.get(queryId);
  }, [queries]);

  // Get results by ID
  const getResults = useCallback((queryId: string): MastraRAGResult[] | undefined => {
    return results.get(queryId);
  }, [results]);

  // Clear query and results
  const clearQuery = useCallback((queryId: string): void => {
    setQueries(prev => {
      const updated = new Map(prev);
      updated.delete(queryId);
      return updated;
    });

    setResults(prev => {
      const updated = new Map(prev);
      updated.delete(queryId);
      return updated;
    });
  }, []);

  // Clear all queries
  const clearAllQueries = useCallback((): void => {
    setQueries(new Map());
    setResults(new Map());
    setActiveQueries(new Set());
  }, []);

  return {
    queries: Array.from(queries.entries()),
    results: Array.from(results.entries()),
    activeQueries: Array.from(activeQueries),
    executeQuery,
    getQuery,
    getResults,
    clearQuery,
    clearAllQueries,
  };
};

// Hook for document management
export const useMastraRAGDocuments = (config: MastraRAGConfig) => {
  const { documents, ingestDocuments, deleteDocuments, getDocuments, updateDocument } = useMastraRAG(config);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());

  // Ingest document with processing tracking
  const ingestDocument = useCallback(async (document: MastraDocument): Promise<MastraDocumentChunk[]> => {
    setProcessingDocuments(prev => new Set(prev).add(document.id));

    try {
      const chunks = await ingestDocuments([document]);
      // Callback to parent component if needed (config doesn't have onDocumentIngested property)
      // config.onDocumentIngested?.([document]);
      return chunks;
    } finally {
      setProcessingDocuments(prev => {
        const updated = new Set(prev);
        updated.delete(document.id);
        return updated;
      });
    }
  }, [ingestDocuments]);

  // Ingest multiple documents
  const ingestMultipleDocuments = useCallback(async (docs: MastraDocument[]): Promise<MastraDocumentChunk[]> => {
    const docIds = new Set(docs.map(doc => doc.id));
    setProcessingDocuments(prev => new Set([...prev, ...docIds]));

    try {
      const chunks = await ingestDocuments(docs);
      // Callback to parent component if needed (config doesn't have onDocumentIngested property)
      // config.onDocumentIngested?.(docs);
      return chunks;
    } finally {
      setProcessingDocuments(prev => {
        const updated = new Set(prev);
        docIds.forEach(id => updated.delete(id));
        return updated;
      });
    }
  }, [ingestDocuments]);

  // Get documents by source
  const getDocumentsBySource = useCallback(async (source: string): Promise<MastraDocument[]> => {
    return getDocuments({ source });
  }, [getDocuments]);

  // Get documents by type
  const getDocumentsByType = useCallback(async (type: string): Promise<MastraDocument[]> => {
    return getDocuments({ type });
  }, [getDocuments]);

  // Search documents by content
  const searchDocuments = useCallback(async (searchTerm: string): Promise<MastraDocument[]> => {
    return getDocuments({ content: { $contains: searchTerm } });
  }, [getDocuments]);

  // Get document statistics
  const getDocumentStats = useCallback((): {
    total: number;
    bySource: Record<string, number>;
    byType: Record<string, number>;
  } => {
    const stats = {
      total: documents.length,
      bySource: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    documents.forEach(doc => {
      const source = doc.metadata?.['source'] || "unknown";
      const type = doc.metadata?.['type'] || "unknown";

      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }, [documents]);

  return {
    documents,
    processingDocuments,
    ingestDocument,
    ingestMultipleDocuments,
    deleteDocuments,
    getDocuments,
    getDocumentsBySource,
    getDocumentsByType,
    searchDocuments,
    updateDocument,
    getDocumentStats,
  };
};

// Hook for RAG analytics
export const useMastraRAGAnalytics = (config: MastraRAGConfig) => {
  const { queryHistory, results } = useMastraRAG(config);
  const [analytics, setAnalytics] = useState({
    totalQueries: 0,
    averageQueryTime: 0,
    topQueries: [] as Array<{ query: string; count: number }>,
    documentStats: {
      total: 0,
      bySource: {} as Record<string, number>,
    },
    resultStats: {
      averageResults: 0,
      averageScore: 0,
    },
  });

  useEffect(() => {
    // Calculate query statistics
    const queryCounts: Record<string, number> = {};
    const totalQueryTime = 0;

    queryHistory.forEach(query => {
      queryCounts[query.query] = (queryCounts[query.query] || 0) + 1;
      // Note: In real implementation, query time would be tracked
    });

    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate result statistics
    let totalResults = 0;
    let totalScore = 0;
    let resultCount = 0;

    results.forEach(result => {
      totalResults += 1; // Each result is a single MastraRAGResult
      totalScore += result.similarity; // Use similarity instead of score
      resultCount++;
    });

    setAnalytics({
      totalQueries: queryHistory.length,
      averageQueryTime: queryHistory.length > 0 ? totalQueryTime / queryHistory.length : 0,
      topQueries,
      documentStats: {
        total: 0, // Would be populated from actual document store
        bySource: {},
      },
      resultStats: {
        averageResults: queryHistory.length > 0 ? totalResults / queryHistory.length : 0,
        averageScore: resultCount > 0 ? totalScore / resultCount : 0,
      },
    });
  }, [queryHistory, results]);

  return analytics;
};

// Hook for RAG configuration management
export const useMastraRAGConfig = () => {
  const [config, setConfig] = useState<MastraRAGConfig | null>(null);

  // Create embedder configuration
  const createEmbedderConfig = useCallback((
    provider: string,
    options: Record<string, any>
  ): MastraEmbedderConfig => {
    return {
      provider: provider as any,
      model: options['model'] || "text-embedding-ada-002",
      dimensions: options['dimensions'] || 1536,
      ...options,
    };
  }, []);

  // Create vector store configuration
  const createVectorStoreConfig = useCallback((
    provider: string,
    options: Record<string, any>
  ): MastraVectorStoreConfig => {
    return {
      provider: provider as any,
      connectionString: options['connectionString'],
      indexName: options['indexName'] || "default",
      ...options,
    };
  }, []);

  // Create chunking configuration
  const createChunkingConfig = useCallback((
    strategy: "fixed" | "semantic" | "recursive",
    options: Record<string, any>
  ): MastraChunkingConfig => {
    return {
      strategy,
      maxChunkSize: options['maxChunkSize'] || 1000,
      overlap: options['overlap'] || 200,
      ...options,
    };
  }, []);

  // Create complete RAG configuration
  const createRAGConfig = useCallback((
    embedder: MastraEmbedderConfig,
    vectorStore: MastraVectorStoreConfig,
    chunking?: MastraChunkingConfig
  ): MastraRAGConfig => {
    return {
      embedder,
      vectorStore,
      chunking: chunking || {
        strategy: "fixed",
        maxChunkSize: 1000,
        overlap: 200,
      },
    };
  }, []);

  return {
    config,
    setConfig,
    createEmbedderConfig,
    createVectorStoreConfig,
    createChunkingConfig,
    createRAGConfig,
  };
};