import { Harness } from "./Harness";
import type { HarnessOptions } from "./HarnessResource";

/**
 * Keyed lookup of Harness instances, one per thread id. Instances live until
 * removed; subscribe fires on membership changes.
 */
export class HarnessManager<TExtras = unknown> {
  readonly #options: (id: string) => Omit<HarnessOptions, "id">;
  readonly #listeners = new Set<() => void>();
  #harnesses: ReadonlyMap<string, Harness<TExtras>> = new Map();

  constructor(options: (id: string) => Omit<HarnessOptions, "id">) {
    this.#options = options;
  }

  get harnesses(): ReadonlyMap<string, Harness<TExtras>> {
    return this.#harnesses;
  }

  getOrCreate(id: string): Harness<TExtras> {
    const existing = this.#harnesses.get(id);
    if (existing) return existing;
    const harness = new Harness<TExtras>({ ...this.#options(id), id });
    this.#harnesses = new Map(this.#harnesses).set(id, harness);
    this.#emit();
    return harness;
  }

  remove(id: string): void {
    const harness = this.#harnesses.get(id);
    if (!harness) return;
    harness.dispose();
    const next = new Map(this.#harnesses);
    next.delete(id);
    this.#harnesses = next;
    this.#emit();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  dispose(): void {
    for (const harness of this.#harnesses.values()) harness.dispose();
    this.#harnesses = new Map();
    this.#emit();
  }

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }
}
