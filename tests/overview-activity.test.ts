import assert from "node:assert/strict";
import { test } from "node:test";
import { activityDates, bucketActivity } from "../lib/overview/activity.ts";

test("activity windows include today and cross year and leap-day boundaries in UTC", () => {
  assert.deepEqual(activityDates(new Date("2026-01-01T01:00:00+02:00"), "month"), [
    "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
  ]);
  assert.deepEqual(activityDates(new Date("2024-03-01T02:00:00Z"), "day"), [
    "2024-02-24", "2024-02-25", "2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01",
  ]);
});

test("creation and completion group by their own dates and preserve zero buckets", () => {
  assert.deepEqual(bucketActivity(["2026-10-01", "2026-11-01"], "month", ["2026-09-30", "2026-10-05", "2026-10-05"], ["2026-11-20"]), [
    { date: "2026-10-01", created: 2, completed: 0 },
    { date: "2026-11-01", created: 0, completed: 1 },
  ]);
  assert.deepEqual(bucketActivity(["2026-11-20", "2026-11-21"], "day", ["2026-11-20"], null), [
    { date: "2026-11-20", created: 1, completed: null },
    { date: "2026-11-21", created: 0, completed: null },
  ]);
});
