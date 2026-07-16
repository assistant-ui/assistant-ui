/** A Slack plain-text composition object. */
export interface SlackPlainText {
  readonly type: "plain_text";
  readonly text: string;
}

/** A Slack mrkdwn composition object. */
export interface SlackMrkdwnText {
  readonly type: "mrkdwn";
  readonly text: string;
}

/** A text composition object accepted by card and alert text fields. */
export type SlackTextObject = SlackPlainText | SlackMrkdwnText;

/** A selectable Slack option. */
export interface SlackOption {
  readonly text: SlackPlainText;
  readonly value: string;
}

/** A Slack button element. */
export interface SlackButtonElement {
  readonly type: "button";
  readonly text: SlackPlainText;
  readonly action_id: string;
  readonly value?: string;
  readonly style?: "primary" | "danger";
}

/** A Slack static-select element. */
export interface SlackStaticSelectElement {
  readonly type: "static_select";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly placeholder?: SlackPlainText;
}

/** A Slack date-picker element. */
export interface SlackDatePickerElement {
  readonly type: "datepicker";
  readonly action_id: string;
  readonly initial_date?: string;
}

/** A Slack checkbox-group element. */
export interface SlackCheckboxesElement {
  readonly type: "checkboxes";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly initial_options?: readonly SlackOption[];
}

/** A Slack radio-button element. */
export interface SlackRadioButtonsElement {
  readonly type: "radio_buttons";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly initial_option?: SlackOption;
}

/** A Slack plain-text input element. */
export interface SlackPlainTextInputElement {
  readonly type: "plain_text_input";
  readonly action_id: string;
  readonly multiline?: boolean;
  readonly placeholder?: SlackPlainText;
}

/** An element accepted by a Slack actions block. */
export type SlackActionElement =
  | SlackButtonElement
  | SlackStaticSelectElement
  | SlackDatePickerElement
  | SlackCheckboxesElement
  | SlackRadioButtonsElement;

/** A Slack header block. */
export interface SlackHeaderBlock {
  readonly type: "header";
  readonly text: SlackPlainText;
}

/** A Slack section block. */
export interface SlackSectionBlock {
  readonly type: "section";
  readonly text?: SlackMrkdwnText;
  readonly fields?: readonly SlackMrkdwnText[];
  readonly accessory?: SlackButtonElement;
}

/** A Slack context block. */
export interface SlackContextBlock {
  readonly type: "context";
  readonly elements: readonly SlackMrkdwnText[];
}

/** A Slack image block. */
export interface SlackImageBlock {
  readonly type: "image";
  readonly image_url: string;
  readonly alt_text: string;
}

/** A Slack divider block. */
export interface SlackDividerBlock {
  readonly type: "divider";
}

/** A Slack actions block. */
export interface SlackActionsBlock {
  readonly type: "actions";
  readonly elements: readonly SlackActionElement[];
}

/** A Slack input block. */
export interface SlackInputBlock {
  readonly type: "input";
  readonly label: SlackPlainText;
  readonly element: SlackPlainTextInputElement;
}

/** A text cell in a Slack data-table block. */
export interface SlackDataTableRawTextCell {
  readonly type: "raw_text";
  readonly text: string;
}

/** A numeric cell in a Slack data-table block. */
export interface SlackDataTableRawNumberCell {
  readonly type: "raw_number";
  readonly text: string;
}

/** A cell value in a Slack data-table block. */
export type SlackDataTableCell =
  | SlackDataTableRawTextCell
  | SlackDataTableRawNumberCell;

/**
 * A Slack card block. A card does not nest arbitrary blocks: content is
 * limited to a hero image, title, subtitle, body, subtext, and up to three
 * action buttons. At least one of `hero_image`, `title`, `actions`, or `body`
 * is required.
 */
export interface SlackCardBlock {
  readonly type: "card";
  readonly hero_image?: SlackImageBlock;
  readonly title?: SlackTextObject;
  readonly subtitle?: SlackTextObject;
  readonly body?: SlackTextObject;
  readonly subtext?: SlackTextObject;
  readonly actions?: readonly SlackButtonElement[];
}

/** A Slack carousel block: a horizontally scrollable group of card blocks. */
export interface SlackCarouselBlock {
  readonly type: "carousel";
  readonly elements: readonly SlackCardBlock[];
}

/** A Slack data-table block. The first entry in `rows` is the header row. */
export interface SlackDataTableBlock {
  readonly type: "data_table";
  readonly caption: string;
  readonly rows: readonly (readonly SlackDataTableCell[])[];
  readonly page_size?: number;
}

/** A Slack markdown block. */
export interface SlackMarkdownBlock {
  readonly type: "markdown";
  readonly text: string;
}

/** The severity level accepted by a Slack alert block. */
export type SlackAlertLevel =
  | "default"
  | "info"
  | "warning"
  | "error"
  | "success";

/** A Slack alert block. Alert blocks are only supported in modals. */
export interface SlackAlertBlock {
  readonly type: "alert";
  readonly text: SlackTextObject;
  readonly level?: SlackAlertLevel;
}

/** A block emitted by the Slack converter. */
export type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackContextBlock
  | SlackImageBlock
  | SlackDividerBlock
  | SlackActionsBlock
  | SlackInputBlock
  | SlackCardBlock
  | SlackCarouselBlock
  | SlackDataTableBlock
  | SlackMarkdownBlock
  | SlackAlertBlock;

/** Options that select the target Slack surface. */
export interface ToSlackBlocksOptions {
  readonly surface?: "message" | "modal";
}

/** A non-fatal downgrade reported during Slack conversion. */
export interface SlackConversionWarning {
  readonly code: "clamped" | "dropped" | "fallback";
  readonly component: string;
  readonly detail: string;
}

/** The blocks and non-fatal warnings produced by Slack conversion. */
export interface SlackBlocksResult {
  readonly blocks: SlackBlock[];
  readonly warnings: SlackConversionWarning[];
}
