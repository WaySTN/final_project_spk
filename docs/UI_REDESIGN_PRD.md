# PRD Redesign UI/UX — LaptopMatch (SPK AHP–SAW)
## Transformasi dari Template Generik Menuju "Swiss Analytical Editorial"

**Versi:** 2.0 (UI/UX Redesign) | **Target:** Seluruh 16 Halaman (7 Publik + 9 Admin)  
**Prinsip Utama:** Minimalis, Elegan, Berkarakter Editorial & Presisi Analitik — **0% AI Slop**, **100% Responsif Mobile (360px+)**, **0% Perubahan Logika/Integritas Penelitian**.

---

## 1. Audit Visual & Diagnosa Masalah Desain Saat Ini

Berdasarkan evaluasi langsung terhadap implementasi saat ini (termasuk screenshot Beranda), berikut 7 akar penyebab tampilan terasa membosankan dan generik (*AI slop*):

| # | Gejala Visual Saat Ini | Mengapa Terasa Generik ("AI Slop") | Solusi Redesign |
|---|---|---|---|
| 1 | **Tumpukan pill badge di atas headline** (`[Anggaran Tetap]` + `[AHP + SAW]`) | Pola klise paling umum pada generator landing page AI. | Ganti dengan **Editorial Metadata Rail** tipis bertipografi monospace (`SNAPSHOT AUDIT · 25 NOV 2026 · RP9–11 JUTA`) + garis rambut (*hairline*) horizontal. |
| 2 | **Hero rata kiri dengan ruang kosong mati di sisi kanan** | Tidak ada *focal point* data di *above the fold*; pengunjung harus scroll dulu untuk melihat nilai utama aplikasi. | **Asymmetric 12-Column Split Hero**: kiri (7 kol) headline editorial & 2 aksi tegas; kanan (5 kol) **Live Dossier Card** (permukaan obsidian gelap `#111113`) yang langsung menampilkan Peringkat `#01 A7` vs `#02 A6`, visualisasi margin tipis `Δ 0,000022`, dan *micro-bars* 6 bobot AHP secara real-time dari snapshot! |
| 3 | **Empat kartu KPI identik (`rounded-xl` + border tipis)** | Pola "4 rounded boxes in a row" yang monoton tanpa hierarki maupun ritme grid. | **Full-Width Architectural Hairline Ledger** (`border-y` + `divide-x`, tanpa sudut bulat luar) dengan angka display besar (`36–44px`), indeks mono (`01`–`04`), dan ruang bernapas lebar. |
| 4 | **Tipografi fallback ke sistem (`Segoe UI`)** | Tidak adanya karakter huruf membuat seluruh halaman terasa seperti form HTML standar. | Bundel font lokal **`Geist` + `Geist Mono`** (melalui paket `geist` lokal — **tanpa dependensi jaringan eksternal saat build**, sesuai PRD §10) dengan tracking negatif ketat pada display heading (`-0.035em`) dan monospace untuk seluruh angka, SKU, kode C1–C6, CR, dan matriks. |
| 5 | **Permukaan seragam putih + kotak-dalam-kotak (*card soup*)** | Setiap seksi dibungkus `Card` yang sama sehingga mata tidak mendapat kontras ritme vertikal. | **Ritme Permukaan 3-Nada Monochrome**: Putih bersih (`#FFFFFF`), Kertas Arsitektural hangat (`#F7F7F5`), dan **1 Pita Obsidian (`#111113`)** untuk seksi alur matematis AHP–SAW agar kontras tetap elegan tanpa keluar dari palet monochrome. |
| 6 | **Navbar pill hitam berat (`[Beranda]`) & tombol berderet 3 sejajar** | Mengganggu keseimbangan visual dan terasa seperti starter kit Tailwind. | Navbar arsitektural minimalis dengan **garis bawah presisi `2px`** pada rute aktif, pemisah halus, dan CTA Hero cukup 1 tombol utama + 1 tautan tekstual bergaya editorial. |
| 7 | **Tabel lebar 940px di mobile & modal `<div>` mentah di Admin** | Di layar 360px, pengguna harus menggeser tabel jauh ke samping hanya untuk membaca nama & skor laptop; modal admin terasa kaku. | **Dual-Layout Adaptif**: mobile (`< 768px`) menampilkan **Spec Card terstruktur** (Rank, Skor, Harga, grid 2×3 spek, tap target ≥ 44px); desktop (`≥ 768px`) menampilkan tabel analitik presisi dengan **inline visual score bar**. Di Admin, inspeksi responden R01–R33 & form CRUD memakai **Right Slide-Over Drawer** yang rapi. |

