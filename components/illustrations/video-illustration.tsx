"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { createVideoSequence, finishVideoSequence, preparedVideoFrame, prepareVideoTransition, videoCycleDuration, type VideoSequence } from "../../lib/animation/video-sequence";
import styles from "./video-illustration.module.css";

const sequences = ["typing", "drinking"] as const;

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

type VideoIllustrationProps = {
  sources: Record<VideoSequence, { src: string; durationSeconds: number }>;
  posterSrc: string;
  onPlayingChange: (playing: boolean) => void;
  paused: boolean;
  allowMotion: boolean;
  playbackRef: React.RefObject<(() => void) | undefined>;
};

export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
}

export function VideoIllustration({ sources, posterSrc, onPlayingChange, paused, allowMotion, playbackRef }: VideoIllustrationProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLVideoElement>(null);
  const drinkingRef = useRef<HTMLVideoElement>(null);
  const sequenceRef = useRef<ReturnType<typeof createVideoSequence> | undefined>(undefined);
  const visibleRef = useRef(false);
  const synchronizeRef = useRef<(() => void) | undefined>(undefined);
  const pendingRef = useRef<VideoSequence | undefined>(undefined);
  const previousTypingTimeRef = useRef(-1);
  const [active, setActive] = useState<VideoSequence>("typing");
  const [failed, setFailed] = useState(false);

  const element = useCallback((sequence: VideoSequence) => {
    return sequence === "typing" ? typingRef.current : drinkingRef.current;
  }, []);

  const activatePrepared = useCallback((sequence: VideoSequence) => {
    const video = element(sequence);
    if (pendingRef.current === sequence && video && preparedVideoFrame(video)) setActive(sequence);
  }, [element]);

  const transitionTo = useCallback((sequence: VideoSequence) => {
    if (pendingRef.current) return;
    const video = element(sequence);
    if (!video) return;
    pendingRef.current = sequence;
    if (sequence === "typing") previousTypingTimeRef.current = -1;
    prepareVideoTransition(element(active), video);
    activatePrepared(sequence);
  }, [active, activatePrepared, element]);

  const observeTypingTime = useCallback((time: number) => {
    if (active !== "typing" || pendingRef.current) return;
    const previous = previousTypingTimeRef.current;
    previousTypingTimeRef.current = time;
    if (previous < 0 || time >= previous) return;
    const current = sequenceRef.current ?? createVideoSequence();
    const duration = videoCycleDuration(typingRef.current?.duration ?? Number.NaN, sources.typing.durationSeconds);
    const next = finishVideoSequence(current, duration);
    sequenceRef.current = next;
    if (next.sequence === "drinking") transitionTo("drinking");
  }, [active, sources.typing.durationSeconds, transitionTo]);

  function ended(sequence: VideoSequence) {
    if (sequence !== "drinking" || sequence !== active || pendingRef.current) return;
    const current = sequenceRef.current;
    if (!current) return;
    sequenceRef.current = finishVideoSequence(current, sources.drinking.durationSeconds);
    transitionTo("typing");
  }

  function playing(sequence: VideoSequence) {
    if (pendingRef.current === sequence) {
      activatePrepared(sequence);
      onPlayingChange(true);
    } else if (sequence === active) onPlayingChange(true);
  }

  useEffect(() => {
    const video = typingRef.current;
    if (!video || active !== "typing" || typeof video.requestVideoFrameCallback !== "function") return;
    const typing = video;
    let callback = 0;
    let disposed = false;
    function frame(_time: number, metadata: VideoFrameCallbackMetadata) {
      if (disposed) return;
      observeTypingTime(metadata.mediaTime);
      if (!pendingRef.current) callback = typing.requestVideoFrameCallback(frame);
    }
    callback = video.requestVideoFrameCallback(frame);
    return () => { disposed = true; video.cancelVideoFrameCallback(callback); };
  }, [active, observeTypingTime]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      visibleRef.current = !!entry?.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0;
      synchronizeRef.current?.();
    });
    observer.observe(viewport);
    const videos = [typingRef.current, drinkingRef.current];
    const changed = () => synchronizeRef.current?.();
    document.addEventListener("visibilitychange", changed);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", changed);
      videos.forEach(video => video?.pause());
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const videos = { typing: typingRef.current, drinking: drinkingRef.current };
    if (pendingRef.current === active) pendingRef.current = undefined;
    function synchronize() {
      const target = pendingRef.current ? undefined : active;
      for (const sequence of sequences) {
        const video = videos[sequence];
        if (!video) continue;
        if (sequence === target && !paused && allowMotion && !failed && visibleRef.current && !document.hidden) {
          void video.play().catch(() => { if (!disposed) onPlayingChange(false); });
        } else video.pause();
      }
    }
    synchronizeRef.current = synchronize;
    playbackRef.current = () => {
      const target = pendingRef.current ?? active;
      activatePrepared(target);
      const video = videos[target];
      if (video && !failed) void video.play().catch(() => onPlayingChange(false));
    };
    synchronize();
    return () => {
      disposed = true;
      synchronizeRef.current = undefined;
      playbackRef.current = undefined;
    };
  }, [active, paused, allowMotion, failed, onPlayingChange, playbackRef, activatePrepared]);

  return (
    <div ref={viewportRef} className={styles.viewport}>
      {failed ? <Image src={posterSrc} alt="" width={224} height={224} className={`${styles.clip} ${styles.active}`} /> : sequences.map(sequence => (
        <video
          key={sequence}
          ref={sequence === "typing" ? typingRef : drinkingRef}
          src={sources[sequence].src}
          poster={posterSrc}
          width={224}
          height={224}
          muted
          loop={sequence === "typing"}
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className={`${styles.clip} ${sequence === active ? styles.active : ""}`}
          onEnded={() => ended(sequence)}
          onLoadedData={() => activatePrepared(sequence)}
          onSeeked={() => activatePrepared(sequence)}
          onTimeUpdate={event => {
            if (sequence === "typing" && typeof event.currentTarget.requestVideoFrameCallback !== "function") {
              observeTypingTime(event.currentTarget.currentTime);
            }
          }}
          onPlaying={() => playing(sequence)}
          onPause={() => { if (sequence === active) onPlayingChange(false); }}
          onError={() => { setFailed(true); onPlayingChange(false); }}
        />
      ))}
    </div>
  );
}
