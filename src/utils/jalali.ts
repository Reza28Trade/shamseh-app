const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function partsToJalali(date: Date) {
  const parts = formatter.formatToParts(date);
  return {
    jy: Number(parts.find(p => p.type === 'year')?.value),
    jm: Number(parts.find(p => p.type === 'month')?.value),
    jd: Number(parts.find(p => p.type === 'day')?.value),
  };
}

export function toJalali(gy: number, gm: number, gd: number) {
  return partsToJalali(new Date(Date.UTC(gy, gm - 1, gd)));
}

export function toGregorian(jy: number, jm: number, jd: number) {
  let low = Date.UTC(jy + 620, 0, 1);
  let high = Date.UTC(jy + 623, 0, 1);
  const target = { jy, jm, jd };

  while (low <= high) {
    const mid = low + Math.floor((high - low) / (2 * 86400000)) * 86400000;
    const current = partsToJalali(new Date(mid));
    const cmp = current.jy - target.jy || current.jm - target.jm || current.jd - target.jd;

    if (cmp === 0) {
      const d = new Date(mid);
      return { gy: d.getUTCFullYear(), gm: d.getUTCMonth() + 1, gd: d.getUTCDate() };
    }

    if (cmp < 0) low = mid + 86400000;
    else high = mid - 86400000;
  }

  throw new RangeError('Invalid Jalali date');
}

export function jalaliMonthLength(jy: number, jm: number) {
  const first = toGregorian(jy, jm, 1);
  const next = jm === 12 ? toGregorian(jy + 1, 1, 1) : toGregorian(jy, jm + 1, 1);
  const firstUtc = Date.UTC(first.gy, first.gm - 1, first.gd);
  const nextUtc = Date.UTC(next.gy, next.gm - 1, next.gd);
  return Math.round((nextUtc - firstUtc) / 86400000);
}

export function jalaliToTehranDate(jy: number, jm: number, jd: number, hour: number, minute: number) {
  const g = toGregorian(jy, jm, jd);
  // Iran's current standard offset is UTC+03:30.
  return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, hour, minute) - (3.5 * 60 * 60 * 1000));
}

export function getTehranTodayJalali() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  return {
    jy: Number(parts.find(p => p.type === 'year')?.value),
    jm: Number(parts.find(p => p.type === 'month')?.value),
    jd: Number(parts.find(p => p.type === 'day')?.value),
  };
}

export function compareJalali(a: { jy: number; jm: number; jd: number }, b: { jy: number; jm: number; jd: number }) {
  return a.jy - b.jy || a.jm - b.jm || a.jd - b.jd;
}
