"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PUBLIC_NAV = [
  { href: "/", label: "Beranda" },
  { href: "/rekomendasi", label: "Rekomendasi" },
  { href: "/laptop", label: "Katalog" },
  { href: "/bandingkan", label: "Bandingkan" },
  { href: "/metodologi", label: "Metodologi" },
  { href: "/tentang", label: "Tentang" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1e293b]">
      <header className="no-print sticky top-0 z-30 border-b border-[#e2e8f0] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-[#1e3a5f] bg-[#1e3a5f] font-mono text-[11px] font-semibold tracking-tighter text-white transition-transform duration-150 group-hover:scale-[1.03]">
              LM
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.025em] text-[#1e293b]">
                LaptopMatch
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b] sm:inline">
                AHP–SAW
              </span>
            </div>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden h-full items-center gap-1 md:flex"
          >
            {PUBLIC_NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex h-full items-center px-3 text-[13px] font-medium transition-colors",
                    active
                      ? "text-[#1e3a5f]"
                      : "text-[#64748b] hover:text-[#1e293b]",
                  )}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute inset-x-3 bottom-0 h-[2px] bg-[#1e3a5f]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center md:flex">
            <Link
              href="/admin"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2.5 font-mono text-[11px] font-medium text-[#475569] transition-colors hover:border-[#1e3a5f]/40 hover:bg-white hover:text-[#1e3a5f]"
            >
              Panel Admin
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f8fafc] md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#e2e8f0] bg-white px-4 py-4 md:hidden">
            <nav aria-label="Navigasi mobile" className="divide-y divide-[#e2e8f0]/75">
              {PUBLIC_NAV.map((item, idx) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex min-h-[48px] items-center justify-between px-1 text-sm font-medium",
                      active ? "font-semibold text-[#1e3a5f]" : "text-[#475569]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#64748b]">
                        0{idx + 1}
                      </span>
                      {item.label}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1e3a5f]" />
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-[#e2e8f0] pt-4">
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3.5 text-sm font-medium text-[#1e293b]"
              >
                <span>Masuk Panel Administrator</span>
                <ArrowUpRight className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="no-print border-t border-[#e2e8f0] bg-[#f8fafc]">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="space-y-3 md:col-span-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#1e3a5f] font-mono text-[10px] font-semibold text-white">
                  LM
                </span>
                <span className="text-sm font-semibold tracking-[-0.02em] text-[#1e293b]">
                  LaptopMatch
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-[#475569]">
                Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga
                Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP)
                dan Simple Additive Weighting (SAW).
              </p>
            </div>

            <div className="space-y-2 md:col-span-4">
              <p className="editorial-kicker">Identitas Akademik</p>
              <p className="text-xs font-semibold text-[#1e293b]">
                Kelompok 13 — Sistem Pendukung Keputusan
              </p>
              <p className="font-mono text-[11px] leading-relaxed text-[#475569]">
                Wahyu Setiawan (23082010142)
                <br />
                Lingga Dwi Al Farizi (23082010146)
                <br />
                M. Ahnaf Zaki (23082010147)
              </p>
              <p className="text-[11px] text-[#64748b]">
                Program Studi Sistem Informasi, Fakultas Ilmu Komputer, UPN &ldquo;Veteran&rdquo;
                Jawa Timur (2026)
              </p>
            </div>

            <div className="space-y-2 md:col-span-3">
              <p className="editorial-kicker">Integritas &amp; Batasan</p>
              <p className="text-xs leading-relaxed text-[#475569]">
                Bukan platform e-commerce dan bukan rekomendasi berbasis AI/ML. Seluruh skor
                dihitung deterministik dari kuesioner mahasiswa dan snapshot audit bersumber,
                bukan harga maupun stok real-time.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-[#e2e8f0] pt-5 text-[11px] text-[#64748b] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono">
              ALGORITMA: AHP POWER ITERATION + AIJ · SAW FULL PRECISION
            </span>
            <div className="flex flex-wrap gap-4">
              <Link href="/rekomendasi" className="hover:text-[#1e3a5f]">
                Rekomendasi
              </Link>
              <Link href="/metodologi" className="hover:text-[#1e3a5f]">
                Metodologi
              </Link>
              <Link href="/tentang" className="hover:text-[#1e3a5f]">
                Tentang
              </Link>
              <Link href="/admin/login" className="hover:text-[#1e3a5f]">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
