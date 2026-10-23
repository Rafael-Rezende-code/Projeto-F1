"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Dispara um evento de medição ao montar (ex.: view_item na página de produto). No-op sem GA4/Pixel ou sem consentimento. */
export function TrackEvent({ event }: { event: AnalyticsEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    track(JSON.parse(key) as AnalyticsEvent);
  }, [key]);
  return null;
}
