import type { DictationAdapter } from "../../adapters/speech";
import type {
  DictationEnd,
  DictationState,
} from "../interfaces/composer-runtime-core";
import type { Unsubscribe } from "../../types/unsubscribe";
import { toAssistantError } from "../../types/error";

type DictationSessionHost = {
  getAdapter: () => DictationAdapter | undefined;
  getText: () => string;
  setText: (value: string) => void;
  notify: () => void;
};

export class DictationSessionController {
  private readonly _host: DictationSessionHost;

  constructor(host: DictationSessionHost) {
    this._host = host;
  }

  // A live session must use the latest composer text as its transcript baseline.
  public rebase(value: string): void {
    if (!this._dictation) return;

    this._dictationBaseText = value;
    this._currentInterimText = "";
    const { status, inputDisabled } = this._dictation;
    this._dictation = inputDisabled ? { status, inputDisabled } : { status };
  }

  public cancel(): void {
    if (!this._dictationSession) return;

    const sessionId = this._activeDictationSessionId;
    this._cancellingSessionId = sessionId;
    let end: DictationEnd = { reason: "cancelled" };
    try {
      this._dictationSession.cancel();
    } catch (error) {
      end = { reason: "error", error: toAssistantError(error) };
      console.error("[assistant-ui] Dictation session cancel threw", error);
    } finally {
      this._cleanupDictation({ sessionId, end });
    }
  }

  private _dictation: DictationState | undefined;
  private _dictationSession: DictationAdapter.Session | undefined;
  private _stoppingDictationSession: DictationAdapter.Session | undefined;
  private _dictationUnsubscribes: Unsubscribe[] = [];
  private _dictationBaseText = "";
  private _currentInterimText = "";
  private _dictationSessionIdCounter = 0;
  private _activeDictationSessionId: number | undefined;
  private _isCleaningDictation = false;
  private _lastDictationEnd: DictationEnd | undefined;
  private _cancellingSessionId: number | undefined;

  public get dictation(): DictationState | undefined {
    return this._dictation;
  }

  public get lastDictationEnd(): DictationEnd | undefined {
    return this._lastDictationEnd;
  }

  private _isActiveSession(
    sessionId: number,
    session: DictationAdapter.Session,
  ): boolean {
    return (
      this._activeDictationSessionId === sessionId &&
      this._dictationSession === session
    );
  }

  public startDictation(): void {
    const adapter = this._host.getAdapter();
    if (!adapter) {
      throw new Error("Dictation adapter not configured");
    }

    if (this._dictationSession) {
      const oldSession = this._dictationSession;
      this._cleanupDictation({ notify: false });
      this._stopDictationSession(oldSession);
    }

    const inputDisabled = adapter.disableInputDuringDictation ?? false;

    this._dictationBaseText = this._host.getText();
    this._currentInterimText = "";

    const sessionId = ++this._dictationSessionIdCounter;
    this._activeDictationSessionId = sessionId;

    // Handles stay local because cleanup can run synchronously during setup
    // and would drain the shared list before the remaining handles exist.
    const setupUnsubscribes: Unsubscribe[] = [];
    const releaseSetup = () => {
      for (const unsubscribe of setupUnsubscribes.splice(0)) {
        try {
          unsubscribe();
        } catch (cleanupError) {
          console.error("[assistant-ui] Dictation cleanup threw", cleanupError);
        }
      }
    };
    this._lastDictationEnd = undefined;
    try {
      const session = adapter.listen();
      if (this._activeDictationSessionId !== sessionId) {
        this._stopDictationSession(session);
        return;
      }
      this._dictationSession = session;
      this._dictation = { status: session.status, inputDisabled };
      try {
        this._host.notify();
      } catch (notifyError) {
        console.error(
          "[assistant-ui] Dictation start notification threw",
          notifyError,
        );
      }

      if (!this._isActiveSession(sessionId, session)) return;

      const keepUnsubscribe = (unsubscribe: Unsubscribe) => {
        setupUnsubscribes.push(unsubscribe);
        if (this._isActiveSession(sessionId, session)) return true;
        releaseSetup();
        return false;
      };

      const unsubSpeech = session.onSpeech((result) => {
        if (!this._isActiveSession(sessionId, session)) return;
        const isFinal = result.isFinal !== false;

        const needsSeparator =
          this._dictationBaseText &&
          !this._dictationBaseText.endsWith(" ") &&
          result.transcript;
        const separator = needsSeparator ? " " : "";

        if (isFinal) {
          this._dictationBaseText =
            this._dictationBaseText + separator + result.transcript;
          this._currentInterimText = "";
          this._host.setText(this._dictationBaseText);

          if (this._dictation) {
            const { transcript: _, ...rest } = this._dictation;
            this._dictation = rest;
          }
          this._host.notify();
        } else {
          this._currentInterimText = separator + result.transcript;
          this._host.setText(
            this._dictationBaseText + this._currentInterimText,
          );

          if (this._dictation) {
            this._dictation = {
              ...this._dictation,
              transcript: result.transcript,
            };
          }
          this._host.notify();
        }
      });
      if (!keepUnsubscribe(unsubSpeech)) return;

      const unsubStart = session.onSpeechStart(() => {
        if (!this._isActiveSession(sessionId, session)) return;

        this._dictation = {
          status: { type: "running" },
          inputDisabled,
          ...(this._dictation?.transcript && {
            transcript: this._dictation.transcript,
          }),
        };
        this._host.notify();
      });
      if (!keepUnsubscribe(unsubStart)) return;

      const unsubEnd = session.onSpeechEnd(() => {
        if (this._cancellingSessionId === sessionId) return;
        this._cleanupDictation({ sessionId, end: { reason: "stopped" } });
      });
      if (!keepUnsubscribe(unsubEnd)) return;

      const statusInterval = setInterval(() => {
        if (!this._isActiveSession(sessionId, session)) return;

        if (session.status.type === "ended") {
          this._cleanupDictation({ sessionId, end: { reason: "stopped" } });
        }
      }, 100);
      if (!keepUnsubscribe(() => clearInterval(statusInterval))) return;

      this._dictationUnsubscribes.push(...setupUnsubscribes.splice(0));
    } catch (error) {
      releaseSetup();
      if (this._activeDictationSessionId === sessionId) {
        const session = this._dictationSession;
        this._cleanupDictation({
          sessionId,
          end: { reason: "error", error: toAssistantError(error) },
        });
        try {
          session?.cancel();
        } catch (cancelError) {
          console.error(
            "[assistant-ui] Dictation session cancel threw",
            cancelError,
          );
        }
      }
      throw error;
    }
  }

