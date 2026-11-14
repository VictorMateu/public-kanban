"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { VideoIllustration, useReducedMotion } from "./video-illustration";
import styles from "./sidebar-illustration.module.css";

const sources = {
  typing: { src: "/illustrations/typing-v6.webm", durationSeconds: 3 },
  drinking: { src: "/illustrations/drinking-v4.webm", durationSeconds: 5.459 },
};

const illustrationViewport = "(min-width: 64rem) and (min-height: 42rem)";

function subscribeViewport(listener: () => void) {
  const query = window.matchMedia(illustrationViewport);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function SidebarIllustration() {
  // CSS visibility alone would still allow hidden videos to download on mobile.
  const visible = useSyncExternalStore(subscribeViewport, () => window.matchMedia(illustrationViewport).matches, () => false);
  return visible ? <DesktopSidebarIllustration /> : null;
}

function DesktopSidebarIllustration() {
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [manualMotion, setManualMotion] = useState(false);
  const reducedMotion = useReducedMotion();
  const playbackRef = useRef<(() => void) | undefined>(undefined);
  const sceneId = `sidebar-illustration-${useId()}`;
  const t = useTranslations("SidebarIllustration");
  const actionLabel = t(playing ? "pause" : "resume");

  function togglePlayback() {
    if (playing) setPaused(true);
    else {
      setPaused(false);
      setManualMotion(true);
      playbackRef.current?.();
    }
  }

  return (
    <div className={styles.illustration} data-paused={paused}>
      <div id={sceneId} aria-hidden="true" className={styles.scene}>
        <VideoIllustration sources={sources} posterSrc="/illustrations/idle-v2.webp" paused={paused} allowMotion={!reducedMotion || manualMotion} onPlayingChange={setPlaying} playbackRef={playbackRef} />
      </div>
      <button
        type="button"
        onClick={togglePlayback}
        aria-controls={sceneId}
        aria-label={actionLabel}
        title={actionLabel}
        className={`${styles.toggle} flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-surface/65 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          {playing ? <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></> : <path d="M8 5.5v13L18 12Z" />}
        </svg>
      </button>
    </div>
  );
}
