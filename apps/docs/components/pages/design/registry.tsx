"use client";

import type { ComponentType } from "react";
import { AccordionSample } from "@/components/pages/docs/samples/accordion";
import { BadgeSample } from "@/components/pages/docs/samples/badge";
import { DiffViewerSample } from "@/components/pages/docs/samples/diff-viewer";
import { DotMatrixSample } from "@/components/pages/docs/samples/dot-matrix";
import { NumberRollSample } from "@/components/pages/docs/samples/number-roll";
import { ScrollbarSample } from "@/components/pages/docs/samples/scrollbar";
import { SelectSample } from "@/components/pages/docs/samples/select";
import { TabsSample } from "@/components/pages/docs/samples/tabs";
import {
  AvatarSpecimen,
  BreadcrumbSpecimen,
  ButtonSpecimen,
  CalloutSpecimen,
  CodeBlockSpecimen,
  CollapsibleSpecimen,
  ComboboxSpecimen,
  CommandTabsSpecimen,
  DefinitionListSpecimen,
  DialogSpecimen,
  DropdownMenuSpecimen,
  InputSpecimen,
  KbdSpecimen,
  PopoverSpecimen,
  SeparatorSpecimen,
  SheetSpecimen,
  SkeletonSpecimen,
  StepsSpecimen,
  SwitchSpecimen,
  TableSpecimen,
  ToastSpecimen,
  TooltipSpecimen,
} from "@/components/pages/design/specimens";

export const DESIGN_PREVIEWS: Record<string, ComponentType> = {
  button: ButtonSpecimen,
  "dropdown-menu": DropdownMenuSpecimen,
  input: InputSpecimen,
  select: SelectSample,
  combobox: ComboboxSpecimen,
  switch: SwitchSpecimen,
  kbd: KbdSpecimen,
  badge: BadgeSample,
  avatar: AvatarSpecimen,
  skeleton: SkeletonSpecimen,
  separator: SeparatorSpecimen,
  "number-roll": NumberRollSample,
  "dot-matrix": DotMatrixSample,
  "diff-viewer": DiffViewerSample,
  scrollbar: ScrollbarSample,
  callout: CalloutSpecimen,
  steps: StepsSpecimen,
  "code-block": CodeBlockSpecimen,
  "command-tabs": CommandTabsSpecimen,
  table: TableSpecimen,
  "definition-list": DefinitionListSpecimen,
  dialog: DialogSpecimen,
  popover: PopoverSpecimen,
  tooltip: TooltipSpecimen,
  sheet: SheetSpecimen,
  toast: ToastSpecimen,
  tabs: TabsSample,
  breadcrumb: BreadcrumbSpecimen,
  accordion: AccordionSample,
  collapsible: CollapsibleSpecimen,
};