---

## 2. Arah Desain: *Swiss Analytical Editorial*

Terinspirasi dari presisi desain **Dieter Rams / Braun**, **Linear**, **Stripe Press**, dan **lembar spesifikasi perangkat keras profesional**:

### 2.1 Sistem Warna Monochrome + Warm Paper
Tetap mematuhi penuh kontrak desain `AGENTS.md` (monochrome ketat, warna semantik hanya untuk status validasi, tanpa gradien dekoratif, tanpa glassmorphism berlebihan, tanpa emoji):

| Token | Hex | Penggunaan |
|---|---|---|
| `--bg-canvas` | `#FFFFFF` | Latar utama, ruang baca luas |
| `--bg-paper` | `#F7F7F5` | Latar seksi bergantian / panel sekunder (lebih hangat & editorial dibanding `#FAFAFA`) |
| `--bg-obsidian` | `#111113` | Panel dossier Hero, pita alur AHP–SAW, panel identitas halaman Login Admin |
| `--ink-primary` | `#111113` | Judul utama, angka metrik, tombol primer |
| `--ink-secondary` | `#52524E` | Paragraf baca & keterangan |
| `--ink-muted` | `#787872` | Label mikro, metadata, indeks kolom |
| `--hairline` | `#E5E5E0` | Garis pemisah struktural `1px` |
| `--hairline-strong` | `#D0D0C8` | Border input, tabel header, fokus halus |
| Semantik Terbatas | Emerald `#166534` / Amber `#92400E` / Red `#991B1B` | **Hanya** untuk status validasi (CR lolos/gagal, provisional/final, withdrawn/stok, error form) |

### 2.2 Sistem Tipografi (100% Lokal & Offline-Safe)
- **Display & UI (`Geist Sans` lokal):**
  - Hero H1: `clamp(2.25rem, 4.5vw, 3.5rem)`, `font-weight: 600`, `leading-[1.06]`, `tracking-[-0.035em]`.
  - Section H2: `1.75rem–2.25rem`, `font-weight: 600`, `tracking-[-0.025em]`.
  - Body: `0.9375rem–1rem`, `leading-[1.65]`, max reading width `65ch`.
- **Technical & Data (`Geist Mono` lokal):**
  - Eyebrow / Kicker: `11px`, `uppercase`, `tracking-[0.14em]`.
  - Semua nilai numerik (`tabular-nums`): harga `id-ID`, skor SAW 6 desimal, CR 6–8 desimal, kode `A1`–`A7`, `C1`–`C6`, `R01`–`R33`, dan sel matriks 6×6.

### 2.3 Geometri & Interaksi Halus (Purposeful Motion)
- Radius terukur & konsisten: `6px` (badge/button kecil), `8px` (input/button/card analitik), `12px` (panel utama), `0px` (ledger full-width bergaris rambut).
- Transisi halus `150–200ms ease-out` pada hover baris tabel, slide-over drawer, dan bar skor inline — tanpa animasi bouncy/dekoratif.

---

## 3. Blueprint Redesign per Halaman (Semua 16 Rute)

### 3.1 Website Publik (7 Halaman)

1. **Global Public Chrome (`PublicShell`)**
   - Header tipis `64px` dengan border rambut bawah, logo monoline minimalis + penanda versi riset, navigasi teks dengan indikator garis bawah `2px` pada halaman aktif, serta tombol teks halus `Panel Admin ↗`.
   - Mobile (`< md`): drawer penuh dari atas/kanan dengan tap target `48px`, pemisah jelas, dan ringkasan identitas riset di bawah.
   - Footer arsitektural 3 kolom dengan garis rambut atas, tipografi editorial, dan pernyataan non-komersial yang rapi.

