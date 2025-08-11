export type ValueOf<T> = T[keyof T];

export type ReadonlyDeep<T> = T extends readonly any[]
  ? readonly ReadonlyDeep<T[number]>[]
  : T extends { readonly [key: string]: any }
  ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
  : T;

export type DeepPartial<T> = T extends readonly any[]
  ? readonly DeepPartial<T[number]>[]
  : T extends { readonly [key: string]: any }
  ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
  : T;
