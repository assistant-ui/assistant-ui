export interface ScopePreview {
  readonly name: string;
  readonly source: string | null;
  readonly query: unknown;
  readonly methods: readonly string[];
}
