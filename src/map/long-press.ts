/** A position on the map, as MapLibre reports it. */
interface Position {
  /** Degrees, east positive. */
  lng: number;
  /** Degrees, north positive. */
  lat: number;
}

/** The part of a MapLibre mouse or touch event that a long press reads. */
interface PressEvent {
  lngLat?: Position;
  originalEvent?: { button?: number; ctrlKey?: boolean; touches?: { length: number } };
}

/** The part of a MapLibre map that a long press listens to. */
interface PressSource {
  on: (type: string, listener: (event: PressEvent) => void) => unknown;
  off: (type: string, listener: (event: PressEvent) => void) => unknown;
}

/** Events that mean the press is over or has turned into another gesture. */
const ENDINGS = ['mouseup', 'mouseout', 'touchend', 'touchcancel', 'movestart'];

/**
 * Reports a press held still on the map: a finger, or the main mouse button.
 *
 * Panning and zooming are left alone. Any movement of the map ends the press,
 * so a drag or a pinch never counts, and neither does a second finger, a
 * right click, or a Control-click.
 *
 * @param delay Milliseconds the press must be held. Defaults to 500.
 * @returns A function that stops listening.
 */
export function watchLongPress(map: PressSource, onLongPress: (position: Position) => void, delay = 500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  const press = ({ lngLat, originalEvent }: PressEvent): void => {
    cancel();
    if (!lngLat) return;
    const { button = 0, ctrlKey = false, touches } = originalEvent ?? {};
    if (button !== 0 || ctrlKey || (touches && touches.length > 1)) return;
    timer = setTimeout(() => {
      timer = undefined;
      onLongPress(lngLat);
    }, delay);
  };

  map.on('mousedown', press);
  map.on('touchstart', press);
  for (const type of ENDINGS) map.on(type, cancel);

  return () => {
    cancel();
    map.off('mousedown', press);
    map.off('touchstart', press);
    for (const type of ENDINGS) map.off(type, cancel);
  };
}
