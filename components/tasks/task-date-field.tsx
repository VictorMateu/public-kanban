import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./task-fields.module.css";

function moveDate(date: Date, days: number, months = 0) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months, next.getUTCDate() + days);
  return next;
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function TaskDateField({ fieldClass, initialDate }: { fieldClass: string; initialDate?: string | null }) {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations("TaskManagement");
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialDate ?? "");
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const month = new Date(cursor);
  month.setUTCDate(1);
  const weekStart = locale === "en" ? 0 : 1;
  const offset = (month.getUTCDay() - weekStart + 7) % 7;
  const daysInMonth = moveDate(month, -1, 1).getUTCDate();
  const weekdays = Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(2024, 0, 7 + weekStart + index)));
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  const dayFormat = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const fullWeekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const numberFormat = new Intl.NumberFormat(locale);

  function choose(date: string) {
    setValue(date);
    popover.current?.hidePopover();
    trigger.current?.focus();
  }

  function focusDay(date: Date) {
    popover.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${dateValue(date)}"]`)?.focus();
  }

  function openCalendar() {
    const selected = input.current?.valueAsDate;
    const day = selected && selected.getUTCFullYear() >= 1 && selected.getUTCFullYear() <= 9999
      ? selected : new Date(`${localToday}T00:00:00Z`);
    setCursor(day);
    requestAnimationFrame(() => { if (popover.current?.matches(":popover-open")) focusDay(day); });
  }

  function moveMonth(base: Date, months: number) {
    const target = new Date(base);
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() + months);
    target.setUTCDate(Math.min(base.getUTCDate(), moveDate(target, -1, 1).getUTCDate()));
    return target;
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: Date;
    if (event.key === "PageUp" || event.key === "PageDown") {
      target = moveMonth(day, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    } else {
      const step = delta[event.key];
      if (step === undefined) return;
      target = moveDate(day, step);
    }
    event.preventDefault();
    if (target.getUTCFullYear() < 1 || target.getUTCFullYear() > 9999) return;
    setCursor(target);
    requestAnimationFrame(() => focusDay(target));
  }

  return <div className="grid min-w-0 content-start gap-1">
    <label htmlFor={id}>{t("expectedDate")}</label>
    <div className={styles.dateField}>
      <input ref={input} id={id} className={`${fieldClass} ${styles.dateInput}`} type="date" name="due_date"
        min="0001-01-01" max="9999-12-31" value={value} onChange={(event) => setValue(event.target.value)} />
      <button ref={trigger} type="button" className={styles.calendarTrigger} popoverTarget={`${id}-calendar`}
        onClick={openCalendar} aria-label={t("openCalendar")}>
        <span aria-hidden="true" className={styles.calendarIcon} />
      </button>
      <div ref={popover} id={`${id}-calendar`} popover="auto" role="group" aria-label={t("calendar")}
        className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button type="button" aria-label={t("previousMonth")} disabled={month.getUTCFullYear() === 1 && month.getUTCMonth() === 0}
            onClick={() => setCursor(moveMonth(cursor, -1))}><span aria-hidden="true">‹</span></button>
          <span aria-live="polite">{monthLabel}</span>
          <button type="button" aria-label={t("nextMonth")} disabled={month.getUTCFullYear() === 9999 && month.getUTCMonth() === 11}
            onClick={() => setCursor(moveMonth(cursor, 1))}><span aria-hidden="true">›</span></button>
        </div>
        <div className={styles.days}>
          {weekdays.map((day) => <span key={day.getUTCDay()} title={fullWeekdayFormat.format(day)}>{weekdayFormat.format(day)}</span>)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = moveDate(month, index);
            const iso = dateValue(day);
            return <button key={iso} type="button" style={index === 0 ? { gridColumnStart: offset + 1 } : undefined}
              data-calendar-day={iso} aria-label={dayFormat.format(day)} aria-current={iso === localToday ? "date" : undefined}
              aria-pressed={iso === value} tabIndex={iso === dateValue(cursor) ? 0 : -1}
              onFocus={() => setCursor(day)} onKeyDown={(event) => navigate(event, day)} onClick={() => choose(iso)}>
              {numberFormat.format(index + 1)}
            </button>;
          })}
        </div>
        <div className={styles.calendarFooter}>
          <button type="button" disabled={!value} onClick={() => choose("")}>{t("clearDate")}</button>
          <button type="button" onClick={() => choose(localToday)}>{t("today")}</button>
        </div>
      </div>
    </div>
  </div>;
}
