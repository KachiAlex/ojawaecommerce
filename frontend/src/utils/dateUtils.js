/**
 * Convert any timestamp shape to a JS Date.
 * Handles: ISO strings, epoch ms/seconds, {seconds}, {_seconds},
 * legacy Firestore-style { toDate() }, and Date instances.
 * Returns null when the value can't be parsed.
 */
export const toJsDate = (value) => {
  if (!value) return null;
  try {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'object') {
      const secs = value.seconds ?? value._seconds;
      if (typeof secs === 'number') return new Date(secs * 1000);
      return null;
    }
    if (typeof value === 'number') {
      // Treat < 1e12 as seconds
      return new Date(value < 1e12 ? value * 1000 : value);
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/** Format any timestamp shape; returns `fallback` (default 'N/A') when unparseable. */
export const formatDate = (value, options) => {
  const date = toJsDate(value);
  if (!date) return 'N/A';
  return options === 'date'
    ? date.toLocaleDateString()
    : options === 'time'
      ? date.toLocaleTimeString()
      : options && typeof options === 'object'
        ? date.toLocaleString(undefined, options)
        : date.toLocaleString();
};
