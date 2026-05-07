import { useEffect, useState } from 'react';
import { augmentClient } from '@/components/agent-playground/augment/client';
import { useProduct } from '@/components/agent-playground/contexts/ProductContext';
import { toPlaygroundExamples } from './adapters/catalogToPlayground';
import type { PlaygroundExample } from './types';

export function usePlaygroundCatalog() {
  const product = useProduct();
  const [examples, setExamples] = useState<PlaygroundExample[]>([]);

  useEffect(() => {
    let cancelled = false;

    void augmentClient
      .listExamples({
        ...product.catalog.filter,
        kind: 'example',
        product: product.id,
      })
      .then((catalog) => {
        if (cancelled) return;
        const mapped = toPlaygroundExamples(catalog);
        if (mapped.length > 0) {
          setExamples(mapped);
        }
      })
      .catch(() => {
        // API unavailable — leave examples empty rather than show stale hardcoded data
      });

    return () => {
      cancelled = true;
    };
  }, [product.catalog.filter, product.id]);

  return examples;
}
