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
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-4 text-center">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-red-700">
        Kesalahan Sistem
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#111113]">
        Halaman tidak dapat dimuat sementara waktu
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#52524e]">
        Terjadi kendala saat memproses data. Silakan muat ulang halaman atau hubungi
        administrator penelitian apabila masalah berlanjut.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Coba Muat Ulang</Button>
      </div>
    </div>
  );
}
