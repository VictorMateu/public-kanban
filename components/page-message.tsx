import type { ReactNode } from "react";

type PageMessageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  announce?: boolean;
  children?: ReactNode;
};

export function PageMessage({ eyebrow, title, description, announce = false, children }: PageMessageProps) {
  return (
    <main id="main-content" className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-8">
      <section aria-labelledby="message-title" className="w-full max-w-xl rounded-3xl border border-border/15 bg-surface/90 p-5 shadow-panel sm:p-10">
        <div role={announce ? "alert" : undefined}>
          {eyebrow && <p className="mb-4 text-sm tracking-widest text-foreground/75 uppercase">{eyebrow}</p>}
          <h1 id="message-title" className="text-3xl wrap-anywhere sm:text-5xl">{title}</h1>
          <p className="mt-5 leading-relaxed text-foreground/80 wrap-anywhere">{description}</p>
        </div>
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </section>
    </main>
  );
}
