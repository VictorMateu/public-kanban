import { useTranslations } from "next-intl";

export function TaskTags({ id, tags, detail = false }: { id?: string; tags: string[]; detail?: boolean }) {
  const t = useTranslations("Task");
  if (tags.length === 0) return null;
  const shown = detail ? tags : tags.slice(0, 2);
  const remaining = tags.length - shown.length;
  return <div id={id} className={detail ? "grid gap-1" : "mt-1.5"}>
    <p className={detail ? "text-sm text-foreground/85" : "sr-only"}>{t("tags")}</p>
    <ul role="list" className="flex min-w-0 flex-wrap gap-1.5 text-sm">
      {shown.map((tag) => <li key={tag} className="max-w-full rounded-full bg-surface-warm px-2 leading-5 wrap-anywhere">{tag}</li>)}
      {remaining > 0 && <li className="rounded-full bg-surface-warm px-2 leading-5">
        <span aria-hidden="true">+{remaining}</span>
        <span className="sr-only">{t("moreTags", { count: remaining })}</span>
      </li>}
    </ul>
  </div>;
}
