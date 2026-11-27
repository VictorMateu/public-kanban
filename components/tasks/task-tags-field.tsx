import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TASK_TAG_LENGTH_LIMIT, TASK_TAG_LIMIT, taskTagsSchema } from "../../lib/tasks/schemas";

export function TaskTagsField({ name, draftName, initialTags, fieldClass }: {
  name: string;
  draftName: string;
  initialTags: string[];
  fieldClass: string;
}) {
  const t = useTranslations("TaskManagement");
  const taskText = useTranslations("Task");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState(initialTags);
  const [invalid, setInvalid] = useState(false);

  function addTag() {
    const field = input.current;
    if (!field) return;
    const result = taskTagsSchema.safeParse([...tags, field.value]);
    setInvalid(!result.success);
    if (result.success) {
      setTags(result.data);
      field.value = "";
    }
    field.focus();
  }

  return <div className="grid min-w-0 gap-1">
    <label htmlFor={id}>{taskText("tags")}</label>
    <div className="flex min-w-0 gap-2">
      <input ref={input} id={id} name={draftName} className={fieldClass}
        aria-describedby={invalid ? `${id}-help ${id}-error` : `${id}-help`}
        aria-invalid={invalid || undefined} onChange={() => setInvalid(false)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          addTag();
        }} />
      <button type="button" className="project-secondary-action shrink-0" onClick={addTag}>{t("addTag")}</button>
    </div>
    <p id={`${id}-help`} className="text-sm text-foreground/85">
      {t("tagLimits", { count: TASK_TAG_LIMIT, length: TASK_TAG_LENGTH_LIMIT })}
    </p>
    {invalid && <p id={`${id}-error`} role="alert" className="text-sm">{t("invalidTag")}</p>}
    {tags.length > 0 && <ul role="list" className="flex min-w-0 flex-wrap gap-2">
      {tags.map((tag) => <li key={tag} className="min-w-0 max-w-full">
        <input type="hidden" name={name} value={tag} />
        <button type="button" className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-border/30 bg-surface-warm px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={t("removeTag", { tag })} onClick={() => {
            setTags(tags.filter((item) => item !== tag));
            setInvalid(false);
            input.current?.focus();
          }}>
          <span className="min-w-0 wrap-anywhere">{tag}</span><span aria-hidden="true">×</span>
        </button>
      </li>)}
    </ul>}
  </div>;
}
