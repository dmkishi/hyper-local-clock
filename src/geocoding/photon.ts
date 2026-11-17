import type { Geocoder, GeocoderResult } from './geocoder';
import { distinct, fetchJson, fields, text } from './parse';

const ORIGIN = 'https://photon.komoot.io';
const MAX_RESULTS = 5;
/** Photon answers in a handful of languages only and rejects the rest. */
const LANGUAGE = 'en';
/** What a position is named after: a neighborhood, a district, or a town, never a house or a street. */
const NAME_LAYERS = ['locality', 'district', 'city'];

const within = (value: unknown, limit: number): value is number => typeof value === 'number' && Math.abs(value) <= limit;

/** One GeoJSON feature from Photon as a result, or nothing when it has no name or no usable position. */
function parseFeature(feature: unknown): GeocoderResult | undefined {
  const { geometry, properties } = Object.fromEntries(fields(feature));
  const coordinates = fields(geometry).get('coordinates');
  if (!Array.isArray(coordinates)) return undefined;
  const position: unknown[] = coordinates;
  const [longitude, latitude] = position;
  if (!within(latitude, 90) || !within(longitude, 180)) return undefined;

  const tags = fields(properties);
  const city = text(tags.get('city'));
  const street = text(tags.get('street'));
  const houseNumber = text(tags.get('housenumber'));
  const address = street !== undefined && houseNumber !== undefined ? `${houseNumber} ${street}` : street;
  const name = text(tags.get('name')) ?? address ?? city;
  if (name === undefined) return undefined;

  const detail = distinct([city, text(tags.get('state')), text(tags.get('country'))])
    .filter((part) => part !== name)
    .join(', ');
  return detail ? { name, detail, latitude, longitude } : { name, latitude, longitude };
}

async function request(path: string, parameters: [string, string][], signal?: AbortSignal): Promise<GeocoderResult[]> {
  const url = new URL(path, ORIGIN);
  for (const [key, value] of parameters) url.searchParams.append(key, value);
  url.searchParams.set('lang', LANGUAGE);
  const features = fields(await fetchJson(url, signal)).get('features');
  if (!Array.isArray(features)) throw new TypeError('Photon answered without features');
  return features.map((feature) => parseFeature(feature)).filter((result) => result !== undefined);
}

/**
 * Photon, komoot's free geocoder over OpenStreetMap data. It needs no key and
 * has no SLA; heavy use is throttled, so callers debounce and cache.
 */
export const photon: Geocoder = {
  search: (query, signal) =>
    request(
      '/api/',
      [
        ['q', query],
        ['limit', String(MAX_RESULTS)],
      ],
      signal,
    ),

  async reverse(latitude, longitude, signal): Promise<string | undefined> {
    const results = await request(
      '/reverse',
      [
        ['lat', String(latitude)],
        ['lon', String(longitude)],
        ...NAME_LAYERS.map((layer): [string, string] => ['layer', layer]),
      ],
      signal,
    );
    const nearest = results.at(0);
    if (!nearest) return undefined;
    // "Lakeshore, Oakland" for a neighborhood, "Oakland, California" for a town.
    const [context] = nearest.detail?.split(', ') ?? [];
    return distinct([nearest.name, context]).join(', ');
  },
};
