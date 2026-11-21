"use client";

import { useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { ActivityPeriod, OverviewActivityData } from "../../lib/overview/activity";
import styles from "./overview.module.css";

const activityDescriptions = {
  tasks: { month: "taskActivityMonths", day: "taskActivityDays" },
  projects: { month: "projectActivityMonths", day: "projectActivityDays" },
} as const;

export function OverviewActivity({ data }: { data: OverviewActivityData }) {
  const t = useTranslations("Overview");
  const format = useFormatter();
  const [entity, setEntity] = useState<"tasks" | "projects">("tasks");
  const [period, setPeriod] = useState<ActivityPeriod>("month");
  const id = useId();
  const buttonClass = "min-h-11 min-w-0 flex-1 rounded-full px-3 py-2 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
  const buckets = data[entity]?.[period];
  const peak = Math.max(0, ...(buckets ?? []).flatMap(bucket => [bucket.created, bucket.completed ?? 0]));
  const createdLabel = t(entity === "tasks" ? "tasksCreated" : "projectsCreated");
  const completedLabel = t(entity === "tasks" ? "tasksCompleted" : "projectsCompleted");
  const missingCompletionDates = buckets?.some(bucket => bucket.completed === null);

  return (
    <section aria-labelledby={`${id}-title`} className={`${styles.activityPanel} min-w-0 rounded-3xl border border-border/15 bg-surface/90 shadow-panel`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>{t("activityTitle")}</h2>
      <p id={`${id}-description`} aria-live="polite" aria-atomic="true" className={`${styles.activityDescription} text-base text-foreground/80`}>
        {t(activityDescriptions[entity][period])}
      </p>
      <div className={styles.activityControls}>
        <div role="group" aria-label={t("activityEntity")} className="flex max-w-full rounded-full border border-border/10 bg-surface-warm p-1">
          {(["tasks", "projects"] as const).map(option => (
            <button key={option} type="button" aria-pressed={entity === option} onClick={() => setEntity(option)} className={`${buttonClass} ${entity === option ? "bg-accent text-accent-foreground" : "hover:bg-surface"}`}>
              {t(option)}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("activityPeriod")} className="flex max-w-full rounded-full border border-border/10 bg-surface-warm p-1">
          {(["month", "day"] as const).map(option => (
            <button key={option} type="button" aria-pressed={period === option} onClick={() => setPeriod(option)} className={`${buttonClass} ${period === option ? "bg-accent text-accent-foreground" : "hover:bg-surface"}`}>
              {t(option)}
            </button>
          ))}
        </div>
      </div>
      <figure aria-describedby={`${id}-description`} className={styles.activityFigure}>
        <div className={styles.activityPlot}>
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="border-t border-border/10" />)}
          </div>
          {!buckets ? <p className="relative rounded-2xl bg-surface px-4 py-2 text-center" role="status">{t("activityUnavailable")}</p> : (
            <ol role="list" className={styles.activityBuckets} aria-label={t(period === "month" ? "activityLastMonths" : "activityLastDays")}>
              {buckets.map(bucket => {
                const date = new Date(`${bucket.date}T00:00:00Z`);
                const fullDate = format.dateTime(date, period === "month"
                  ? { month: "long", year: "numeric", timeZone: "UTC" }
                  : { dateStyle: "long", timeZone: "UTC" });
                const shortDate = format.dateTime(date, period === "month"
                  ? { month: "short", timeZone: "UTC" }
                  : { day: "numeric", timeZone: "UTC" });
                const values = `${fullDate} · ${createdLabel}: ${format.number(bucket.created)} · ${completedLabel}: ${bucket.completed === null ? t("unavailableValue") : format.number(bucket.completed)}`;

                return (
                  <li key={bucket.date} className={styles.activityBucket} title={values}>
                    <span className="sr-only">{values}</span>
                    <div className={styles.activityBars} aria-hidden="true">
                      {([bucket.created, bucket.completed] as const).map((count, index) => (
                        <span key={index} className={`${styles.activityBar} ${index === 0 ? "bg-accent" : "bg-positive"} ${count ? "border border-border/40" : ""}`}
                          style={{ height: count && peak ? `${100 * count / peak}%` : 0 }} />
                      ))}
                    </div>
                    <span aria-hidden="true" className="text-xs">{shortDate}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <figcaption className={`${styles.activityLegend} flex flex-wrap gap-x-5 gap-y-2 text-base text-foreground/80`}>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-full border border-border/40 bg-accent" />{createdLabel}</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-full border border-border/40 bg-positive" />{completedLabel}</span>
          {buckets && (missingCompletionDates || peak === 0) && (
            <p className="w-full text-sm" role="status">{t(missingCompletionDates ? "projectCompletionUnavailable" : "activityEmpty")}</p>
          )}
        </figcaption>
      </figure>
    </section>
  );
}
