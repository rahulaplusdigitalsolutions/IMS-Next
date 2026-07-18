"use client";

// Shared "day filter" (Today / Yesterday / Last 7 Days / ... / Custom) used
// consistently across the Dashboard and every list page it links to
// (Order Processing, Billing, Dispatch, Stock In, Damaged) so a period picked
// on one screen means the same thing everywhere else.
export const DAY_FILTER_OPTIONS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "last60", label: "Last 60 Days" },
  { key: "last365", label: "Last 1 Year" },
  { key: "custom", label: "Custom" },
];

// Returns {start, end} Date objects for the given filter key, or null for
// "all" (meaning: don't filter). Mirrors app/(app)/page.js's own
// getDayFilterRange (kept separate there to avoid touching working dashboard
// code) — same day boundaries (midnight to 23:59:59.999).
export function getDayFilterRange(key, customStart, customEnd) {
  if (!key || key === "all") return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  switch (key) {
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "last7":
      start.setDate(start.getDate() - 6);
      break;
    case "last30":
      start.setDate(start.getDate() - 29);
      break;
    case "last60":
      start.setDate(start.getDate() - 59);
      break;
    case "last365":
      start.setDate(start.getDate() - 364);
      break;
    case "custom": {
      if (customStart) {
        const s = new Date(customStart);
        if (!Number.isNaN(s.getTime())) {
          s.setHours(0, 0, 0, 0);
          start.setTime(s.getTime());
        }
      }
      if (customEnd) {
        const e = new Date(customEnd);
        if (!Number.isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          end.setTime(e.getTime());
        }
      }
      break;
    }
    default:
      break;
  }
  return { start, end };
}

// Convenience predicate — pass any date-ish value (string/Date), get back
// whether it falls inside the resolved range. `range` is the object
// returned by getDayFilterRange (or null, meaning "no filter, always true").
export function isWithinDayFilter(dateVal, range) {
  if (!range) return true;
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

// Builds the query-string fragment a dashboard card click should append so
// the destination page opens pre-filtered to the same period, e.g.
// buildDayFilterQuery("last7") -> "day=last7", or "" for "all"/unset.
export function buildDayFilterQuery(dayFilter, customStart, customEnd) {
  if (!dayFilter || dayFilter === "all") return "";
  const params = new URLSearchParams({ day: dayFilter });
  if (dayFilter === "custom") {
    if (customStart) params.set("start", customStart);
    if (customEnd) params.set("end", customEnd);
  }
  return params.toString();
}