2. **Beranda (`/`) — Transformasi Paling Signifikan**
   - **Seksi 1 — Asymmetric Editorial Hero (12 kolom):**
     - Kiri (7 kol): Kicker mono (`PENELITIAN SPK KELOMPOK 13 · RP9–11 JUTA`), H1 tegas berkarakter editorial, 1 paragraf ringkas bernilai tinggi, 2 aksi bersih (`Lihat Rekomendasi →` solid + `Pelajari Metodologi` tautan bergaris bawah).
     - Kanan (5 kol): **Obsidian Snapshot Dossier Panel (`#111113`)** — menampilkan langsung data hidup dari Supabase:
       - Header status (`PROVISIONAL SNAPSHOT` + tanggal audit)
       - Head-to-head micro-podium `#01 A7 (0,953349)` vs `#02 A6 (0,953327)` + indikator visual margin `Δ 0,000022`
       - Ringkasan 6 bobot AHP dalam mini horizontal bar terurut dari terbesar (`C1 Harga 21,32%` s/d `C5 Berat 11,33%`)
       - Tautan langsung `Inspeksi A7 →`
       *(Jika belum ada snapshot publik, menampilkan panel status kosong jujur yang tetap elegan tanpa angka statis).*
   - **Seksi 2 — Architectural Metric Ledger (Full-Width 4 Kolom):**
     - Strip penuh tanpa kotak bulat (`border-y divide-x`) berisi `01 Alternatif`, `02 Kriteria`, `03 Panel AHP`, `04 CR Gabungan`.
   - **Seksi 3 — Top-3 Podium Editorial (Latar `#F7F7F5`):**
     - Banner status publikasi yang ramping dan jelas.
     - Kartu podium dengan hierarki kuat: **#1 mendapat aksen border atas `2px solid #111113`** dan bar skor SAW visual, metrik 2×2 dalam monospace rapi, dan tautan `Detail & Sumber →`.
   - **Seksi 4 — Bobot AHP (Asymmetric Split 5/7):**
     - Kiri: Tabel ringkas C1–C6 dengan bar proporsional inline; Kanan: Grafik Recharts monochrome bersih dengan perbandingan S1 (17) vs S2 (33).
   - **Seksi 5 — Alur AHP–SAW pada Pita Obsidian (`#111113`):**
     - 4 langkah bernomor besar (`01`–`04`) dipisahkan garis vertikal halus di atas latar gelap elegan, menciptakan ritme visual berkelas.
   - **Seksi 6 — Catatan Batasan & Tautan Akademik** pada latar putih bersih.

3. **Rekomendasi (`/rekomendasi`)**
   - Header halaman editorial + strip info skenario & tanggal audit.
   - **Filter Bar Terintegrasi (`bg-[#F7F7F5]` sticky-friendly)** dengan badge `Filter tampilan, bukan perhitungan ulang` yang menonjol secara elegan (pencarian + batas harga + segmen tombol RAM `Semua / 8 GB / 16 GB`).
   - **Desktop (`md+`):** Tabel pemeringkatan berpresisi tinggi dengan **inline progress bar skor SAW** di bawah angka 6 desimal, tipografi SKU/penjual terstruktur, dan hover halus.
   - **Mobile (`< md`):** **Ranked Spec Cards** — setiap laptop tampil sebagai kartu vertikal bersih (Rank `#1` + Kode + Skor SAW + bar skor di bagian atas, Harga besar, grid 2×2 spesifikasi, badge stok/bukti, tombol full-width `Lihat Detail →` setinggi `44px`) tanpa scroll samping!
   - Visualisasi stacked bar dekomposisi kontribusi SAW di bawah tabel.

4. **Katalog (`/laptop`)**
   - Filter bar minimalis konsisten dengan `/rekomendasi`.
   - Grid 3 kolom (desktop) / 2 kolom (tablet) / 1 kolom (mobile) bertema **Hardware Spec Sheet**: header mono SKU + nomor peringkat, garis rambut pemisah, harga + skor SAW, matriks mini 6 kriteria bergaris halus, dan footer kartu status stok + tombol detail.

