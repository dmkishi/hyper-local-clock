export interface ZoneOptions {
  /** IANA time zone. Defaults to the device's zone. */
  timeZone?: string;
  /** BCP 47 locale used for the zone name. Defaults to the device's locale. */
  locale?: string;
}

export interface ZoneTime {
  /** Wall time: a `Date` whose UTC fields read as the zone's clock. */
  time: Date;
  /** Short zone name in effect at that instant, for example "PST". */
  zoneName: string;
  /** Resolved IANA time zone, for example "America/Los_Angeles". */
  timeZone: string;
}

interface Formatters { fields: Intl.DateTimeFormat; name: Intl.DateTimeFormat }

const formatters = new Map<string, Formatters>();

function formattersFor({ timeZone, locale }: ZoneOptions): Formatters {
  const key = `${timeZone ?? ''}|${locale ?? ''}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = {
      // A fixed locale, calendar, and numbering system keep the parts parseable.
      fields: new Intl.DateTimeFormat('en-US', {
        timeZone,
        calendar: 'iso8601',
        numberingSystem: 'latn',
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }),
      name: new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }),
    };
    formatters.set(key, cached);
  }
  return cached;
}

/**
 * Zone time and zone name for an instant, through `Intl.DateTimeFormat`.
 *
 * @param utc The instant to convert.
 * @param options Time zone and locale; both default to the device's.
 */
export function zoneTime(utc: Date, options: ZoneOptions = {}): ZoneTime {
  const { fields, name } = formattersFor(options);
  const part: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const { type, value } of fields.formatToParts(utc)) {
    part[type] = Number(value);
  }
  const milliseconds = ((utc.getTime() % 1_000) + 1_000) % 1_000;
  const time = new Date(
    Date.UTC(
      part.year ?? 0,
      (part.month ?? 1) - 1,
      part.day ?? 1,
      part.hour ?? 0,
      part.minute ?? 0,
      part.second ?? 0,
      milliseconds,
    ),
  );
  const zoneName =
    name.formatToParts(utc).find(({ type }) => type === 'timeZoneName')?.value ?? '';
  return { time, zoneName, timeZone: fields.resolvedOptions().timeZone };
}
