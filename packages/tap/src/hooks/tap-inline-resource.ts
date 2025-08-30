import { ResourceElement } from "../core/types";

export function tapInlineResource<R, P>(element: ResourceElement<R, P>): R {
  return element.type(element.props);
}
