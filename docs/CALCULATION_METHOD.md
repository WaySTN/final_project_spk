# Metodologi Perhitungan Matematis — AHP & SAW (LaptopMatch)

Dokumen ini menjelaskan implementasi deterministik metode **Analytical Hierarchy Process (AHP)** dan **Simple Additive Weighting (SAW)** pada `src/lib/decision/`.

## 1. Enam Kriteria Penelitian

| Kode | Kriteria | Satuan | Atribut |
|---|---|---|---|
| C1 | Harga laptop | Rupiah (IDR) | Cost |
| C2 | Performa prosesor | PassMark CPU Mark | Benefit |
| C3 | Kapasitas RAM | GB | Benefit |
| C4 | Kapasitas SSD | GB | Benefit |
| C5 | Berat laptop | kg | Cost |
| C6 | Daya tahan baterai | jam (video lokal 1080p @ 150 nit) | Benefit |

## 2. Tahapan AHP Individual

1. **Parsing 15 pasangan perbandingan:** Token sebelum karakter `|` divalidasi ketat terhadap allowlist `{9, 7, 5, 3, 1, 1/3, 1/5, 1/7, 1/9}` dan dipetakan langsung ke nilai pecahan numerik presisi penuh (tanpa `eval` dan tanpa `parseInt`).
2. **Matriks resiprokal positif 6×6 ($A$):**
   - Diagonal utama $a_{ii} = 1$.
   - Segitiga atas $a_{ij}$ diisi sesuai urutan 15 pasangan (`C1:C2` hingga `C5:C6`).
   - Segitiga bawah $a_{ji} = 1 / a_{ij}$.
3. **Vektor prioritas eigen utama ($w$):** Dihitung dengan **power iteration** mulai dari vektor seragam $[1/6, \dots, 1/6]$:
   $$y = A w, \quad w^{(k+1)} = \frac{y}{\sum_{i=1}^{6} y_i}$$
   Iterasi berhenti saat $\max_i |w_i^{(k+1)} - w_i^{(k)}| < 10^{-12}$ (batas maksimum 10.000 iterasi).
4. **Uji konsistensi:**
   $$\lambda_{\max} = \frac{1}{n} \sum_{i=1}^{n} \frac{(Aw)_i}{w_i}, \quad CI = \frac{\lambda_{\max} - n}{n - 1}, \quad CR = \frac{CI}{RI}$$
   Untuk $n = 6$, $RI = 1{,}24$. Batas konsistensi individual: $CR \le 0{,}10$ (tanpa pembulatan, toleransi galat floating-point terdokumentasi $10^{-12}$).

## 3. Agregasi Kelompok (AIJ)

Pada skenario utama (`consistent_only`), hanya respons eligible dengan $CR \le 0{,}10$ yang diagregasikan menggunakan rata-rata geometrik (*Aggregation of Individual Judgments*, Forman & Peniwati, 1998):

$$a_{ij}^{(G)} = \exp\left(\frac{1}{m} \sum_{k=1}^{m} \ln a_{ij}^{(k)}\right), \quad a_{ji}^{(G)} = \frac{1}{a_{ij}^{(G)}}$$

Matriks gabungan kemudian dihitung ulang vektor eigen utama dan $CR$ kelompoknya. Publikasi rekomendasi utama diblokir jika $CR_{\text{gabungan}} > 0{,}10$.

## 4. Tahapan SAW

Dengan bobot $w_j$ presisi penuh dari AHP ($\sum w_j = 1$) dan matriks keputusan $X = [x_{ij}]$ untuk himpunan alternatif aktif (harga inklusif Rp9.000.000–Rp11.000.000, seluruh nilai positif):

- **Kriteria Benefit (C2, C3, C4, C6):** $r_{ij} = \frac{x_{ij}}{\max_i x_{ij}}$
- **Kriteria Cost (C1, C5):** $r_{ij} = \frac{\min_i x_{ij}}{x_{ij}}$
- **Kontribusi kriteria:** $c_{ij} = w_j \cdot r_{ij}$
- **Nilai preferensi:** $V_i = \sum_{j=1}^{6} c_{ij}$

Pemeringkatan dilakukan secara *descending* berdasarkan $V_i$ presisi penuh (bukan nilai terbulatkan). Jika $|V_a - V_b| \le 10^{-12}$, digunakan *competition ranking* (rank sama) dengan urutan kode deterministik.

## 5. Skenario Analisis Sensitivitas

1. **S1 (Utama):** 17 respons konsisten ($CR \le 0{,}10$) + 7 alternatif baseline.
2. **S2 (Pembanding bobot):** seluruh 33 respons eligible + 7 alternatif baseline.
3. **S3 (Simulasi risiko stok):** 17 respons konsisten + 5 alternatif tanpa A6 dan A7 (normalisasi $\min/\max$ dihitung ulang pada 5 alternatif).
