"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import {
  AlertBanner,
  Button,
  Input,
  Label,
} from "@/components/ui/primitives";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        error?: { message?: string } | null;
      };

      if (!res.ok) {
        setError(json.error?.message ?? "Email atau kata sandi tidak valid.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server autentikasi. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] lg:grid lg:grid-cols-2">
      {/* Left Airy Nordic Architectural Panel (Desktop — Zero Heavy Black Block) */}
      <aside className="relative hidden flex-col justify-between border-r border-[#e2e8f0] bg-[#f1f5f9] p-12 text-[#1e293b] lg:flex">
        <div className="flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1e3a5f] font-mono text-xs font-bold tracking-tight text-white">
              LM
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-[#1e293b]">
                LaptopMatch
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                SPK AHP–SAW · UPNVJT
              </p>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded border border-[#c7d9ec] bg-[#eff4fa] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#1e3a5f]">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            RLS &amp; Server Guard
          </span>
        </div>

        <div className="max-w-lg space-y-5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#1e3a5f]">
            Ruang Kendali Penelitian Terisolasi
          </p>
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-[#1e293b]">
            Audit responden, komputasi eigenvector, dan publikasi snapshot dalam satu
            rekaman immutable.
          </h2>
          <p className="text-sm leading-relaxed text-[#475569]">
            Seluruh data primer kuesioner mahasiswa dan kendali publikasi diproteksi melalui
            autentikasi Supabase Auth serta kebijakan Row Level Security pada PostgreSQL.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[#cbd5e1] bg-[#e2e8f0]">
          <div className="bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Kriteria
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-[#1e3a5f]">C1–C6 Tetap</p>
          </div>
          <div className="bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Algoritma
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-[#1e3a5f]">AHP + SAW</p>
          </div>
          <div className="bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Tim Peneliti
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-[#1e3a5f]">Kelompok 13</p>
          </div>
        </div>
      </aside>

      {/* Right Authentication Form Canvas */}
      <div className="flex min-h-screen flex-col justify-between bg-white px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#475569] transition-colors hover:text-[#1e3a5f]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke beranda publik
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#64748b] lg:hidden">
            LM · Admin
          </span>
        </div>

        <div className="mx-auto my-8 w-full max-w-[400px] space-y-6">
          {/* Mobile light brand header */}
          <div className="flex items-center gap-3 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-4 lg:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1e3a5f] font-mono text-xs font-bold text-white">
              LM
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[-0.015em] text-[#1e293b]">
                LaptopMatch
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Panel Administrator &amp; Peneliti
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="editorial-kicker text-[#1e3a5f]">Autentikasi Peneliti</p>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
              Masuk sebagai Administrator
            </h1>
            <p className="text-sm leading-relaxed text-[#64748b]">
              Akses terbatas untuk pengelolaan data responden, alternatif laptop, komputasi
              AHP–SAW, dan publikasi snapshot penelitian.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <AlertBanner tone="error" title="Autentikasi gagal">
                {error}
              </AlertBanner>
            )}

            <div>
              <Label htmlFor="admin-email">Email administrator</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="peneliti@upnjatim.ac.id"
              />
            </div>

            <div>
              <Label htmlFor="admin-password">Kata sandi</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              <Lock className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </Button>
          </form>

          <div className="border-t border-[#e2e8f0] pt-4 text-xs leading-relaxed text-[#64748b]">
            Pendaftaran akun publik dinonaktifkan demi integritas data penelitian. Akun
            administrator hanya dibuat oleh operator proyek melalui Supabase Auth dan tabel{" "}
            <code className="rounded bg-[#f1f5f9] px-1 py-0.5 font-mono text-[11px] text-[#1e3a5f]">
              profiles
            </code>
            .
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f0] pt-4 font-mono text-[11px] text-[#64748b]">
          <span>Kelompok 13 · Sistem Informasi</span>
          <span>UPN &ldquo;Veteran&rdquo; Jawa Timur</span>
        </div>
      </div>
    </div>
  );
}
