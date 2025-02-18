import sjson from "secure-json-parse";
import { fixJson } from "./fix-json";

export const parsePartialJson = (json: string) => {
  try {
    return sjson.parse(json);
  } catch {
    try {
      return sjson.parse(fixJson(json));
    } catch {
      return undefined;
    }
  }
};
