import "server-only";

export async function getOverviewSummary(): Promise<{ status: "pending" }> {
  // TODO: Query exact public project/task counts once lifecycle states are defined.
  // TODO: Query created/completed activity by month or day once event dates are defined.
  // Keep future reads independent of the administrator session and enforce public visibility.
  return { status: "pending" };
}
