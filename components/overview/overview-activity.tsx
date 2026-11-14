"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./overview.module.css";

const activityDescriptions = {
  tasks: { month: "taskActivityMonths", day: "taskActivityDays" },
  projects: { month: "projectActivityMonths", day: "projectActivityDays" },
} as const;

export function OverviewActivity() {
  const t = useTranslations("Overview");
  const [entity, setEntity] = useState<"tasks" | "projects">("tasks");
  const [period, setPeriod] = useState<"month" | "day">("month");
  const id = useId();
  const buttonClass = "min-h-11 min-w-0 flex-1 rounded-full px-3 py-2 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
          <div className="relative max-w-full rounded-2xl bg-surface px-5 py-4 text-center">
            <p className="text-lg">{t("activityPending")}</p>
            <p className="mt-1 text-sm text-foreground/75">{t("activityPendingDescription")}</p>
          </div>
        </div>
        <figcaption className={`${styles.activityLegend} flex flex-wrap gap-x-5 gap-y-2 text-base text-foreground/80`}>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-accent" />{t(entity === "tasks" ? "tasksCreated" : "projectsCreated")}</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-positive" />{t(entity === "tasks" ? "tasksCompleted" : "projectsCompleted")}</span>
        </figcaption>
      </figure>
    </section>
  );
}
