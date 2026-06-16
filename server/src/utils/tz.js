/**
 * Convert a local date string (YYYY-MM-DD) in a given IANA timezone to
 * the corresponding UTC start and end timestamps.
 * Works without MySQL timezone tables — all conversion happens in Node.js via Intl.
 */
function localDateToUtcRange(localDateStr, ianaTimezone) {
  function localToUtc(localIsoStr, tz) {
    const [datePart, timePart] = localIsoStr.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, mi, s] = timePart.split(':').map(Number);

    // Naive UTC guess
    const naive = new Date(Date.UTC(y, m - 1, d, h, mi, s));

    // What does that UTC instant look like in the target timezone?
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(naive);
    const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);
    const tzEpoch = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

    // offset = naive - what the timezone shows for naive
    const offset = naive.getTime() - tzEpoch;
    return new Date(naive.getTime() + offset);
  }

  return {
    start: localToUtc(`${localDateStr}T00:00:00`, ianaTimezone),
    end:   localToUtc(`${localDateStr}T23:59:59`, ianaTimezone),
  };
}

module.exports = { localDateToUtcRange };
