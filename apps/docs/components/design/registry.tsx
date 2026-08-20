"use client";

import type { ComponentType } from "react";
import { AccordionSample } from "@/components/docs/samples/accordion";
import { BadgeSample } from "@/components/docs/samples/badge";
import { DiffViewerSample } from "@/components/docs/samples/diff-viewer";
import { DotMatrixSample } from "@/components/docs/samples/dot-matrix";
import { NumberRollSample } from "@/components/docs/samples/number-roll";
import { ScrollbarSample } from "@/components/docs/samples/scrollbar";
import { SelectSample } from "@/components/docs/samples/select";
import { TabsSample } from "@/components/docs/samples/tabs";
import {
  AvatarSpecimen,
  BreadcrumbSpecimen,
  ButtonSpecimen,
  CalloutSpecimen,
  CodeBlockSpecimen,
  CollapsibleSpecimen,
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
  TooltipSpecimen,
} from "@/components/design/specimens";

export const DESIGN_PREVIEWS: Record<string, ComponentType> = {
  button: ButtonSpecimen,
  "dropdown-menu": DropdownMenuSpecimen,
  input: InputSpecimen,
  select: SelectSample,
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
  tabs: TabsSample,
  breadcrumb: BreadcrumbSpecimen,
  accordion: AccordionSample,
  collapsible: CollapsibleSpecimen,
};
