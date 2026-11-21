const dayLength = 7;
const monthLength = 6;

export type ActivityPeriod = "month" | "day";
export type ActivityBucket = { date: string; created: number; completed: number | null };
export type OverviewActivityData = Record<"tasks" | "projects", Record<ActivityPeriod, ActivityBucket[]> | null>;

export function activityDates(now: Date, period: ActivityPeriod): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const length = period === "month" ? monthLength : dayLength;
  return Array.from({ length }, (_, index) => {
    const offset = index - length + 1;
    const date = period === "month"
      ? new Date(Date.UTC(year, month + offset, 1))
      : new Date(Date.UTC(year, month, now.getUTCDate() + offset));
    return date.toISOString().slice(0, 10);
  });
}

export function bucketActivity(dates: string[], period: ActivityPeriod, created: string[], completed: string[] | null): ActivityBucket[] {
  const buckets = new Map(dates.map(date => [date, { date, created: 0, completed: completed === null ? null : 0 }]));
  const bucketFor = (date: string) => buckets.get(period === "month" ? `${date.slice(0, 7)}-01` : date);
  for (const date of created) {
    const bucket = bucketFor(date);
    if (bucket) bucket.created++;
  }
  for (const date of completed ?? []) {
    const bucket = bucketFor(date);
    if (bucket && bucket.completed !== null) bucket.completed++;
  }
  return [...buckets.values()];
}
