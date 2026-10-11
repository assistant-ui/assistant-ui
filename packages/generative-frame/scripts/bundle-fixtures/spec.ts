import { createSpecStream, defineCatalog } from "generative-frame/spec";
import { SpecRenderer, useSpecStream } from "generative-frame/spec/react";
import {
  SpecRenderer as VueSpecRenderer,
  useSpecStream as useVueSpecStream,
} from "generative-frame/spec/vue";
import { createSpecTools } from "generative-frame/spec/tools";

console.log(
  createSpecStream,
  defineCatalog,
  SpecRenderer,
  useSpecStream,
  VueSpecRenderer,
  useVueSpecStream,
  createSpecTools,
);
