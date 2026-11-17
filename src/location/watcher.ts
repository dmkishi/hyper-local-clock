import type { Place } from './place';

/**
 * Why no position is coming: the user or the browser refused, the browser has
 * no geolocation at all, or the device cannot get a fix right now. Only the
 * last one leaves the watcher running.
 */
export type WatchFailure = 'denied' | 'unsupported' | 'unavailable';

/**
 * Follows the device's position while the page is visible, and stops asking
 * for it while the tab is hidden.
 *
 * Starting the watcher may make the browser ask for permission, so start it
 * from a tap or click unless permission is already granted.
 *
 * @returns A function that stops the watcher.
 */
export function startWatcher(onPlace: (place: Place) => void, onFailure: (failure: WatchFailure) => void): () => void {
  if (!('geolocation' in navigator)) {
    onFailure('unsupported');
    return () => {};
  }

  const { geolocation } = navigator;
  let watchId: number | undefined;

  function pause(): void {
    if (watchId === undefined) return;
    geolocation.clearWatch(watchId);
    watchId = undefined;
  }

  function stop(): void {
    pause();
    document.removeEventListener('visibilitychange', sync);
  }

  function sync(): void {
    if (document.visibilityState !== 'visible') {
      pause();
      return;
    }
    watchId ??= geolocation.watchPosition(
      ({ coords }) => {
        onPlace({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          source: 'device',
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          stop();
          onFailure('denied');
        } else {
          onFailure('unavailable');
        }
      },
      // One second of local mean time is about 460 m of longitude at the
      // equator and less everywhere else, so a coarse fix shows in the readout.
      { enableHighAccuracy: true },
    );
  }

  document.addEventListener('visibilitychange', sync);
  sync();

  return stop;
}

/** Whether location permission is already granted, so watching will not prompt. */
export async function locationGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    // No Permissions API, or it does not know about geolocation.
    return false;
  }
}
