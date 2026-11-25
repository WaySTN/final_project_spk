"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Laptop, Lock, Menu, X } from "lucide-react";
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
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-xs no-print">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Laptop className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-zinc-900 leading-none">
                LaptopMatch
              </span>
              <span className="block text-[11px] text-zinc-500 mt-0.5">
                SPK AHP–SAW Mahasiswa
              </span>
            </div>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
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
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/admin"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Panel Admin
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
            <nav aria-label="Navigasi mobile" className="flex flex-col gap-1">
              {PUBLIC_NAV.map((item) => {
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
                      "flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium",
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                Panel Administrator
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-200 bg-zinc-50 no-print">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
                  <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-zinc-900">LaptopMatch</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga
                Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP)
                dan Simple Additive Weighting (SAW).
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Identitas Akademik
              </p>
              <p className="text-xs text-zinc-700 font-medium">
                Kelompok 13 — Final Project Sistem Pendukung Keputusan
              </p>
              <p className="text-xs text-zinc-600">
                Wahyu Setiawan (23082010142) · Lingga Dwi Al Farizi (23082010146) · M. Ahnaf
                Zaki (23082010147)
              </p>
              <p className="text-xs text-zinc-500">
                Program Studi Sistem Informasi, Fakultas Ilmu Komputer, Universitas
                Pembangunan Nasional &ldquo;Veteran&rdquo; Jawa Timur (2026)
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Catatan Transparansi
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                LaptopMatch bukan platform e-commerce, bukan marketplace, dan tidak
                menghasilkan rekomendasi menggunakan machine learning atau AI generatif. Data
                merupakan snapshot penelitian bersumber, bukan harga maupun stok real-time.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
