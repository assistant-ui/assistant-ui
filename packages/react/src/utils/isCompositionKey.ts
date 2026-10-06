// A keydown that ends an IME composition can arrive after compositionend with
// isComposing false and keyCode 229, as the Enter that commits one does in
// Safari.
export const isCompositionKey = (event: KeyboardEvent) =>
  event.isComposing || event.keyCode === 229;
