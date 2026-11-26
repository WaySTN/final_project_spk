"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calculator,
  FileSpreadsheet,
  History,
  Laptop,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Scale,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface NavGroup {
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Data Penelitian",
    items: [
      { href: "/admin/kriteria", label: "Kriteria", icon: ListChecks },
      { href: "/admin/responden", label: "Responden", icon: Users },
      { href: "/admin/alternatif", label: "Alternatif Laptop", icon: Laptop },
    ],
  },
  {
    label: "Komputasi SPK",
    items: [
      { href: "/admin/perhitungan/ahp", label: "Perhitungan AHP", icon: Scale },
      { href: "/admin/perhitungan/saw", label: "Perhitungan SAW", icon: Calculator },
      {
        href: "/admin/perhitungan/sensitivitas",
        label: "Analisis Sensitivitas",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: "Publikasi & Arsip",
    items: [
      { href: "/admin/riwayat", label: "Riwayat & Publikasi", icon: History },
      { href: "/admin/laporan", label: "Laporan & Ekspor", icon: FileSpreadsheet },
    ],
  },
];

function getActiveSectionLabel(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)) {
        return item.label;
      }
    }
  }
  return "Dashboard";
}

export function AdminShell({
  adminEmail,
  adminName,
  children,
}: {
  adminEmail: string;
  adminName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const activeLabel = getActiveSectionLabel(pathname);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function renderNav(onNavigate?: () => void) {
    return (
      <nav
        aria-label="Navigasi Dashboard Administrator"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-5"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#64748b]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "border border-[#cbd5e1] bg-white text-[#1e3a5f] shadow-[0_1px_2px_rgba(15,23,42,0.04)] before:absolute before:inset-y-2 before:left-0 before:w-[2.5px] before:rounded-r before:bg-[#1e3a5f]"
                          : "border border-transparent text-[#475569] hover:bg-[#e2e8f0]/60 hover:text-[#1e293b]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-[#1e3a5f]" : "text-[#64748b]",
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#e2e8f0] bg-[#f1f5f9]/85 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[#e2e8f0] bg-white px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1e3a5f] font-mono text-xs font-bold tracking-tight text-white">
            LM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-[#1e293b]">
              LaptopMatch
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Panel Peneliti
            </p>
          </div>
        </div>

        {renderNav()}

        <div className="space-y-2.5 border-t border-[#e2e8f0] bg-white/80 p-3">
          <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5">
            <p className="truncate text-xs font-semibold text-[#1e293b]">{adminName}</p>
            <p className="truncate font-mono text-[11px] text-[#64748b]">{adminEmail}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {loggingOut ? "Keluar..." : "Logout"}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1e3a5f] font-mono text-xs font-bold text-white">
            LM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.015em] text-[#1e293b]">
              {activeLabel}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#64748b]">
              LaptopMatch Admin
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Buka menu navigasi admin"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] hover:bg-[#f1f5f9]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#0f172a]/35"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[#e2e8f0] bg-[#f8fafc] shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-[#1e3a5f] font-mono text-[11px] font-bold text-white">
                  LM
                </span>
                <span className="text-sm font-semibold tracking-[-0.015em] text-[#1e293b]">
                  Menu Peneliti
                </span>
              </div>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#475569] hover:bg-[#f1f5f9]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {renderNav(() => setMobileOpen(false))}
            <div className="space-y-2 border-t border-[#e2e8f0] bg-white p-3">
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                <p className="truncate text-xs font-semibold text-[#1e293b]">{adminName}</p>
                <p className="truncate font-mono text-[11px] text-[#64748b]">{adminEmail}</p>
              </div>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-[#e2e8f0] px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f1f5f9]"
              >
                <span>Website Publik</span>
                <ArrowUpRight className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
              </Link>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main workspace */}
      <div className="lg:pl-64">
        {/* Desktop slim breadcrumb header */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-[#e2e8f0] bg-white/95 px-8 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-mono uppercase tracking-[0.12em]">Panel Peneliti</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#1e293b]">{activeLabel}</span>
          </div>
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-medium text-[#1e293b] transition-colors hover:border-[#1e3a5f]/40 hover:bg-white hover:text-[#1e3a5f]"
          >
            <span>Website Publik</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#64748b]" aria-hidden="true" />
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
