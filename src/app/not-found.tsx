import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center bg-white px-4 text-center">
      <p className="editorial-kicker">Error 404 · Halaman Tidak Ditemukan</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#111113] sm:text-3xl">
        Data atau halaman yang diminta tidak tersedia
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#52524e]">
        Periksa kembali alamat URL atau pastikan snapshot rekomendasi telah dipublikasikan
        oleh administrator penelitian.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg bg-[#111113] px-4 text-sm font-medium text-white hover:bg-[#27272a]"
        >
          Kembali ke Beranda
        </Link>
        <Link
          href="/rekomendasi"
          className="inline-flex h-10 items-center rounded-lg border border-[#d0d0c8] bg-white px-4 text-sm font-medium text-[#111113] hover:bg-[#f7f7f5]"
        >
          Lihat Rekomendasi
        </Link>
      </div>
    </div>
  );
}