5. **Detail Laptop (`/laptop/[code]`)**
   - Breadcrumb bersih + tombol `Bandingkan` & `Cetak`.
   - **Hero Spesifikasi Produk (Split 8/4):** Kiri identitas model, SKU, prosesor, penjual, dan status bukti; Kanan **Scorecard Obsidian/Light** menampilkan Harga Snapshot & Skor Preferensi SAW besar dengan bar persentase terhadap maksimum `1,000000`.
   - **Tabel Dekomposisi SAW** (desktop tabel presisi; mobile kartu per kriteria `C1`–`C6` dengan mini bar normalisasi `r_ij` dan kontribusi `w_j·r_ij`).
   - **4 Kartu Sumber Audit** (grid 2×2) bergaya dossier referensi dengan ikon jenis sumber, level bukti (`sku`/`series`/`listing`), catatan, dan tautan eksternal aman.

6. **Bandingkan (`/bandingkan`)**
   - Selector chip bergaya toggle-pill arsitektural (maks 3 laptop) + tombol `Cetak`.
   - Tabel perbandingan dengan **indikator pemenang per baris** (menyorot nilai terbaik di antara kandidat yang dibandingkan, mis. harga termurah / CPU Mark tertinggi, tanpa mengubah ranking resmi!).
   - Mobile: sticky kolom label kiri + indikator geser horizontal yang jelas.

7. **Metodologi (`/metodologi`) & Tentang (`/tentang`)**
   - **Metodologi:** Layout **2-Kolom dengan Sticky Table of Contents (`Daftar Isi`)** di sisi kiri (desktop) / dropdown lompat bagian (mobile) sehingga halaman panjang terasa seperti publikasi ilmiah **Stripe Press / Distill.pub** — mudah dibaca dosen saat presentasi!
   - Seluruh matriks 6×6 AIJ, X, R, dan tabel sensitivitas memiliki sticky first column + petunjuk geser horizontal di mobile.
   - **Tentang:** Layout editorial terstruktur dengan daftar anggota Kelompok 13 bergaya indeks akademik dan perbandingan tegas "Ruang Lingkup vs Di Luar Ruang Lingkup".

---

### 3.2 Dashboard Administrator (9 Halaman)

1. **Login Admin (`/admin/login`)**
   - **Desktop Split 50/50:** Panel kiri obsidian (`#111113`) berisi identitas LaptopMatch, ringkasan kontrak matematis (`6 Kriteria · Power Iteration · AIJ · SAW · RLS Aktif`), dan catatan integritas; panel kanan bersih putih untuk form login.
   - **Mobile:** Single-column minimalis dengan header kompak dan form bertarget sentuh `44px`.

2. **Admin Shell (`AdminShell`)**
   - Sidebar kiri `256px` berlatar `#F7F7F5` dengan border rambut kanan; item aktif menggunakan latar putih + border tipis + indikator garis kiri `2px` hitam (jauh lebih ringan dan profesional dibanding blok hitam besar).
   - Sticky top bar kompak menampilkan breadcrumb halaman aktif + tautan cepat `Website Publik ↗`.
   - Mobile drawer responsif dengan tap target `44px`.

3. **Overview (`/admin`)**
   - Hairline KPI strip 4 kolom + alur kerja penelitian 5 langkah dengan status progres visual yang jelas + panel aktivitas audit terbaru.

4. **Kriteria (`/admin/kriteria`)**
   - Tabel read-only dengan inline horizontal bar bobot AHP terbaru & kartu penekanan aturan integritas C6.

5. **Responden (`/admin/responden`)**
   - Dropzone upload yang lebih jelas & terstruktur (langkah 1 Preview → langkah 2 Commit).
   - Tabel audit `R01`–`R33` dilengkapi **mini CR threshold gauge** (visualisasi posisi CR terhadap batas `0,10`), tampilan kartu adaptif di mobile, dan **Right Slide-Over Drawer** untuk inspeksi 15 pasangan & matriks 6×6 individual.

6. **Alternatif (`/admin/alternatif`)**
   - Header versi dataset + tombol aksi (`Gandakan ke Draft` / `Tambah Alternatif`) yang rapi.
   - Daftar alternatif adaptif (tabel desktop + kartu mobile) dan **Right Slide-Over Form Drawer** untuk CRUD & 4 URL sumber.

