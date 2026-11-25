import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400">
        404 — Halaman Tidak Ditemukan
      </p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">
        Data atau halaman yang diminta tidak tersedia
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        Periksa kembali alamat URL atau pastikan snapshot rekomendasi telah dipublikasikan
        oleh administrator.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Ke Beranda
        </Link>
        <Link
          href="/rekomendasi"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Lihat Rekomendasi
        </Link>
      </div>
    </div>
  );
}
