import { AUI_ELEMENT_DOCS } from "./aui-element-docs";

export interface ElementPropRow {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description: string;
}

export interface ElementPropsTable {
  component: string;
  rows: ElementPropRow[];
}

export interface ElementDoc {
  usage: string;
  props: ElementPropsTable[];
}

export const ELEMENT_DOCS: Record<string, ElementDoc> = {
  ...AUI_ELEMENT_DOCS,
};
