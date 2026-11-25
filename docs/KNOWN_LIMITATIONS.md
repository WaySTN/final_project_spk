# Keterbatasan Sistem dan Penelitian — LaptopMatch

Dokumen ini mencatat secara transparan batasan penelitian akademik dan batasan teknis sistem agar tidak terjadi klaim berlebihan (*overclaiming*) saat penggunaan maupun presentasi kepada dosen.

## 1. Keterbatasan Penelitian (Data & Metodologi)

1. **Snapshot data per 25 November 2026:** Harga dan informasi ketersediaan berasal dari pencatatan penawaran ritel pada tanggal audit 25 November 2026 (sebagian berasal dari arsip terindeks lebih lama), bukan harga real-time dan bukan harga termurah seluruh pasar.
2. **Pembatasan merek (7 konfigurasi Lenovo):** Seluruh alternatif baseline berasal dari merek Lenovo karena ketersediaan protokol pengukuran daya tahan baterai yang seragam (Lenovo PSREF — estimasi maksimum pemutaran video lokal 1080p pada 150 nit). Hasil tidak merepresentasikan seluruh merek laptop di pasar Indonesia.
3. **Sifat estimasi C5 (Berat) dan C6 (Baterai):**
   - `C5` sebagian merupakan berat mulai (*starting weight*) publikasi pabrikan, bukan hasil penimbangan fisik unit.
   - `C6` merupakan klaim laboratorium tingkat seri/kapasitas baterai untuk pemutaran video lokal 1080p 150 nit, bukan pengujian langsung unit SKU maupun durasi pemakaian kuliah aktual.
4. **Kriteria C4 (SSD) bernilai seragam:** Ketujuh alternatif memiliki SSD 512 GB, sehingga nilai normalisasi C4 = `1,000000` untuk seluruh kandidat dan memberikan kontribusi konstan sebesar bobot C4. Kriteria tetap dipertahankan demi konsistensi instrumen kuesioner.
5. **Kualitas dan independensi data primer:**
   - Perekrutan responden menggunakan *non-probability sampling* (kriteria mahasiswa aktif & kemudahan akses), sehingga mencerminkan preferensi panel, bukan sampel representatif seluruh populasi mahasiswa.
   - Dari 33 respons, 17 lolos `CR ≤ 0,10` dan 16 tidak lolos.
   - Sepuluh respons tambahan (`R23`–`R32`) memiliki `CR ≈ 0` dan cap waktu yang sebagian tidak berurutan terhadap ekspor awal. CR rendah hanya mengukur konsistensi matematis, bukan bukti keaslian/independensi responden. Konfirmasi manual oleh kelompok tetap diperlukan.
   - Dua respons (`R09` dan `R32`) memilih nilai `1` (sama penting) untuk seluruh 15 pasangan; keduanya sah secara matematis dan tetap dipertahankan.
6. **Sensitivitas peringkat sangat tinggi:**
   - Pada skenario utama (7 alternatif, 17 konsisten), selisih A7 (`0,953349`) dan A6 (`0,953327`) hanya `~0,000022`.
   - Pada skenario seluruh 33 respons, peringkat pertama berubah menjadi A6 (`0,963921`).
   - Pada skenario 5 alternatif (tanpa A6 dan A7), peringkat pertama berubah menjadi A2 (`0,979739`).
7. **Status produk dan stok belum terkonfirmasi langsung:** A4, A6, dan A7 berasal dari seri berstatus *withdrawn* oleh Lenovo; A1 menggunakan kode SKU pendek `20ID` dari penjual; belum ada konfirmasi stok langsung dari penjual oleh kelompok.

## 2. Keterbatasan Ruang Lingkup Perangkat Lunak

- Tidak melakukan scraping harga/stok secara otomatis maupun real-time (juga mencegah SSRF).
- Tidak menyediakan transaksi pembelian, keranjang belanja, peramalan harga, atau rekomendasi berbasis AI/ML.
- Tidak menyediakan akun login mahasiswa maupun pengumpulan survei langsung di aplikasi publik.
- Publikasi baseline menggunakan status **`provisional`** sampai peneliti menyelesaikan verifikasi manusia untuk memenuhi seluruh gerbang (*gate*) publikasi `final`.
