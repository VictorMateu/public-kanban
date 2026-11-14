export function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false" className="size-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </svg>
  );
}

export function SessionIndicator({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/20 bg-positive text-foreground">
      <AccountIcon />
    </span>
  );
}
