type AsNumber<K> = K extends `${infer N extends number}` ? N | K : K;
type TupleIndex<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;
type IsTuple<T extends readonly any[]> = number extends T["length"]
  ? false
  : true;

export type TypePath<T> =
  | []
  | (T extends object
      ? T extends readonly any[]
        ? IsTuple<T> extends true
          ? {
              [K in TupleIndex<T>]: [AsNumber<K>, ...TypePath<T[K]>];
            }[TupleIndex<T>]
          : [number, ...TypePath<T[number]>]
        : { [K in keyof T]: [K, ...TypePath<T[K]>] }[keyof T]
      : []);

export type TypeAtPath<T, P extends readonly any[]> = P extends [
  infer Head,
  ...infer Rest,
]
  ? Head extends keyof T
    ? TypeAtPath<T[Head], Rest>
    : never
  : T;

export type DeepPartial<T> = T extends readonly any[]
  ? readonly DeepPartial<T[number]>[]
  : T extends { [key: string]: any }
    ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
    : T;
