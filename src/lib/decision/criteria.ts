import type {
  AcademicReference,
  CriterionCode,
  CriterionDefinition,
} from "./types";

export const ALGORITHM_VERSION = "ahp-saw-v1.0.0";
export const CRITERIA_COUNT = 6;
export const AHP_RI_6 = 1.24;
export const AHP_CR_THRESHOLD = 0.1;
export const AHP_CR_FLOAT_EPSILON = 1e-12;
export const AHP_EIGEN_TOLERANCE = 1e-12;
export const AHP_EIGEN_MAX_ITERATIONS = 10_000;
export const SAW_WEIGHT_SUM_TOLERANCE = 1e-10;
export const SAW_TIE_TOLERANCE = 1e-12;
export const RESEARCH_TARGET_CONSISTENT_COUNT = 12;
export const PRICE_MIN_IDR = 9_000_000;
export const PRICE_MAX_IDR = 11_000_000;
export const RESEARCH_AUDIT_DATE = "2026-11-25";

export const CRITERION_CODES: readonly CriterionCode[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
] as const;

export const ACADEMIC_REFERENCES: readonly AcademicReference[] = [
  {
    id: "saaty-2008",
    authors: "Saaty, T. L.",
    year: 2008,
    title: "Decision making with the analytic hierarchy process",
    journal: "International Journal of Services Sciences, 1(1), 83–98",
    doi: "https://doi.org/10.1504/IJSSCI.2008.017590",
    usageContext:
      "Dasar hierarki kriteria, matriks perbandingan berpasangan, skala intensitas, vektor prioritas eigen, serta uji konsistensi (CI dan CR).",
  },
  {
    id: "forman-peniwati-1998",
    authors: "Forman, E., & Peniwati, K.",
    year: 1998,
    title:
      "Aggregating individual judgments and priorities with the analytic hierarchy process",
    journal: "European Journal of Operational Research, 108(1), 165–169",
    doi: "https://doi.org/10.1016/S0377-2217(97)00244-0",
    usageContext:
      "Dasar metode Aggregation of Individual Judgments (AIJ) dengan rata-rata geometrik yang menjaga sifat resiprokal matriks gabungan.",
  },
  {
    id: "schmidt-2015",
    authors:
      "Schmidt, K., Aumann, I., Hollander, I., Damm, K., & von der Schulenburg, J. M. G.",
    year: 2015,
    title:
      "Applying the Analytic Hierarchy Process in healthcare research: A systematic literature review and evaluation of reporting",
    journal: "BMC Medical Informatics and Decision Making, 15, 112",
    doi: "https://doi.org/10.1186/s12911-015-0234-7",
    usageContext:
      "Konteks variasi ukuran panel AHP; menegaskan ketiadaan aturan ukuran sampel universal serta keterbatasan representativitas.",
  },
  {
    id: "pascoe-2024",
    authors: "Pascoe, S., Farmery, A., Nichols, R., Lothian, S., & Azmi, K.",
    year: 2024,
    title:
      "A modified analytic hierarchy process suitable for online survey preference elicitation",
    journal: "Algorithms, 17(6), 245",
    doi: "https://doi.org/10.3390/a17060245",
    usageContext:
      "Konteks pengumpulan preferensi AHP melalui kuesioner daring dan tantangan inkonsistensi; penelitian ini tetap memakai AHP standar, bukan algoritma modifikasinya.",
  },
  {
    id: "bethlehem-2010",
    authors: "Bethlehem, J.",
    year: 2010,
    title: "Selection bias in web surveys",
    journal: "International Statistical Review, 78(2), 161–188",
    doi: "https://doi.org/10.1111/j.1751-5823.2010.00112.x",
    usageContext:
      "Dasar pengakuan keterbatasan bias seleksi pada survei daring berbasis kemudahan akses.",
  },
  {
    id: "mukharir-wardoyo-2021",
    authors: "Mukharir, M., & Wardoyo, R.",
    year: 2021,
    title:
      "Decision support system for laptop selection using AHP method and profile matching",
    journal: "IJCCS, 15(3), 307–316",
    doi: "https://doi.org/10.22146/ijccs.67811",
    usageContext:
      "Referensi pemisahan karakteristik teknis laptop dengan preferensi pemilih dalam pemilihan laptop.",
  },
  {
    id: "ardhana-indriyanti-2025",
    authors: "Ardhana, M. R. D., & Indriyanti, A. D.",
    year: 2025,
    title:
      "Web-based decision support system for best laptop selection using MABAC method",
    journal:
      "Journal of Emerging Information Systems and Business Intelligence, 5(4), 314–331",
    doi: "https://doi.org/10.26740/jeisbi.v5i4.64267",
    usageContext:
      "Rujukan utama penetapan enam kriteria laptop: harga, prosesor, RAM, penyimpanan SSD, berat, dan baterai.",
  },
  {
    id: "ardiansyah-2025",
    authors: "Ardiansyah, M., Adriansyah, M., & Wijaya, T. M. P.",
    year: 2025,
    title:
      "Sistem penunjang keputusan pemilihan laptop terbaik menggunakan metode SAW (Simple Additive Weighting)",
    journal: "Journal of Technology and System Information, 2(1), 1–13",
    doi: "https://doi.org/10.47134/jtsi.v2i1.3398",
    usageContext:
      "Rujukan penerapan metode Simple Additive Weighting (SAW) pada pemeringkatan alternatif laptop.",
  },
  {
    id: "tofallis-2014",
    authors: "Tofallis, C.",
    year: 2014,
    title:
      "Add or multiply? A tutorial on ranking and choosing with multiple criteria",
    journal: "INFORMS Transactions on Education, 14(3), 109–119",
    doi: "https://doi.org/10.1287/ited.2013.0124",
    usageContext:
      "Landasan transparansi aturan normalisasi SAW dan peringatan bahwa perubahan himpunan alternatif mengubah basis normalisasi.",
  },
] as const;

