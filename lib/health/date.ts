export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayRange(date = new Date()) {
  const start = startOfLocalDay(date);
  const end = addDays(start, 1);

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function lastNDaysRange(days: number, date = new Date()) {
  const end = addDays(startOfLocalDay(date), 1);
  const start = addDays(end, -days);

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
