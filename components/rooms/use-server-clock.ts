"use client";

import { useEffect, useState } from "react";

let offsetPromise: Promise<number> | null = null;

/** Difference between the server clock and this device's clock, measured once per page load. */
function measureOffset() {
  offsetPromise ??= (async () => {
    try {
      const t0 = Date.now();
      const res = await fetch("/api/time", { cache: "no-store" });
      const t1 = Date.now();
      const { now } = (await res.json()) as { now: number };
      // Assume the server read its clock halfway through the round trip.
      return now - (t0 + t1) / 2;
    } catch {
      return 0;
    }
  })();
  return offsetPromise;
}

/**
 * The server's "now", ticking every `intervalMs`. Starts at 0 (so server and first client render
 * match), then updates after mount.
 */
export function useServerNow(intervalMs = 500) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let alive = true;
    measureOffset().then((o) => alive && setOffset(o));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const update = () => setNow(Date.now() + offset);
    update();
    const id = window.setInterval(update, intervalMs);
    return () => window.clearInterval(id);
  }, [offset, intervalMs]);
  return now;
}
