import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LaptopMatch — SPK Pemilihan Laptop Mahasiswa (AHP–SAW)",
    template: "%s | LaptopMatch",
  },
  description:
    "Sistem Pendukung Keputusan pemilihan laptop bagi mahasiswa pada kisaran harga Rp9.000.000–Rp11.000.000 menggunakan metode Analytical Hierarchy Process (AHP) dan Simple Additive Weighting (SAW). Kelompok 13, Sistem Informasi, UPN Veteran Jawa Timur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
