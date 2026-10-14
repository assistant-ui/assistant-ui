import {
  createLangGraphThreadState,
  reduceLangGraphThreadState,
  type LangGraphThreadAction,
} from "./langGraphThreadState";

export class LangGraphThreadController {
  private state = createLangGraphThreadState();

  public getState = () => this.state;

  public dispatch = (action: LangGraphThreadAction) => {
    this.state = reduceLangGraphThreadState(this.state, action);
    return this.state;
  };
}
