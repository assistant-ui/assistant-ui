export const CONTENT_EDITABLE_SELECTOR =
  "[contenteditable]:not([contenteditable='false'])";

export const COMPOSER_INPUT_SELECTOR = `textarea:not(:disabled), ${CONTENT_EDITABLE_SELECTOR}`;
