import type { SpeechRecognitionAdapter } from "@assistant-ui/react";

export class OpenAIWhisperAdapter implements SpeechRecognitionAdapter {
  private transcribeEndpoint: string;

  constructor(options: { transcribeEndpoint: string }) {
    this.transcribeEndpoint = options.transcribeEndpoint;
  }

  listen(): SpeechRecognitionAdapter.Session {
    const callbacks = {
      start: new Set<() => void>(),
      end: new Set<(result: SpeechRecognitionAdapter.Result) => void>(),
      speech: new Set<(result: SpeechRecognitionAdapter.Result) => void>(),
    };

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let stream: MediaStream | null = null;

    const session: SpeechRecognitionAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        // The transcription will happen in the onstop handler
      },

      cancel: () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          stream = null;
        }
        (session as { status: SpeechRecognitionAdapter.Status }).status = {
          type: "ended",
          reason: "cancelled",
        };
      },

      onSpeechStart: (callback: () => void) => {
        callbacks.start.add(callback);
        return () => {
          callbacks.start.delete(callback);
        };
      },

      onSpeechEnd: (
        callback: (result: SpeechRecognitionAdapter.Result) => void,
      ) => {
        callbacks.end.add(callback);
        return () => {
          callbacks.end.delete(callback);
        };
      },

      onSpeech: (
        callback: (result: SpeechRecognitionAdapter.Result) => void,
      ) => {
        callbacks.speech.add(callback);
        return () => {
          callbacks.speech.delete(callback);
        };
      },
    };

    // Start recording
    this.startRecording(session, callbacks, {
      setMediaRecorder: (mr: MediaRecorder) => {
        mediaRecorder = mr;
      },
      setStream: (s: MediaStream) => {
        stream = s;
      },
      getAudioChunks: () => audioChunks,
      setAudioChunks: (chunks: Blob[]) => {
        audioChunks = chunks;
      },
    });

    return session;
  }

  private async startRecording(
    session: SpeechRecognitionAdapter.Session,
    callbacks: {
      start: Set<() => void>;
      end: Set<(result: SpeechRecognitionAdapter.Result) => void>;
      speech: Set<(result: SpeechRecognitionAdapter.Result) => void>;
    },
    refs: {
      setMediaRecorder: (mr: MediaRecorder) => void;
      setStream: (s: MediaStream) => void;
      getAudioChunks: () => Blob[];
      setAudioChunks: (chunks: Blob[]) => void;
    },
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.setStream(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
      });
      refs.setMediaRecorder(mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          refs.setAudioChunks([...refs.getAudioChunks(), event.data]);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioChunks = refs.getAudioChunks();
        if (audioChunks.length === 0) {
          (session as { status: SpeechRecognitionAdapter.Status }).status = {
            type: "ended",
            reason: "stopped",
          };
          return;
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunks, {
          type: this.getSupportedMimeType(),
        });

        // Transcribe using Whisper API
        try {
          const transcript = await this.transcribe(audioBlob);
          if (transcript) {
            for (const cb of callbacks.speech) cb({ transcript });
            for (const cb of callbacks.end) cb({ transcript });
          }
        } catch (error) {
          console.error("Transcription failed:", error);
        }

        (session as { status: SpeechRecognitionAdapter.Status }).status = {
          type: "ended",
          reason: "stopped",
        };

        // Clear chunks
        refs.setAudioChunks([]);
      };

      mediaRecorder.onerror = () => {
        (session as { status: SpeechRecognitionAdapter.Status }).status = {
          type: "ended",
          reason: "error",
        };
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second

      (session as { status: SpeechRecognitionAdapter.Status }).status = {
        type: "running",
      };
      for (const cb of callbacks.start) cb();
    } catch (error) {
      console.error("Failed to start recording:", error);
      (session as { status: SpeechRecognitionAdapter.Status }).status = {
        type: "ended",
        reason: "error",
      };
    }
  }

  private getSupportedMimeType(): string {
    const types = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "audio/webm"; // fallback
  }

  private async transcribe(audioBlob: Blob): Promise<string> {
    // Convert blob to file with appropriate extension
    const mimeType = audioBlob.type;
    const extension = this.getExtensionFromMimeType(mimeType);
    const file = new File([audioBlob], `recording.${extension}`, {
      type: mimeType,
    });

    const formData = new FormData();
    formData.append("audio", file);

    const response = await fetch(this.transcribeEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
    };
    return map[mimeType] || "webm";
  }
}
