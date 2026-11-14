import { getTranslations } from "next-intl/server";
import styles from "./overview.module.css";

export async function OverviewMetrics({ entity }: { entity: "projects" | "tasks" }) {
  const t = await getTranslations("Overview");
  const compact = entity === "tasks";
  const labels = compact
    ? ["taskTotal", "taskOpen", "taskCompleted", "taskCanceled"] as const
    : ["projectTotal", "projectOpen", "projectCompleted", "projectCanceled"] as const;
  const headingId = `overview-${entity}`;

  return (
    <section aria-labelledby={headingId} className={compact ? `${styles.taskPanel} min-w-0 rounded-3xl border border-border/15 bg-surface/90 shadow-panel` : undefined}>
      <h2 id={headingId} className={styles.sectionTitle}>{t(entity)}</h2>
      <dl className={compact ? styles.taskMetrics : styles.projectMetrics}>
        {labels.map((label, index) => (
          <div key={label} className={compact
            ? `${styles.taskMetric} flex min-w-0 flex-col`
            : `${styles.projectMetric} flex min-w-0 flex-col rounded-2xl border border-border/10 shadow-panel ${index === 0 ? "bg-surface-highlight" : index === 2 ? "bg-surface-positive" : "bg-surface/90"}`}
          >
            <dt className="text-base text-foreground/80">{t(label)}</dt>
            <dd className={`${styles.metricValue} tabular-nums`}>
              <span aria-hidden="true">&mdash;</span>
              <span className="sr-only">{t("pendingValue")}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