export const CRITERIA: readonly CriterionDefinition[] = [
  {
    code: "C1",
    ordinal: 1,
    name: "Harga laptop",
    shortName: "Harga",
    unit: "Rupiah (IDR)",
    attribute: "cost",
    definition:
      "Harga penawaran ritel laptop dalam rentang anggaran penelitian Rp9.000.000–Rp11.000.000 inklusif. Semakin rendah harga, semakin menguntungkan.",
    measurementSource: "Penawaran ritel terpilih pada snapshot audit 25 November 2026 (bukan harga real-time dan tidak termasuk ongkos kirim).",
    notes: "Satu penawaran dicatat per konfigurasi SKU; bukan klaim harga termurah seluruh pasar.",
    referenceIds: ["ardhana-indriyanti-2025", "mukharir-wardoyo-2021", "ardiansyah-2025"],
  },
  {
    code: "C2",
    ordinal: 2,
    name: "Performa prosesor",
    shortName: "Prosesor",
    unit: "PassMark CPU Mark",
    attribute: "benefit",
    definition:
      "Skor benchmark sintetis PassMark CPU Mark untuk mengukur kemampuan komputasi prosesor secara objektif. Semakin tinggi skor, semakin baik.",
    measurementSource: "PassMark Software (cpubenchmark.net) pada tanggal audit 25 November 2026.",
    notes: "Benchmark standar lintas prosesor Intel dan AMD.",
    referenceIds: ["ardhana-indriyanti-2025", "mukharir-wardoyo-2021"],
  },
  {
    code: "C3",
    ordinal: 3,
    name: "Kapasitas RAM",
    shortName: "RAM",
    unit: "GB",
    attribute: "benefit",
    definition:
      "Kapasitas memori RAM terpasang bawaan pabrikan pada konfigurasi SKU yang ditawarkan. Semakin besar kapasitas RAM, semakin baik untuk multitasking dan pemrograman.",
    measurementSource: "Spesifikasi resmi Lenovo PSREF / dokumentasi penjual sesuai kode SKU.",
    notes: "Menggunakan RAM bawaan terpasang, bukan kapasitas maksimum upgrade.",
    referenceIds: ["ardhana-indriyanti-2025", "ardiansyah-2025"],
  },
  {
    code: "C4",
    ordinal: 4,
    name: "Kapasitas SSD",
    shortName: "SSD",
    unit: "GB",
    attribute: "benefit",
    definition:
      "Kapasitas penyimpanan Solid State Drive (SSD) terpasang bawaan pada konfigurasi SKU. Semakin besar penyimpanan, semakin baik.",
    measurementSource: "Spesifikasi resmi Lenovo PSREF / dokumentasi penjual sesuai kode SKU.",
    notes: "Pada 7 alternatif baseline seluruhnya berkapasitas 512 GB sehingga menghasilkan nilai normalisasi 1,000000 dan kontribusi seragam; kriteria tetap dipertahankan agar konsisten dengan instrumen AHP.",
    referenceIds: ["ardhana-indriyanti-2025", "ardiansyah-2025"],
  },
  {
    code: "C5",
    ordinal: 5,
    name: "Berat laptop",
    shortName: "Berat",
    unit: "kg",
    attribute: "cost",
    definition:
      "Bobot fisik laptop sesuai publikasi resmi pabrikan untuk mendukung mobilitas mahasiswa di kampus. Semakin ringan, semakin menguntungkan.",
    measurementSource: "Dokumentasi Lenovo PSREF (sebagian merupakan berat mulai / starting weight).",
    notes: "Bukan hasil penimbangan aktual unit fisik oleh peneliti.",
    referenceIds: ["ardhana-indriyanti-2025"],
  },
  {
    code: "C6",
    ordinal: 6,
    name: "Daya tahan baterai",
    shortName: "Baterai",
    unit: "jam",
    attribute: "benefit",
    definition:
      "Estimasi maksimum durasi pemutaran video lokal 1080p pada kecerahan layar 150 nit berdasarkan dokumentasi resmi Lenovo PSREF. Semakin lama durasi, semakin baik.",
    measurementSource: "Lenovo PSREF tingkat seri dan kapasitas baterai (Wh disimpan sebagai metadata tambahan, bukan nilai penilaian).",
    notes: "Bukan kapasitas Wh, bukan MobileMark, dan bukan klaim durasi pemakaian kuliah aktual sehari-hari.",
    referenceIds: ["ardhana-indriyanti-2025"],
  },
] as const;

export const CRITERIA_BY_CODE: Readonly<Record<CriterionCode, CriterionDefinition>> =
  CRITERIA.reduce(
    (acc, criterion) => {
      acc[criterion.code] = criterion;
      return acc;
    },
    {} as Record<CriterionCode, CriterionDefinition>,
  );
