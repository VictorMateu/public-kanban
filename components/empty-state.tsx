export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/25 bg-surface/90 px-6 py-12 text-center sm:px-12 sm:py-16">
      <span aria-hidden="true" className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-accent/35 text-foreground">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16M5.5 8h1M11.5 8h1M17.5 8h1" />
        </svg>
      </span>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-3 max-w-lg leading-relaxed text-foreground/80">{description}</p>
    </div>
  );
}
