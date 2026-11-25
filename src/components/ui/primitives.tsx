import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[#1e3a5f] text-white hover:bg-[#162d4a] border border-[#1e3a5f] disabled:opacity-45",
    secondary:
      "bg-[#f1f5f9] text-[#1e293b] hover:bg-[#e2e8f0] border border-[#e2e8f0] disabled:opacity-45",
    outline:
      "bg-white text-[#1e293b] hover:bg-[#f8fafc] border border-[#cbd5e1] hover:border-[#1e3a5f]/45 disabled:opacity-45",
    ghost:
      "bg-transparent text-[#475569] hover:bg-[#f1f5f9] hover:text-[#1e293b] border border-transparent disabled:opacity-45",
    danger:
      "bg-red-700 text-white hover:bg-red-800 border border-red-700 disabled:opacity-45",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-xs font-medium",
    md: "h-10 px-4 text-sm font-medium",
    lg: "h-11 px-5 text-sm font-semibold",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-[#e2e8f0]/80 px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[15px] font-semibold tracking-[-0.015em] text-[#1e293b]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs sm:text-[13px] leading-relaxed text-[#64748b]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export type BadgeTone = "neutral" | "dark" | "success" | "warning" | "error";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]",
    dark: "bg-[#eff4fa] text-[#1e3a5f] border-[#c7d9ec] font-semibold",
    success: "bg-emerald-50/90 text-emerald-800 border-emerald-200/90",
    warning: "bg-amber-50/90 text-amber-900 border-amber-200/90",
    error: "bg-red-50/90 text-red-800 border-red-200/90",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium leading-4",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-medium text-[#475569] mb-1.5", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#1e293b] placeholder:text-[#94a3b8] transition-colors focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:bg-[#f8fafc] disabled:text-[#64748b]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#1e293b] transition-colors focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:bg-[#f8fafc]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] transition-colors focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:bg-[#f8fafc]",
        className,
      )}
      {...props}
    />
  );
}

export function AlertBanner({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    neutral: "border-[#e2e8f0] border-l-[#1e3a5f] bg-[#f8fafc] text-[#1e293b]",
    success: "border-emerald-200 border-l-emerald-600 bg-emerald-50/70 text-emerald-950",
    warning: "border-amber-200 border-l-amber-600 bg-amber-50/75 text-amber-950",
    error: "border-red-200 border-l-red-600 bg-red-50/75 text-red-950",
  };

  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? AlertTriangle
        : tone === "error"
          ? AlertCircle
          : Info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-l-2 px-4 py-3.5 text-sm",
        styles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && (
          <p className="text-[13px] font-semibold tracking-[-0.01em] leading-snug">
            {title}
          </p>
        )}
        <div className="text-xs sm:text-[13px] leading-relaxed opacity-90">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-6 py-14 text-center">
      {icon && (
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-[-0.015em] text-[#1e293b]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#64748b]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[#e2e8f0]/75", className)} />;
}

/**
 * Crisp inline proportional progress bar for SAW scores (0..1) or AHP weights.
 */
export function ScoreBar({
  value,
  max = 1,
  inverted = false,
  className,
}: {
  value: number;
  max?: number;
  inverted?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        inverted ? "bg-white/20" : "bg-[#e2e8f0]",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          inverted ? "bg-white" : "bg-[#1e3a5f]",
        )}
        style={{ width: `${pct.toFixed(2)}%` }}
      />
    </div>
  );
}

/**
 * Compact visual CR threshold gauge relative to the 0.10 AHP consistency cutoff.
 */
export function CrGaugeBar({ cr }: { cr: number | null }) {
  if (cr === null) return null;
  const maxVisual = 0.5;
  const pct = Math.max(0, Math.min(100, (cr / maxVisual) * 100));
  const thresholdPct = (0.1 / maxVisual) * 100; // 20% mark
  const passes = cr <= 0.1 + 1e-12;

  return (
    <div className="relative mt-1 h-1.5 w-24 rounded-full bg-[#e2e8f0]" aria-hidden="true">
      <div
        className={cn(
          "h-full rounded-full",
          passes ? "bg-emerald-600" : "bg-red-600",
        )}
        style={{ width: `${Math.max(pct, cr === 0 ? 3 : pct)}%` }}
      />
      <span
        className="absolute -top-0.5 bottom-[-2px] w-[1.5px] bg-[#1e3a5f]/60"
        style={{ left: `${thresholdPct}%` }}
        title="Ambang CR 0,10"
      />
    </div>
  );
}

/**
 * Accessible right-hand slide-over inspection/editing drawer for Admin workflows.
 */
export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0f172a]/35"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="animate-drawer-in relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-[#e2e8f0] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-[-0.015em] text-[#1e293b]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[#64748b] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup panel"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f1f5f9] hover:text-[#1e293b] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function formatStockStatusLabel(status: string): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "confirmed_available":
      return { label: "Stok terkonfirmasi", tone: "success" };
    case "indexed_in_stock":
      return { label: "Tercatat di indeks", tone: "neutral" };
    case "confirmation_required":
      return { label: "Perlu konfirmasi penjual", tone: "warning" };
    case "withdrawn_series":
      return { label: "Seri withdrawn / cek stok", tone: "warning" };
    case "unavailable":
      return { label: "Tidak tersedia", tone: "error" };
    default:
      return { label: "Stok belum dikonfirmasi", tone: "warning" };
  }
}

export function formatEvidenceStatusLabel(status: string): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "verified_by_researcher":
      return { label: "Bukti terverifikasi", tone: "success" };
    case "incomplete":
      return { label: "Bukti belum lengkap", tone: "error" };
    default:
      return { label: "Provisional", tone: "warning" };
  }
}
