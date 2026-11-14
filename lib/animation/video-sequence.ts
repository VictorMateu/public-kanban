export type VideoSequence = "typing" | "drinking";
export type VideoSequenceState = { sequence: VideoSequence; typingMs: number; drinkAfterMs: number };

export function createVideoSequence(random = Math.random): VideoSequenceState {
  return { sequence: "typing", typingMs: 0, drinkAfterMs: 6_000 + random() * 4_000 };
}

export function videoCycleDuration(measured: number, encoded: number): number {
  return Number.isFinite(measured) && measured > 0 ? measured : encoded;
}

type VideoTransport = { currentTime: number; pause: () => void };

export function preparedVideoFrame(video: { readyState: number; seeking: boolean }): boolean {
  return video.readyState >= 2 && !video.seeking;
}

export function prepareVideoTransition(visible: VideoTransport | null, hidden: VideoTransport): void {
  if (visible === hidden) throw new Error("A visible video must not be sought during a transition.");
  hidden.currentTime = 0;
  visible?.pause();
}

export function finishVideoSequence(current: VideoSequenceState, durationSeconds: number, random = Math.random): VideoSequenceState {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return current;
  if (current.sequence === "drinking") return { sequence: "typing", typingMs: 0, drinkAfterMs: 15_000 + random() * 15_000 };
  const typingMs = current.typingMs + durationSeconds * 1000;
  return { ...current, typingMs, sequence: typingMs >= current.drinkAfterMs ? "drinking" : "typing" };
}
