import type { ResourceFiber } from "./types";

export type TapInstrumentation = {
  onRenderStart?(fiber: ResourceFiber<any, any>): void;
  onRenderEnd?(fiber: ResourceFiber<any, any>): void;

  onCommitStart?(fiber: ResourceFiber<any, any>): void;
  onCommitEnd?(fiber: ResourceFiber<any, any>): void;

  onEffectRunStart?(fiber: ResourceFiber<any, any>, index: number): void;
  onEffectRunEnd?(fiber: ResourceFiber<any, any>, index: number): void;
  onEffectSkipped?(fiber: ResourceFiber<any, any>, index: number): void;

  onEffectCleanupStart?(fiber: ResourceFiber<any, any>, index: number): void;
  onEffectCleanupEnd?(fiber: ResourceFiber<any, any>, index: number): void;
};

export let tapInstrumentation: TapInstrumentation | null = null;

export function setTapInstrumentation(value: TapInstrumentation | null) {
  tapInstrumentation = value;
}
