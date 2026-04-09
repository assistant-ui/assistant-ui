import type { DataMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../../..";

export type DataRenderersState = {
  renderers: Record<string, DataMessagePartComponent[]>;
  fallback: DataMessagePartComponent | undefined;
};

export type DataRenderersMethods = {
  getState(): DataRenderersState;
  setDataUI(name: string, render: DataMessagePartComponent): Unsubscribe;
  setFallbackDataUI(render: DataMessagePartComponent): Unsubscribe;
};

export type DataRenderersClientSchema = {
  methods: DataRenderersMethods;
};
