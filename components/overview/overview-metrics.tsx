import { getFormatter, getTranslations } from "next-intl/server";
import type { OverviewSummary } from "../../lib/overview/queries";
import styles from "./overview.module.css";

type MetricsProps = { entity: "projects"; counts: OverviewSummary["projects"] | undefined }
  | { entity: "tasks"; counts: OverviewSummary["tasks"] | undefined };

export async function OverviewMetrics(props: MetricsProps) {
  const [t, format] = await Promise.all([getTranslations("Overview"), getFormatter()]);
  const { entity, counts } = props;
  const compact = entity === "tasks";
  const metrics = compact
    ? [["taskTotal", counts?.total], ["taskOpen", counts?.open], ["taskCompleted", counts?.completed]] as const
    : [["projectTotal", counts?.total], ["projectOpen", counts?.open], ["projectCompleted", counts?.completed], ["projectCanceled", counts?.canceled]] as const;
  const headingId = `overview-${entity}`;

  return (
    <section aria-labelledby={headingId} className={compact ? `${styles.taskPanel} min-w-0 rounded-3xl border border-border/15 bg-surface/90 shadow-panel` : undefined}>
      <h2 id={headingId} className={styles.sectionTitle}>{t(entity)}</h2>
      {!compact && <p className="text-sm text-foreground/75">{t("publicBoardScope")}</p>}
      <dl className={compact ? styles.taskMetrics : styles.projectMetrics}>
        {metrics.map(([label, value], index) => (
          <div key={label} className={compact
            ? `${styles.taskMetric} flex min-w-0 flex-col`
            : `${styles.projectMetric} flex min-w-0 flex-col rounded-2xl border border-border/10 shadow-panel ${index === 0 ? "bg-surface-highlight" : index === 2 ? "bg-surface-positive" : "bg-surface/90"}`}
          >
            <dt className="text-base text-foreground/80">{t(label)}</dt>
            <dd className={`${styles.metricValue} tabular-nums`}>
              {value === undefined ? <>
                <span aria-hidden="true">&mdash;</span>
                <span className="sr-only">{t("unavailableValue")}</span>
              </> : format.number(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
