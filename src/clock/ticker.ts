const MS_PER_SECOND = 1_000;

/** Milliseconds until `time` next reaches a whole second; a full second when it is on one. */
function untilNextSecond(time: number): number {
  return MS_PER_SECOND - (((time % MS_PER_SECOND) + MS_PER_SECOND) % MS_PER_SECOND);
}

/**
 * Calls `onTick` now, then every time a displayed clock rolls over to a new
 * second, and again whenever the page becomes visible.
 *
 * Nothing is counted: every tick reads the device clock and schedules the next
 * one from it, so a late or throttled timer cannot build up drift.
 *
 * @param onTick Receives the current instant.
 * @param offset Milliseconds between the device clock and a readout that does
 *   not share its second boundary, such as local mean time. Ticks then land on
 *   that readout's seconds as well as the device clock's.
 * @returns A function that stops the ticker.
 */
export function startTicker(onTick: (now: Date) => void, offset: () => number = () => 0): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = (): void => {
    clearTimeout(timer);
    const now = Date.now();
    onTick(new Date(now));
    const delay = Math.min(untilNextSecond(now), untilNextSecond(now + offset()));
    timer = setTimeout(tick, delay);
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') tick();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  tick();

  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
