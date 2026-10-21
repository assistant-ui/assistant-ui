import { act, waitFor } from "@testing-library/react";
import { createSettleOutsideAct } from "@assistant-ui/x-react18/testing";

export const settleOutsideAct = createSettleOutsideAct(act, waitFor);
