import type { ReverseGeocoder } from './geocoder';
import { distinct, fetchJson, fields, text } from './parse';

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
/** Nominatim's zoom for neighborhoods and suburbs, the scale a place is named at. */
const ZOOM = '14';
/** Address parts from the smallest area to the largest. */
const AREAS = ['neighbourhood', 'suburb', 'village', 'town', 'city', 'municipality', 'county', 'state', 'country'];

/**
 * OpenStreetMap's own geocoder, used only to name a position when Photon
 * cannot. Its usage policy forbids autocomplete and allows one request per
 * second, so it must never back the search box.
 */
export const nominatim: ReverseGeocoder = {
  async reverse(latitude, longitude, signal) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('zoom', ZOOM);
    url.searchParams.set('accept-language', 'en');

    // A position with nothing nearby, such as open ocean, comes back as an
    // object with only an `error` field, which yields no parts here.
    const data = fields(await fetchJson(url, signal));
    const address = fields(data.get('address'));
    const parts = distinct([text(data.get('name')), ...AREAS.map((area) => text(address.get(area)))]);
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : undefined;
  },
};
