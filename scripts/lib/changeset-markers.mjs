const INTENDED_CARET_BREAK_MARKER =
  /^\s*(?:<!--\s*)?caret-break:\s*intended\s*(?:-->)?\s*$/m;

export function hasIntendedCaretBreakMarker(body) {
  return INTENDED_CARET_BREAK_MARKER.test(body);
}
