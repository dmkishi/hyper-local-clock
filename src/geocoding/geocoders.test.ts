import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withFallback, type ReverseGeocoder } from './geocoder';
import { nominatim } from './nominatim';
import { photon } from './photon';

let requests: URL[];

/** Answers every request with this body, as JSON. */
const stubFetch = (body: unknown, status = 200): void => {
  vi.stubGlobal('fetch', (url: URL) => {
    requests.push(url);
    return Promise.resolve(Response.json(body, { status }));
  });
};

const feature = (properties: Record<string, string>, coordinates: unknown = [-122.2712, 37.8045]): unknown => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates },
});

const collection = (...features: unknown[]): unknown => ({ type: 'FeatureCollection', features });

const naming = (name?: string): ReverseGeocoder => ({ reverse: () => Promise.resolve(name) });
const failing: ReverseGeocoder = { reverse: () => Promise.reject(new Error('down')) };

beforeEach(() => {
  requests = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('photon.search', () => {
  it('asks Photon for a few English results', async () => {
    stubFetch(collection());
    await photon.search('oakland ca');
    const [url] = requests;
    expect(url?.origin + url?.pathname).toBe('https://photon.komoot.io/api/');
    expect(url?.searchParams.get('q')).toBe('oakland ca');
    expect(url?.searchParams.get('limit')).toBe('5');
    expect(url?.searchParams.get('lang')).toBe('en');
  });

  it('reads a place with its surroundings', async () => {
    stubFetch(collection(feature({ name: 'Oakland', state: 'California', country: 'United States' })));
    await expect(photon.search('oakland')).resolves.toEqual([
      { name: 'Oakland', detail: 'California, United States', latitude: 37.8045, longitude: -122.2712 },
    ]);
  });

  it('does not repeat the name in the detail', async () => {
    stubFetch(collection(feature({ name: 'Singapore', city: 'Singapore', country: 'Singapore' })));
    await expect(photon.search('singapore')).resolves.toEqual([
      { name: 'Singapore', latitude: 37.8045, longitude: -122.2712 },
    ]);
  });

  it('names an address by its street when it has no name', async () => {
    stubFetch(collection(feature({ housenumber: '1', street: 'Frank H. Ogawa Plaza', city: 'Oakland' })));
    const [result] = await photon.search('1 frank ogawa plaza');
    expect(result).toMatchObject({ name: '1 Frank H. Ogawa Plaza', detail: 'Oakland' });
  });

  it.each([
    ['no name', feature({ country: 'United States' })],
    ['no geometry', { type: 'Feature', properties: { name: 'Oakland' } }],
    ['an out-of-range position', feature({ name: 'Oakland' }, [-222, 37])],
    ['a non-numeric position', feature({ name: 'Oakland' }, ['-122', '37'])],
  ])('skips a feature with %s', async (_name, broken) => {
    stubFetch(collection(broken, feature({ name: 'Oakland' })));
    await expect(photon.search('oakland')).resolves.toHaveLength(1);
  });

  it('rejects when Photon throttles', async () => {
    stubFetch({ message: 'Too many requests' }, 429);
    await expect(photon.search('oakland')).rejects.toThrow('429');
  });

  it('rejects an answer that is not a feature collection', async () => {
    stubFetch({ message: 'ok' });
    await expect(photon.search('oakland')).rejects.toThrow('features');
  });
});

describe('photon.reverse', () => {
  it('asks for the nearest neighborhood, district, or town', async () => {
    stubFetch(collection());
    await photon.reverse(37.8095, -122.2426);
    const [url] = requests;
    expect(url?.origin + url?.pathname).toBe('https://photon.komoot.io/reverse');
    expect(url?.searchParams.get('lat')).toBe('37.8095');
    expect(url?.searchParams.get('lon')).toBe('-122.2426');
    expect(url?.searchParams.getAll('layer')).toEqual(['locality', 'district', 'city']);
  });

  it('names a neighborhood with its town', async () => {
    stubFetch(collection(feature({ name: 'Lakeshore', city: 'Oakland', state: 'California', country: 'United States' })));
    await expect(photon.reverse(37.8095, -122.2426)).resolves.toBe('Lakeshore, Oakland');
  });

  it('names a town with its state', async () => {
    stubFetch(collection(feature({ name: 'Oakland', state: 'California', country: 'United States' })));
    await expect(photon.reverse(37.8, -122.27)).resolves.toBe('Oakland, California');
  });

  it('has no name where nothing is nearby', async () => {
    stubFetch(collection());
    await expect(photon.reverse(0, -140)).resolves.toBeUndefined();
  });
});

describe('nominatim.reverse', () => {
  it('asks Nominatim at neighborhood scale', async () => {
    stubFetch({});
    await nominatim.reverse(37.8095, -122.2426);
    const [url] = requests;
    expect(url?.origin + url?.pathname).toBe('https://nominatim.openstreetmap.org/reverse');
    expect(Object.fromEntries(url?.searchParams ?? [])).toEqual({
      format: 'jsonv2',
      lat: '37.8095',
      lon: '-122.2426',
      zoom: '14',
      'accept-language': 'en',
    });
  });

  it('names a place with the next area up', async () => {
    stubFetch({ name: 'Lakeshore', address: { neighbourhood: 'Lakeshore', city: 'Oakland', state: 'California' } });
    await expect(nominatim.reverse(37.8095, -122.2426)).resolves.toBe('Lakeshore, Oakland');
  });

  it('falls back to the address when the place itself has no name', async () => {
    stubFetch({ name: '', address: { county: 'Alameda County', state: 'California', country: 'United States' } });
    await expect(nominatim.reverse(37.7, -121.9)).resolves.toBe('Alameda County, California');
  });

  it('has no name where it cannot geocode', async () => {
    stubFetch({ error: 'Unable to geocode' });
    await expect(nominatim.reverse(0, -140)).resolves.toBeUndefined();
  });

  it('rejects when Nominatim refuses', async () => {
    stubFetch({}, 403);
    await expect(nominatim.reverse(37.8, -122.27)).rejects.toThrow('403');
  });
});

describe('withFallback', () => {
  it('uses the first geocoder that has a name', async () => {
    const second = vi.fn(() => Promise.resolve('Second'));
    await expect(withFallback(naming('First'), { reverse: second }).reverse(0, 0)).resolves.toBe('First');
    expect(second).not.toHaveBeenCalled();
  });

  it('moves on when a geocoder fails', async () => {
    await expect(withFallback(failing, naming('Second')).reverse(0, 0)).resolves.toBe('Second');
  });

  it('moves on when a geocoder has no name', async () => {
    await expect(withFallback(naming(), naming('Second')).reverse(0, 0)).resolves.toBe('Second');
  });

  it('has no name when none of them do', async () => {
    await expect(withFallback(naming(), naming()).reverse(0, 0)).resolves.toBeUndefined();
  });

  it('rejects when one failed and none had a name', async () => {
    await expect(withFallback(failing, naming()).reverse(0, 0)).rejects.toThrow('down');
  });

  it('stops asking once the request is aborted', async () => {
    const controller = new AbortController();
    const second = vi.fn(() => Promise.resolve('Second'));
    const first: ReverseGeocoder = {
      reverse: () => {
        controller.abort();
        return Promise.reject(new Error('aborted'));
      },
    };
    await expect(withFallback(first, { reverse: second }).reverse(0, 0, controller.signal)).rejects.toThrow('aborted');
    expect(second).not.toHaveBeenCalled();
  });
});
