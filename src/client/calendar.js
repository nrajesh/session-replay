// Date helpers for the date jump and the month activity strip. Pure functions.

const pad2 = (n) => String(n).padStart(2, '0');
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** month is 'YYYY-MM'. One entry per day with its count. */
export function monthDays(month, counts) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= days; d++) {
    const day = `${y}-${pad2(m)}-${pad2(d)}`;
    out.push({ day, date: d, count: counts[day] || 0 });
  }
  return out;
}

export function monthsBetween(fromDay, toDay) {
  const ok = /^\d{4}-\d{2}/;
  if (!ok.test(String(fromDay)) || !ok.test(String(toDay))) return [];
  let [y, m] = fromDay.split('-').map(Number);
  const [ty, tm] = toDay.split('-').map(Number);
  const out = [];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad2(m)}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export function shiftMonth(month, delta) {
  let [y, m] = month.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${pad2(m)}`;
}
