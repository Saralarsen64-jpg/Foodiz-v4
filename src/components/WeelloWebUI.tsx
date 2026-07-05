import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";

export function WeelloHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-foodiz-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.2),transparent_34%),linear-gradient(145deg,rgba(216,168,79,.12),rgba(17,17,17,.98)_36%,rgba(5,5,5,1))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.5)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-foodiz-gold/10 bg-foodiz-gold/10 blur-sm" />
      <div className="relative">
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-foodiz-gold">
            <Sparkles size={13} /> {eyebrow}
          </p>
        )}
        <h1 className="foodiz-title text-3xl leading-tight text-foodiz-cream sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-foodiz-gray">
            {description}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

export function WeelloMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "gold" | "green" | "muted";
}) {
  return (
    <article className="rounded-[1.4rem] border border-foodiz-gold/15 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl border",
            tone === "green"
              ? "border-foodiz-green/25 bg-foodiz-green/10 text-foodiz-green"
              : tone === "muted"
                ? "border-white/10 bg-white/5 text-foodiz-gray"
                : "border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold",
          )}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-foodiz-gray">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-serif italic text-foodiz-cream",
          tone === "green" && "text-foodiz-green",
          tone === "gold" && "text-foodiz-gold",
        )}
      >
        {value}
      </p>
      {helper && <p className="mt-1 text-[11px] leading-relaxed text-foodiz-gray">{helper}</p>}
    </article>
  );
}

export function WeelloActionCard({
  title,
  description,
  icon: Icon,
  path,
  onClick,
  badge,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  path?: string;
  onClick?: () => void;
  badge?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-path={path}
      className={cn(
        "group w-full rounded-[1.5rem] border border-foodiz-gold/15 bg-[linear-gradient(145deg,rgba(216,168,79,.08),rgba(10,10,10,.98)_36%)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foodiz-gold/35 hover:shadow-[0_18px_45px_rgba(0,0,0,.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foodiz-cream">{title}</h3>
            {badge && <WeelloPill>{badge}</WeelloPill>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foodiz-gray">{description}</p>
        </div>
        <ChevronRight size={18} className="text-foodiz-gold/50 transition group-hover:translate-x-1 group-hover:text-foodiz-gold" />
      </div>
    </button>
  );
}

export function WeelloPill({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "green" | "red" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em]",
        tone === "green" && "border-foodiz-green/25 bg-foodiz-green/10 text-foodiz-green",
        tone === "red" && "border-foodiz-red/25 bg-foodiz-red/10 text-foodiz-red",
        tone === "muted" && "border-white/10 bg-white/5 text-foodiz-gray",
        tone === "gold" && "border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold",
      )}
    >
      {children}
    </span>
  );
}
