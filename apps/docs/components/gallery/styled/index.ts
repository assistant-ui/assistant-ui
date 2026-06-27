import type { GenerativeUILibrary } from "@assistant-ui/react-generative-ui";
import { defaultGenerativeUILibrary } from "@assistant-ui/react-generative-ui";

import { StyledHeader, StyledText, StyledCaption } from "./text";
import { StyledImage, StyledDivider } from "./media";
import { StyledFact } from "./fact";
import { StyledIcon } from "./icon";
import { StyledButton } from "./button";
import { StyledSelect } from "./select";
import { StyledInput } from "./input";
import { StyledDatePicker } from "./datepicker";
import {
  StyledCard,
  StyledCol,
  StyledRow,
  StyledSpacer,
  StyledBadge,
} from "./layout";
import { StyledTable, StyledMarkdown, StyledChart } from "./data";
import { StyledAlert, StyledCarousel } from "./alert";

const iconComponent = {
  description: "A named icon from a fixed set (cloud-sun, plane, bell, ...).",
  properties: {} as any,
  render: StyledIcon as any,
};

export const styledGenerativeUILibrary: GenerativeUILibrary = {
  ...defaultGenerativeUILibrary,
  Icon: iconComponent as any,
  Header: {
    ...defaultGenerativeUILibrary.Header!,
    render: StyledHeader as any,
  },
  Text: { ...defaultGenerativeUILibrary.Text!, render: StyledText as any },
  Caption: {
    ...defaultGenerativeUILibrary.Caption!,
    render: StyledCaption as any,
  },
  Image: { ...defaultGenerativeUILibrary.Image!, render: StyledImage as any },
  Divider: {
    ...defaultGenerativeUILibrary.Divider!,
    render: StyledDivider as any,
  },
  Fact: { ...defaultGenerativeUILibrary.Fact!, render: StyledFact as any },
  Button: {
    ...defaultGenerativeUILibrary.Button!,
    render: StyledButton as any,
  },
  Select: {
    ...defaultGenerativeUILibrary.Select!,
    render: StyledSelect as any,
  },
  Input: { ...defaultGenerativeUILibrary.Input!, render: StyledInput as any },
  DatePicker: {
    ...defaultGenerativeUILibrary.DatePicker!,
    render: StyledDatePicker as any,
  },
  Card: { ...defaultGenerativeUILibrary.Card!, render: StyledCard as any },
  Col: { ...defaultGenerativeUILibrary.Col!, render: StyledCol as any },
  Row: { ...defaultGenerativeUILibrary.Row!, render: StyledRow as any },
  Spacer: {
    ...defaultGenerativeUILibrary.Spacer!,
    render: StyledSpacer as any,
  },
  Badge: { ...defaultGenerativeUILibrary.Badge!, render: StyledBadge as any },
  Table: { ...defaultGenerativeUILibrary.Table!, render: StyledTable as any },
  Markdown: {
    ...defaultGenerativeUILibrary.Markdown!,
    render: StyledMarkdown as any,
  },
  Chart: { ...defaultGenerativeUILibrary.Chart!, render: StyledChart as any },
  Alert: { ...defaultGenerativeUILibrary.Alert!, render: StyledAlert as any },
  Carousel: {
    ...defaultGenerativeUILibrary.Carousel!,
    render: StyledCarousel as any,
  },
};
