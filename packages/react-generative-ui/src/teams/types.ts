/** A TextBlock size, from Adaptive Card's closed size enum. */
export type TeamsTextSize = "small" | "medium" | "large" | "extraLarge";

/** A Container's style, driving its accent color in Teams' renderer. */
export type TeamsContainerStyle =
  | "default"
  | "emphasis"
  | "good"
  | "attention"
  | "warning"
  | "accent";

/** A run of wrapped text. Every TextBlock we emit sets `wrap: true`. */
export interface TeamsTextBlock {
  readonly type: "TextBlock";
  readonly text: string;
  readonly wrap: true;
  readonly size?: TeamsTextSize;
  readonly weight?: "bolder";
  readonly style?: "heading";
  readonly isSubtle?: true;
  readonly separator?: true;
  readonly spacing?: "large";
}

/** An image element. */
export interface TeamsImage {
  readonly type: "Image";
  readonly url: string;
  readonly altText?: string;
  readonly size?: "small" | "medium" | "large";
  readonly separator?: true;
  readonly spacing?: "large";
}

/** One label/value entry inside a {@link TeamsFactSet}. */
export interface TeamsFact {
  readonly title: string;
  readonly value: string;
}

/** A set of label/value facts, rendered as an aligned two-column list. */
export interface TeamsFactSet {
  readonly type: "FactSet";
  readonly facts: readonly TeamsFact[];
  readonly separator?: true;
  readonly spacing?: "large";
}

/** The `aui` envelope nested inside every {@link TeamsSubmitAction}'s `data`. */
export interface TeamsSubmitData {
  readonly aui: {
    readonly type: string;
    readonly payload?: Record<string, unknown>;
  };
}

/**
 * A submit action. `data` carries the resume payload under an `aui` key so
 * {@link decodeSubmitData} can invert it out of the merged `activity.value`
 * a Teams bot receives, alongside whatever other named inputs shared the card.
 */
export interface TeamsSubmitAction {
  readonly type: "Action.Submit";
  readonly title: string;
  readonly data: TeamsSubmitData;
  readonly mode?: "secondary";
}

/** The action shape accepted at the card's top-level `actions` field. */
export type TeamsCardAction = TeamsSubmitAction;

/** A bar of submit actions, rendered inline in the body flow. */
export interface TeamsActionSet {
  readonly type: "ActionSet";
  readonly actions: readonly TeamsSubmitAction[];
  readonly separator?: true;
  readonly spacing?: "large";
}

/** A bordered grouping container. */
export interface TeamsContainer {
  readonly type: "Container";
  readonly style?: TeamsContainerStyle;
  readonly items: readonly TeamsCardElement[];
  readonly selectAction?: TeamsSubmitAction;
  readonly separator?: true;
  readonly spacing?: "large";
}

/** One column inside a {@link TeamsColumnSet}. */
export interface TeamsColumn {
  readonly type: "Column";
  readonly width: "auto";
  readonly items: readonly TeamsCardElement[];
}

/** A horizontal row of columns. */
export interface TeamsColumnSet {
  readonly type: "ColumnSet";
  readonly columns: readonly TeamsColumn[];
  readonly separator?: true;
  readonly spacing?: "large";
}

/** One selectable choice inside a {@link TeamsInputChoiceSet}. */
export interface TeamsInputChoice {
  readonly title: string;
  readonly value: string;
}

/** A dropdown (`compact`) or radio group (`expanded`) input. */
export interface TeamsInputChoiceSet {
  readonly type: "Input.ChoiceSet";
  readonly id: string;
  readonly style: "compact" | "expanded";
  readonly choices: readonly TeamsInputChoice[];
  readonly placeholder?: string;
  readonly label?: string;
  readonly value?: string;
  readonly separator?: true;
  readonly spacing?: "large";
}

/** A checkbox-shaped boolean input. */
export interface TeamsInputToggle {
  readonly type: "Input.Toggle";
  readonly id: string;
  readonly title: string;
  readonly value: "true" | "false";
  readonly valueOn: "true";
  readonly valueOff: "false";
  readonly separator?: true;
  readonly spacing?: "large";
}

/** A single or multi-line text input. */
export interface TeamsInputText {
  readonly type: "Input.Text";
  readonly id: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly isMultiline?: true;
  readonly separator?: true;
  readonly spacing?: "large";
}

/** A date input, restricted to `YYYY-MM-DD` values. */
export interface TeamsInputDate {
  readonly type: "Input.Date";
  readonly id: string;
  readonly label?: string;
  readonly value?: string;
  readonly separator?: true;
  readonly spacing?: "large";
}

/** One cell inside a {@link TeamsTableRow}. */
export interface TeamsTableCell {
  readonly type: "TableCell";
  readonly items: readonly TeamsTextBlock[];
}

/** One row inside a {@link TeamsTable}. */
export interface TeamsTableRow {
  readonly type: "TableRow";
  readonly cells: readonly TeamsTableCell[];
}

/** A column width definition inside a {@link TeamsTable}. */
export interface TeamsTableColumnDefinition {
  readonly width: 1;
}

/** A native table. `rows[0]` is the header row when `firstRowAsHeaders` is true. */
export interface TeamsTable {
  readonly type: "Table";
  readonly firstRowAsHeaders: boolean;
  readonly columns: readonly TeamsTableColumnDefinition[];
  readonly rows: readonly TeamsTableRow[];
  readonly separator?: true;
  readonly spacing?: "large";
}

/** A body element emitted by {@link toAdaptiveCard}. */
export type TeamsCardElement =
  | TeamsTextBlock
  | TeamsImage
  | TeamsFactSet
  | TeamsActionSet
  | TeamsContainer
  | TeamsColumnSet
  | TeamsInputChoiceSet
  | TeamsInputToggle
  | TeamsInputText
  | TeamsInputDate
  | TeamsTable;

/** A Microsoft Teams Adaptive Card, pinned to schema version 1.5 (the Teams desktop/web cap; mobile clients cap at 1.2). */
export interface TeamsAdaptiveCard {
  readonly $schema: "http://adaptivecards.io/schemas/adaptive-card.json";
  readonly type: "AdaptiveCard";
  readonly version: "1.5";
  readonly body: readonly TeamsCardElement[];
  readonly actions: readonly TeamsCardAction[];
}

/** An Adaptive Card wrapped as a bot-framework message attachment. */
export interface TeamsCardAttachment {
  readonly contentType: "application/vnd.microsoft.card.adaptive";
  readonly content: TeamsAdaptiveCard;
}

/** A non-fatal downgrade reported during Teams conversion. */
export interface TeamsConversionWarning {
  readonly code: "clamped" | "dropped" | "fallback";
  readonly component: string;
  readonly detail: string;
}

/** Options accepted by {@link toAdaptiveCard} and {@link toTeamsAttachments}. Reserved for future extension; no options are currently defined. */
export interface ToAdaptiveCardOptions {}

/** The card and non-fatal warnings produced by {@link toAdaptiveCard}. */
export interface AdaptiveCardResult {
  readonly card: TeamsAdaptiveCard;
  readonly warnings: TeamsConversionWarning[];
}

/** The attachments and non-fatal warnings produced by {@link toTeamsAttachments}. */
export interface TeamsAttachmentsResult {
  readonly attachments: TeamsCardAttachment[];
  readonly attachmentLayout?: "carousel";
  readonly warnings: TeamsConversionWarning[];
}
