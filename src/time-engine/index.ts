/**
 * Time engine: local mean time, the equation of time, apparent solar time,
 * and zone time. It imports nothing from the DOM or Svelte, so it can serve
 * as the reference for a native port; `tsconfig.json` in this folder
 * type-checks it without the DOM library to keep it that way.
 */
export { apparentSolarTime, equationOfTime, lmt } from './solar';
export { zoneTime, type ZoneOptions, type ZoneTime } from './zone';
