import { ExtractResourceReturnType, ResourceElement } from "../core/types";
import { callResourceFn } from "../core/helpers/callResourceFn";

export function tapInlineResource<E extends ResourceElement<any, any>>(
  element: E,
): ExtractResourceReturnType<E> {
  return callResourceFn(element.type, element.props);
}
