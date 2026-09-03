import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { ROUTES } from "@/constants";
import {
  IDLE_TIMEOUT_MS,
  isAuthenticated,
  logout,
  touchActivity,
} from "@/lib/auth";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

/** Throttle how often we write last-active to storage. */
const TOUCH_THROTTLE_MS = 15_000;
/** How often to check whether the idle window has elapsed. */
const CHECK_INTERVAL_MS = 30_000;

/**
 * Logs the user out after {@link IDLE_TIMEOUT_MS} of no interaction.
 * Mount inside authenticated layout only.
 */
export function useIdleLogout() {
  const navigate = useNavigate();
  const lastTouchRef = useRef(0);

  useEffect(() => {
    function expire() {
      logout();
      navigate(ROUTES.login, { replace: true });
    }

    function bump() {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
      lastTouchRef.current = now;
      touchActivity();
    }

    function check() {
      if (!isAuthenticated()) expire();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") bump();
    }

    // Record activity for this session start / remount.
    touchActivity();
    lastTouchRef.current = Date.now();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, bump, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);
    // Safety net if the tab was left open past the idle window.
    const timeoutId = window.setTimeout(check, IDLE_TIMEOUT_MS + 1000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, bump);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);
}
