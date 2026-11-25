"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Laptop, Lock } from "lucide-react";
import {
  AlertBanner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke beranda publik
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Laptop className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">LaptopMatch</p>
                <p className="text-xs text-zinc-500">Panel Administrator & Peneliti</p>
              </div>
            </div>
            <CardTitle>Masuk sebagai Administrator</CardTitle>
            <CardDescription>
              Akses terbatas untuk pengelolaan data responden, alternatif laptop, komputasi
              AHP–SAW, dan publikasi snapshot penelitian.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

              <Button type="submit" className="w-full" disabled={submitting}>
                <Lock className="h-4 w-4" aria-hidden="true" />
                {submitting ? "Memverifikasi..." : "Masuk ke Dashboard"}
              </Button>
            </form>

            <div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 leading-relaxed">
              Pendaftaran akun publik dinonaktifkan demi integritas data penelitian. Akun
              administrator hanya dibuat oleh operator proyek melalui Supabase Auth dan tabel{" "}
              <code className="font-mono text-zinc-700">profiles</code>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
