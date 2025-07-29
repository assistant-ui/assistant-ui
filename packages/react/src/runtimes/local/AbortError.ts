/**
 * Custom AbortError class that extends Error and includes a detach property.
 * Used to differentiate between cancellation (detach: false) and detachment (detach: true).
 */
export class AbortError extends Error {
  override name = "AbortError";
  detach: boolean;

  constructor(detach: boolean, message?: string) {
    super(message);
    this.detach = detach;
  }
}
