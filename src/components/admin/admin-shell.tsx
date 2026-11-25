"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calculator,
  FileSpreadsheet,
  Globe,
  History,
  Laptop,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Scale,
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
      <nav aria-label="Navigasi Dashboard Administrator" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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
                      className={cn(
                        "flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Laptop className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">LaptopMatch</p>
            <p className="truncate text-[11px] text-zinc-500">Admin SPK AHP–SAW</p>
          </div>
        </div>

        {renderNav()}

        <div className="border-t border-zinc-200 p-3 space-y-2">
          <Link
            href="/"
            className="flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            Lihat Website Publik
          </Link>
          <div className="rounded-lg bg-zinc-50 px-2.5 py-2 border border-zinc-200">
            <p className="truncate text-xs font-medium text-zinc-900">{adminName}</p>
            <p className="truncate text-[11px] text-zinc-500">{adminEmail}</p>
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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Laptop className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold">LaptopMatch Admin</span>
        </div>
        <button
          type="button"
          aria-label="Buka menu navigasi admin"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-zinc-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
              <span className="text-sm font-semibold">Menu Administrator</span>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {renderNav(() => setMobileOpen(false))}
            <div className="border-t border-zinc-200 p-3 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-2.5 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                Website Publik
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
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