7. **Perhitungan AHP (`/admin/perhitungan/ahp`) & SAW (`/admin/perhitungan/saw`)**
   - Panel kontrol komputasi yang bersih (1 baris di desktop, bertumpuk rapi di mobile).
   - Metrik utama ($\lambda_{\max}$, CI, RI, CR) pada hairline strip.
   - Tab/seksi yang mudah dipindai untuk Matriks X → Normalisasi R → Kontribusi & Ranking + visualisasi Recharts monochrome.

8. **Riwayat & Publikasi (`/admin/riwayat`) & Laporan (`/admin/laporan`)**
   - Pemisahan visual tegas antara opsi `Provisional` dan checklist gerbang verifikasi manusia `Final`.
   - Kartu/tabel ekspor Excel 7-sheet dengan pratinjau daftar 7 sheet yang terkandung di file `.xlsx`.

---

## 4. Kontrak Non-Regresi & Kualitas (Wajib Dipertahankan 100%)

1. **Zero Backend/Logic Touch:** Tidak mengubah `src/lib/decision/*`, `src/lib/import/*`, `src/lib/export/*`, `src/lib/publication/*`, `src/lib/repositories/*`, `src/app/api/*`, maupun `supabase/migrations/*`.
2. **Keutuhan Selector & Test E2E:** Mempertahankan seluruh `data-testid` (`ranking-row-*`, `ranking-score-*`), ID elemen form (`#rec-ram`, `#survey-file`, `#laptop-file`, `#ahp-mode`, `#saw-scenario`, `#pub-status`), label aksesibel, dan teks kontrak PRD (`Filter tampilan, bukan perhitungan ulang`, banner provisional, dsb.).
   - *Catatan khusus mobile dual-layout pada `/rekomendasi`:* Gunakan satu `data-testid="ranking-row-..."` per alternatif (atau render responsif yang tidak menggandakan testid di DOM) agar Playwright strict mode tetap 100% lulus!
3. **Zero Horizontal Page Overflow di Mobile 360px:** Seluruh 7 rute publik + `/admin/login` + halaman admin utama wajib memenuhi `document.documentElement.scrollWidth <= window.innerWidth + 2`.
4. **Offline-Safe Fonts:** Menggunakan paket lokal `geist` (`geist/font/sans` & `geist/font/mono`), tidak bergantung pada fetch runtime Google Fonts.

---

## 5. Rencana Eksekusi Bertahap (4 Fase)

| Fase | Ruang Lingkup | Berkas Utama |
|---|---|---|
| **Fase A — Design System & Tipografi** | Instal paket `geist` lokal, perbarui `layout.tsx`, `globals.css`, `primitives.tsx`, `matrix-table.tsx`, dan `charts.tsx` (termasuk komponen `SlideOverDrawer` & `ScoreBar`). | `package.json`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/primitives.tsx`, `src/components/decision/*` |
| **Fase B — Redesign Website Publik (7 Halaman)** | Redesign `PublicShell`, `PublicationBanner`, Beranda (Asymmetric Hero + Obsidian Dossier + Hairline Ledger + Obsidian Workflow Band), Rekomendasi (dual desktop/mobile), Katalog, Detail Laptop, Bandingkan, Metodologi (sticky TOC), Tentang, serta loading/404/error. | `src/components/public/*`, `src/app/(public)/**/*`, `src/app/not-found.tsx`, `src/app/error.tsx` |
| **Fase C — Redesign Dashboard Admin (9 Halaman)** | Redesign split Login, `AdminShell` baru, Overview, Kriteria, Responden (CR gauge + slide-over drawer), Alternatif (slide-over form), AHP, SAW, Riwayat, dan Laporan. | `src/components/admin/*`, `src/app/admin/**/*` |
| **Fase D — Verifikasi Menyeluruh & Rilis** | Jalankan `npm run typecheck`, `npm run lint`, `npm run test` (25/25), `npm run build`, `npm run test:e2e` (E01–E12 + 360px mobile overflow), lalu commit terstruktur (dan push jika disetujui untuk auto-deploy Vercel). | Seluruh suite uji |
