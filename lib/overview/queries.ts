import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createPublicSupabaseClient } from "../supabase/public";
import { activityDates, bucketActivity, type OverviewActivityData } from "./activity";

export type OverviewSummary = {
  projects: { total: number; open: number; completed: number; canceled: number };
  tasks: { total: number; open: number; completed: number };
};

async function readActivityDates<Row>(
  readPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null }>,
  dateOf: (row: Row) => string | null,
): Promise<string[] | null> {
  const dates: string[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data } = await readPage(offset, offset + pageSize - 1);
    if (!data) return null;
    for (const row of data) {
      const date = dateOf(row);
      if (date !== null) dates.push(date);
    }
    if (data.length < pageSize) return dates;
  }
}

export async function getOverviewActivity(summary: Promise<OverviewSummary | null>): Promise<OverviewActivityData> {
  if (!isSupabaseConfigured()) return { projects: null, tasks: null };

  const now = new Date();
  const months = activityDates(now, "month");
  const days = activityDates(now, "day");
  const firstDate = months[0] ?? now.toISOString().slice(0, 10);
  const client = createPublicSupabaseClient();
  const utcDate = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);
  const [projects, tasks, completedTasks, counts] = await Promise.all([
    readActivityDates((from, to) => client.from("projects").select("created_at")
      .gte("created_at", `${firstDate}T00:00:00Z`).lte("created_at", now.toISOString()).order("id").range(from, to), row => utcDate(row.created_at)),
    readActivityDates((from, to) => client.from("tasks").select("created_at")
      .gte("created_at", `${firstDate}T00:00:00Z`).lte("created_at", now.toISOString()).order("id").range(from, to), row => utcDate(row.created_at)),
    readActivityDates((from, to) => client.from("tasks").select("completed_on")
      .gte("completed_on", firstDate).lte("completed_on", utcDate(now.toISOString())).order("id").range(from, to), row => row.completed_on),
    summary,
  ]);

  const buildSeries = (created: string[], completed: string[] | null) => ({
    month: bucketActivity(months, "month", created, completed),
    day: bucketActivity(days, "day", created, completed),
  });

  return {
    projects: projects && buildSeries(projects, counts?.projects.completed === 0 ? [] : null),
    tasks: tasks && completedTasks && buildSeries(tasks, completedTasks),
  };
}

export async function getOverviewSummary(): Promise<OverviewSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const client = createPublicSupabaseClient();
  const projects = () => client.from("projects").select("id", { count: "exact", head: true });
  const tasks = () => client.from("tasks").select("id, columns!inner(stage)", { count: "exact", head: true });
  const [openProjects, completedProjects, canceledProjects, openTasks, completedTasks] = await Promise.all([
    projects().in("status", ["development", "maintenance"]),
    projects().eq("status", "completed"),
    projects().eq("status", "cancelled"),
    tasks().in("columns.stage", ["todo", "in_progress", "review"]),
    tasks().eq("columns.stage", "done"),
  ]);

  if ([openProjects, completedProjects, canceledProjects, openTasks, completedTasks].some(result => result.error)) return null;

  const { count: projectOpen } = openProjects;
  const { count: projectCompleted } = completedProjects;
  const { count: projectCanceled } = canceledProjects;
  const { count: taskOpen } = openTasks;
  const { count: taskCompleted } = completedTasks;
  if (projectOpen === null || projectCompleted === null || projectCanceled === null || taskOpen === null || taskCompleted === null) return null;

  return {
    projects: { total: projectOpen + projectCompleted + projectCanceled, open: projectOpen, completed: projectCompleted, canceled: projectCanceled },
    tasks: { total: taskOpen + taskCompleted, open: taskOpen, completed: taskCompleted },
  };
}