  public stopDictation(): void {
    if (!this._dictationSession) return;

    const session = this._dictationSession;
    if (this._stoppingDictationSession === session) return;
    this._stoppingDictationSession = session;
    const sessionId = this._activeDictationSessionId;
    const cleanup = (end: DictationEnd) =>
      this._cleanupDictation({ sessionId, end });
    this._stopDictationSession(session, cleanup);
  }

  private _stopDictationSession(
    session: DictationAdapter.Session,
    onSettled: (end: DictationEnd) => void = () => {},
  ): void {
    let task: Promise<void>;
    try {
      task = session.stop();
    } catch (error) {
      console.error("[assistant-ui] Dictation session stop threw", error);
      onSettled({ reason: "error", error: toAssistantError(error) });
      return;
    }

    void task.then(
      () => onSettled({ reason: "stopped" }),
      (error) => {
        console.error("[assistant-ui] Dictation session stop rejected", error);
        onSettled({ reason: "error", error: toAssistantError(error) });
      },
    );
  }

  private _cleanupDictation(options?: {
    sessionId?: number | undefined;
    notify?: boolean | undefined;
    end?: DictationEnd | undefined;
  }): void {
    const isStaleSession =
      options?.sessionId !== undefined &&
      options.sessionId !== this._activeDictationSessionId;
    if (
      isStaleSession ||
      this._isCleaningDictation ||
      this._activeDictationSessionId === undefined
    )
      return;

    this._isCleaningDictation = true;
    const runCleanup = (cleanup: () => void) => {
      try {
        cleanup();
      } catch (error) {
        console.error("[assistant-ui] Dictation cleanup threw", error);
      }
    };

    try {
      let end = options?.end;
      if (end !== undefined) {
        runCleanup(() => {
          const status = this._dictationSession?.status;
          if (status?.type === "ended") {
            end =
              status.error === undefined
                ? { reason: status.reason }
                : {
                    reason: status.reason,
                    error: toAssistantError(status.error),
                  };
          }
        });
        this._lastDictationEnd = end;
      }
      this._cancellingSessionId = undefined;

      const unsubscribes = this._dictationUnsubscribes;
      this._dictationUnsubscribes = [];
      this._dictationSession = undefined;
      this._stoppingDictationSession = undefined;
      this._activeDictationSessionId = undefined;
      this._dictation = undefined;
      this._dictationBaseText = "";
      this._currentInterimText = "";

      for (const unsubscribe of unsubscribes) runCleanup(unsubscribe);
      if (options?.notify !== false) {
        runCleanup(() => this._host.notify());
      }
    } finally {
      this._isCleaningDictation = false;
    }
  }
}
