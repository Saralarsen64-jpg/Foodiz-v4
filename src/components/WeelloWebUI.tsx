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
        "relative overflow-hidden rounded-[2rem] border border-weello-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.2),transparent_34%),linear-gradient(145deg,rgba(216,168,79,.12),rgba(17,17,17,.98)_36%,rgba(5,5,5,1))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.5)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-weello-gold/10 bg-weello-gold/10 blur-sm" />
      <div className="relative">
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-weello-gold">
            <Sparkles size={13} /> {eyebrow}
          </p>
        )}
        <h1 className="weello-title text-3xl leading-tight text-weello-cream sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-weello-gray">
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
    <article className="rounded-[1.4rem] border border-weello-gold/15 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl border",
            tone === "green"
              ? "border-weello-green/25 bg-weello-green/10 text-weello-green"
              : tone === "muted"
                ? "border-white/10 bg-white/5 text-weello-gray"
                : "border-weello-gold/25 bg-weello-gold/10 text-weello-gold",
          )}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-weello-gray">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-serif italic text-weello-cream",
          tone === "green" && "text-weello-green",
          tone === "gold" && "text-weello-gold",
        )}
      >
        {value}
      </p>
      {helper && <p className="mt-1 text-[11px] leading-relaxed text-weello-gray">{helper}</p>}
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
        "group relative isolate w-full overflow-hidden rounded-[1.5rem] border border-weello-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,.1),rgba(10,10,10,.98)_36%)] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_12px_30px_rgba(0,0,0,.22)] transition-all duration-300 hover:-translate-y-1 hover:border-weello-gold/45 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.055),0_20px_50px_rgba(0,0,0,.42),0_0_30px_rgba(216,168,79,.07)] active:translate-y-0 active:scale-[.992] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-weello-black",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-weello-gold/65 to-transparent opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-weello-gold/[.08] blur-2xl transition duration-500 group-hover:bg-weello-gold/[.14]" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-weello-gold/30 bg-[radial-gradient(circle_at_30%_20%,rgba(240,200,111,.2),rgba(216,168,79,.08))] text-weello-gold shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_8px_22px_rgba(0,0,0,.25)] transition duration-300 group-hover:scale-105 group-hover:border-weello-gold/55">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-weello-cream">{title}</h3>
            {badge && <WeelloPill>{badge}</WeelloPill>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-weello-gray">{description}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-weello-gold/20 bg-weello-gold/[.06] text-weello-gold/65 transition duration-300 group-hover:translate-x-0.5 group-hover:border-weello-gold/45 group-hover:bg-weello-gold/[.12] group-hover:text-weello-gold">
          <ChevronRight size={16} />
        </span>
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
        tone === "green" && "border-weello-green/25 bg-weello-green/10 text-weello-green",
        tone === "red" && "border-weello-red/25 bg-weello-red/10 text-weello-red",
        tone === "muted" && "border-white/10 bg-white/5 text-weello-gray",
        tone === "gold" && "border-weello-gold/25 bg-weello-gold/10 text-weello-gold",
      )}
    >
      {children}
    </span>
  );
}
