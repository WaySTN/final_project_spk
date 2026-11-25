import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
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
      "bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-900 disabled:opacity-50",
    secondary:
      "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200 disabled:opacity-50",
    outline:
      "bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-300 disabled:opacity-50",
    ghost:
      "bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent disabled:opacity-50",
    danger:
      "bg-red-700 text-white hover:bg-red-800 border border-red-700 disabled:opacity-50",
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
        "inline-flex items-center justify-center gap-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap",
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
        "rounded-xl border border-zinc-200 bg-white text-zinc-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-zinc-100 px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-zinc-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-zinc-500", className)} {...props} />;
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
    neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
    dark: "bg-zinc-900 text-white border-zinc-900",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
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
      className={cn("block text-xs font-medium text-zinc-700 mb-1.5", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 disabled:bg-zinc-50 disabled:text-zinc-500",
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
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 disabled:bg-zinc-50",
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
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 disabled:bg-zinc-50",
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
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-red-200 bg-red-50 text-red-900",
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
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        styles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        <div className="leading-relaxed">{children}</div>
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-100", className)} />;
}

export function formatStockStatusLabel(status: string): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "confirmed_available":
      return { label: "Stok terkonfirmasi", tone: "success" };
    case "indexed_in_stock":
      return { label: "Tercatat tersedia di indeks", tone: "neutral" };
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
      return { label: "Provisional (belum konfirmasi penuh)", tone: "warning" };
  }
}
