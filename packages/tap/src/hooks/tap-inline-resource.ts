import { ExtractResourceOutput, ResourceElement } from "../core/types";
import { callResourceFn } from "../core/callResourceFn";

export function tapInlineResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceOutput<E> {
  return callResourceFn(element.type, element.props);
}
