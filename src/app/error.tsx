"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LaptopMatch UI Error]", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-red-700">
        Terjadi Kesalahan Aplikasi
      </p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">
        Halaman tidak dapat dimuat sementara waktu
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        Terjadi kendala saat memproses data. Silakan muat ulang halaman atau hubungi
        administrator penelitian apabila masalah berlanjut.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Coba Muat Ulang</Button>
      </div>
    </div>
  );
}
