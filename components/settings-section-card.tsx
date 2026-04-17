import type { ReactNode } from "react";

interface SettingsSectionCardProps {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}

export function SettingsSectionCard({
  title,
  description,
  badge,
  children,
}: SettingsSectionCardProps) {
  return (
    <section className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/70 p-5 shadow-[0_16px_48px_rgba(23,20,17,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--ink-900)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">
            {description}
          </p>
        </div>
        {badge ? (
          <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
