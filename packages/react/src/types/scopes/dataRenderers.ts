import type { DataMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../Unsubscribe";

export type DataRenderersState = {
  renderers: Record<string, DataMessagePartComponent[]>;
};

export type DataRenderersMethods = {
  getState(): DataRenderersState;
  setDataUI(name: string, render: DataMessagePartComponent): Unsubscribe;
};

export type DataRenderersClientSchema = {
  methods: DataRenderersMethods;
};
