"use client";

import { useEffect } from "react";
import { trackVisit } from "@/app/actions";

/** Counts one visit per browser session per campaign code. */
export function TrackVisit({ actionId, code, channel }: { actionId: string; code: string; channel: string }) {
  useEffect(() => {
    const key = `visit:${actionId}:${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still count once per load */
    }
    void trackVisit(actionId, code, channel);
  }, [actionId, code, channel]);
  return null;
}
