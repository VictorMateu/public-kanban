import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("Common");

  return (
    <main
      id="main-content"
      aria-label={t("mainContent")}
      tabIndex={-1}
      className="flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    />
  );
}
