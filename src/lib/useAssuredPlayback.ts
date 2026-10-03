import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Persistent playback watchdog for ambient videos that have no user controls
 * (hero background, dashboard preview). Any pause on those elements is
 * unintentional: a blocked first play, an OS/battery pause, an extension, or
 * a tab that loaded in the background. Single-use recovery listeners cannot
 * cover this because one failed retry consumes them and the video then stays
 * frozen forever, so this hook keeps re-asserting playback instead:
 * on every user gesture, on tab focus/visibility, and on a 2s interval while
 * the page is visible. It never fights reduced-motion and never spams play()
 * before the browser reports any user activation after a policy rejection.
 *
 * Returns whether playback is currently policy-blocked, so the UI can say
 * "click to play" instead of freezing silently.
 */
export function useAssuredPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): boolean {
  const [blocked, setBlocked] = useState(false);
  const blockedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer = 0;

    const hasActivation = () => {
      if (typeof navigator === "undefined") return true;
      const ua = (
        navigator as Navigator & {
          userActivation?: { hasBeenActive?: boolean };
        }
      ).userActivation;
      // Browsers without the API report nothing: just try.
      if (!ua || typeof ua.hasBeenActive !== "boolean") return true;
      return ua.hasBeenActive;
    };

    const tryPlay = (fromGesture: boolean) => {
      const video = videoRef.current;
      if (!video || disposed) return;
      if (document.visibilityState !== "visible") return;

      // Always ensure muted properties are set at the DOM level
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      if (!video.paused || video.ended) {
        if (!video.paused && blockedRef.current) {
          blockedRef.current = false;
          setBlocked(false);
        }
        return;
      }

      if (fromGesture) {
        blockedRef.current = false;
        setBlocked(false);
      }

      if (blocked && !hasActivation()) return;

      let result: Promise<void> | undefined;
      try {
        result = video.play();
      } catch {
        return;
      }
      if (result && typeof result.catch === "function") {
        result
          .then(() => {
            blockedRef.current = false;
            setBlocked(false);
          })
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
              blockedRef.current = true;
              setBlocked(true);
            }
          });
      }
    };

    const onGesture = () => tryPlay(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") tryPlay(false);
    };

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("touchstart", onGesture, { passive: true });
    window.addEventListener("wheel", onGesture, { passive: true });
    window.addEventListener("scroll", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    tryPlay(false);
    timer = window.setInterval(() => tryPlay(false), 2000);

    return () => {
      disposed = true;
      blockedRef.current = false;
      setBlocked(false);
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("scroll", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [videoRef, enabled]);
  return blocked;
}
