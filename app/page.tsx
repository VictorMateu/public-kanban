import { getTranslations } from "next-intl/server";
import { OverviewActivity } from "../components/overview/overview-activity";
import { OverviewMetrics } from "../components/overview/overview-metrics";
import { getOverviewSummary } from "../lib/overview/queries";
import styles from "../components/overview/overview.module.css";

export default async function Home() {
  const [t, common, summary] = await Promise.all([
    getTranslations("Overview"),
    getTranslations("Common"),
    getOverviewSummary(),
  ]);

  return (
    <main
      id="main-content"
      aria-label={common("mainContent")}
      tabIndex={-1}
      className={`${styles.overview} mx-auto w-full max-w-7xl flex-1 space-y-7 px-4 pt-7 pb-12 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:space-y-9 sm:px-8 sm:pt-10 lg:px-10`}
    >
      <header className="max-w-2xl">
        <p className="text-sm tracking-widest text-foreground/75 uppercase">{common("appName")}</p>
        <h1 className="mt-3 text-4xl text-balance sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-foreground/80">{t("description")}</p>
        <a href="https://victormateulopez.com" className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-md text-lg underline decoration-border/35 underline-offset-4 transition-colors hover:decoration-border focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
          {t("personalWebsite")}
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 shrink-0"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </a>
      </header>
      <OverviewMetrics entity="projects" />
      <div className={styles.content}>
        <OverviewActivity />
        <OverviewMetrics entity="tasks" />
      </div>
      <p role="status" className="text-sm text-foreground/75">{t(summary.status)}</p>
    </main>
  );
}
