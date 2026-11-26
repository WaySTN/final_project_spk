import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const PRIVATE_DIR = path.resolve(process.cwd(), "research", "private");
const ADMIN_EMAIL =
  process.env.LAPTOPMATCH_LOCAL_ADMIN_EMAIL ?? "admin@laptopmatch.local";
const ADMIN_PASSWORD =
  process.env.LAPTOPMATCH_LOCAL_ADMIN_PASSWORD ?? "AdminLaptopMatch2026!";

function getSurveyFilePath(): string {
  const match = fs
    .readdirSync(PRIVATE_DIR)
    .find((f) => f.toUpperCase().includes("DATA RESPON KUESIONER") && f.endsWith(".xlsx"));
  if (!match) {
    throw new Error("Survey XLSX file not found in research/private/");
  }
  return path.join(PRIVATE_DIR, match);
}

function getUasDatasetJsonPath(): string {
  const target = path.join(PRIVATE_DIR, "LaptopMatch_Dataset_33_Regression.json");
  if (!fs.existsSync(target)) {
    throw new Error("LaptopMatch_Dataset_33_Regression.json not found in research/private/");
  }
  return target;
}

test.describe.serial("LaptopMatch UAS 33-Alternative End-to-End Acceptance Suite (E01–E12)", () => {
  test("E01 & E12: anonymous blocked from admin (incl. sensitivity), and public shows honest empty state before publication", async ({
    page,
    request,
  }) => {
    // E01: anonymous admin API requests return 401
    for (const endpoint of [
      "/api/admin/overview",
      "/api/admin/responses",
      "/api/admin/alternatives",
      "/api/admin/ahp/runs",
      "/api/admin/saw/runs",
      "/api/admin/sensitivity",
      "/api/admin/publications",
    ]) {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(401);
      const text = await res.text();
      expect(text).not.toContain("bebas kak manut aja");
    }

    // Visiting /admin unauthenticated redirects to /admin/login
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);

    // E12: Before any publication exists, public home & /rekomendasi show honest empty state
    await page.goto("/");
    await expect(
      page.getByText("Belum ada snapshot rekomendasi yang dipublikasikan"),
    ).toBeVisible();
    await expect(page.getByText("0,834354")).toHaveCount(0);

    await page.goto("/rekomendasi");
    await expect(
      page.getByText("Belum ada snapshot rekomendasi yang dipublikasikan"),
    ).toBeVisible();
  });

  test("E02–E09: full UAS admin workflow (login, bad file rejection, 33-resp XLSX, 33-alt JSON + 9 archived, AHP, SAW, 37-scenario sensitivity, dynamic draft edit, final gate block, provisional publish, 8-sheet XLSX export, logout)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // E02: Wrong password shows generic error
    await page.goto("/admin/login");
    await page.getByLabel("Email administrator").fill(ADMIN_EMAIL);
    await page.getByLabel("Kata sandi").fill("WrongPassword!");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page.getByText("Email atau kata sandi tidak valid.")).toBeVisible();

    // Valid login succeeds
    await page.getByLabel("Kata sandi").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Ringkasan Penelitian LaptopMatch" }),
    ).toBeVisible();

    // Verify Admin Kriteria shows C6 Wh proxy & Complete AHP Scale
    await page.goto("/admin/kriteria");
    await expect(page.getByText("Kapasitas baterai", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Skala Pembobotan AHP Lengkap")).toBeVisible();

    // E04: Upload bad CSV -> validation error, no partial commit
    await page.goto("/admin/responden");
    await page.locator("#survey-file").setInputFiles({
      name: "bad-headers.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("KolomSalah1,KolomSalah2\na,b\n", "utf-8"),
    });
    await page.getByRole("button", { name: "1. Preview & Validasi" }).click();
    await expect(page.getByText("Gagal Validasi")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "2. Simpan Batch Atomik" }),
    ).toBeDisabled();

    // E03: Upload real survey XLSX -> preview 33/33 & 17 consistent -> commit atomically
    const surveyPath = getSurveyFilePath();
    await page.locator("#survey-file").setInputFiles(surveyPath);
    await page.getByRole("button", { name: "1. Preview & Validasi" }).click();
    await expect(page.getByText("Siap Disimpan")).toBeVisible();
    await page.getByRole("button", { name: "2. Simpan Batch Atomik" }).click();
    await expect(page.getByText(/berhasil disimpan secara atomik/i)).toBeVisible();
    await expect(page.getByRole("cell", { name: "R01" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "R33" })).toBeVisible();

    // Re-uploading same survey file detects duplicate SHA-256
    await page.locator("#survey-file").setInputFiles(surveyPath);
    await page.getByRole("button", { name: "1. Preview & Validasi" }).click();
    await expect(page.getByText("Duplikat SHA-256")).toBeVisible();

    // Import real UAS 33-alternative JSON (33 active across 8 brands + 9 archived excluded)
    await page.goto("/admin/alternatif");
    const datasetJsonPath = getUasDatasetJsonPath();
    await page.locator("#laptop-file").setInputFiles(datasetJsonPath);
    await page.getByRole("button", { name: "1. Preview Alternatif" }).click();
    await expect(page.getByText("Lolos Validasi")).toBeVisible();
    await expect(page.getByText(/33\/33 eligible · 8 merek · C6 Wh · 9 arsip dikeluarkan/i)).toBeVisible();
    await page.getByRole("button", { name: "2. Simpan sebagai Draft Baru" }).click();
    await expect(page.getByText(/berhasil diimpor sebagai draft/i)).toBeVisible();
    await expect(page.getByText("Megabook T1 14 16/512")).toBeVisible();
    await expect(page.getByText("Arsip Kandidat Dikeluarkan (9 Kandidat)")).toBeVisible();

    // E05a: Compute AHP S1 (consistent_only -> 17) & AHP S2 (all_eligible -> 33)
    await page.goto("/admin/perhitungan/ahp");
    await page.getByRole("button", { name: "Hitung AHP Sekarang" }).click();
    await expect(page.getByText("0,00127449").first()).toBeVisible();
    await expect(page.getByText("21,32%").first()).toBeVisible();

    await page.locator("#ahp-mode").selectOption("all_eligible");
    await page.getByRole("button", { name: "Hitung AHP Sekarang" }).click();
    await expect(page.getByText("0,01233169").first()).toBeVisible();

    // E05b: Compute SAW UAS primary (33 alts, 17 consistent -> A33 #1 0,834354, A29 #2 0,830314, A11 #33 0,601888)
    await page.goto("/admin/perhitungan/saw");
    await page.locator("#saw-scenario").selectOption("primary_33_consistent");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText("0,834354").first()).toBeVisible();
    await expect(page.getByText("0,830314").first()).toBeVisible();
    await expect(page.getByText("0,601888").first()).toBeVisible();

    // Compute sensitivity_33_all using the 33-response AHP run
    const ahpSelect = page.locator("#saw-ahp");
    const allAhpOpt = await ahpSelect
      .locator("option", { hasText: "Semua" })
      .first()
      .getAttribute("value");
    expect(allAhpOpt).toBeTruthy();
    await ahpSelect.selectOption(allAhpOpt!);
    await page.locator("#saw-scenario").selectOption("sensitivity_33_all");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText(/Perhitungan SAW selesai/i)).toBeVisible();

    // UAS Mandatory: Weight Sensitivity Workbench (/admin/perhitungan/sensitivitas)
    await page.goto("/admin/perhitungan/sensitivitas");
    await expect(page.getByTestId("sensitivity-active-winner")).toContainText("A33");
    await expect(page.getByTestId("sensitivity-weight-sum")).toContainText("1,00000000");

    // Clicking C2 +20% switches winner to A29 while preserving weight sum = 1
    await page.getByTestId("sensitivity-cell-C2-20").click();
    await expect(page.getByTestId("sensitivity-active-winner")).toContainText("A29");
    await expect(page.getByTestId("sensitivity-weight-sum")).toContainText("1,00000000");

    // Run custom server simulation (C6 -20% -> A29) without mutating persisted state
    await page.locator("#sens-crit").selectOption("C6");
    await page.locator("#sens-delta").fill("-20");
    await page.getByTestId("sensitivity-custom-run").click();
    await expect(page.getByTestId("sensitivity-active-winner")).toContainText("A29");
    await expect(page.getByTestId("sensitivity-weight-sum")).toContainText("1,00000000");

    // E06 + Dynamic Recalculation: Dataset v1 is sealed; duplicate to draft v2, edit A29 price -> recompute SAW
    await page.goto("/admin/alternatif");
    await expect(page.getByText("Dataset berstatus Sealed (Immutable)")).toBeVisible();
    await page.getByRole("button", { name: "Gandakan ke Draft" }).click();
    await expect(page.getByText(/Draft baru v2 berhasil dibuat/i)).toBeVisible();

    // Filter to A29 and lower price from 10.6M to 9.25M on draft v2
    await page.getByLabel("Cari alternatif pada dataset aktif").fill("A29");
    await page.getByRole("button", { name: "Ubah" }).first().click();
    await page.locator("#f-price").fill("9250000");
    await page.getByRole("button", { name: "Simpan Alternatif" }).click();
    await expect(page.getByText(/Alternatif A29 berhasil disimpan/i)).toBeVisible();

    // Run SAW on draft v2 -> A29 dynamically becomes #1 while v1 remains A33 #1!
    await page.goto("/admin/perhitungan/saw");
    const dsSelect = page.locator("#saw-dataset");
    const v2Opt = await dsSelect.locator("option", { hasText: "v2" }).first().getAttribute("value");
    expect(v2Opt).toBeTruthy();
    await dsSelect.selectOption(v2Opt!);
    await page.locator("#saw-scenario").selectOption("custom");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText(/Peringkat #1: A29/i)).toBeVisible();

    // E08: Attempt final publish on primary_33_consistent before completing human review -> blocked
    await page.goto("/admin/riwayat");
    await page.locator("#pub-status").selectOption("final");
    await page.getByRole("button", { name: /Publikasikan sebagai FINAL/i }).click();
    await expect(page.getByText("Gerbang Publikasi Memblokir Permintaan")).toBeVisible();
    await expect(
      page.getByText(/Konfirmasi independensi & keaslian respons kuesioner tambahan/i),
    ).toBeVisible();

    // E07: Publish primary_33_consistent as provisional
    await page.locator("#pub-status").selectOption("provisional");
    await page
      .getByRole("button", { name: /Publikasikan sebagai PROVISIONAL/i })
      .click();
    await expect(page.getByText(/berhasil dipublikasikan dengan status PROVISIONAL/i)).toBeVisible();

    // E09: Export 8-sheet XLSX via authenticated session
    await page.goto("/admin/laporan");
    const exportHref = await page
      .getByRole("link", { name: "Unduh XLSX" })
      .first()
      .getAttribute("href");
    expect(exportHref).toMatch(/^\/api\/admin\/export\//);

    const exportRes = await page.request.get(exportHref!);
    expect(exportRes.status()).toBe(200);
    expect(exportRes.headers()["content-type"]).toContain("spreadsheetml");
    const exportBody = await exportRes.body();
    expect(exportBody[0]).toBe(0x50); // 'P'
    expect(exportBody[1]).toBe(0x4b); // 'K'

    // E02 logout: Logout clears session and blocks /admin
    await page.getByRole("button", { name: "Logout" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("E07, E10 & E11: public website renders 33-alt provisional snapshot, brand filter keeps global rank intact, leaks zero raw rows, and passes 360px mobile overflow check", async ({
    page,
    request,
  }) => {
    // Public API check: sanitized payload with 33 alts + 37 sensitivity scenarios, zero private survey leakage
    const pubApi = await request.get("/api/public/recommendation");
    expect(pubApi.status()).toBe(200);
    const pubText = await pubApi.text();
    expect(pubText).toContain("Megabook T1 14");
    expect(pubText).toContain("battery_wh");
    expect(pubText).not.toContain("bebas kak manut aja");
    expect(pubText).not.toContain("Sastra mesin");
    expect(pubText).not.toContain("46337.422259");

    // Home page
    await page.goto("/");
    await expect(
      page.getByText(/Validasi respons\/sumber belum seluruhnya dikonfirmasi/i),
    ).toBeVisible();
    await expect(page.getByText("0,834354").first()).toBeVisible();
    await expect(page.getByText(/8 merek/i).first()).toBeVisible();

    // E11: Public brand filter on /rekomendasi keeps global rank & score intact
    await page.goto("/rekomendasi");
    await expect(page.getByText("Filter tampilan, peringkat global tetap")).toBeVisible();
    await expect(page.getByTestId("ranking-row-A33")).toContainText("#1");
    await expect(page.getByTestId("ranking-row-A29")).toContainText("#2");

    await page.locator("#rec-brand").selectOption("Axioo");
    await expect(page.getByTestId("ranking-row-A33")).toHaveCount(0);
    // A29 MUST retain global rank #2 and score 0,830314 when filtered!
    await expect(page.getByTestId("ranking-row-A29")).toContainText("#2");
    await expect(page.getByTestId("ranking-score-A29")).toContainText("0,830314");

    // Detail page for A33 with Wh proxy note and 4 sources
    await page.goto("/laptop/A33");
    await expect(page.getByText("Peringkat #1 dari 33")).toBeVisible();
    await expect(page.getByText("75 Wh").first()).toBeVisible();
    await expect(page.getByText("Sumber Harga Penawaran")).toBeVisible();
    await expect(page.getByText("Sumber Kapasitas Baterai (Wh)")).toBeVisible();

    // Methodology page with matrices, interactive 37-scenario sensitivity & DOIs
    await page.goto("/metodologi");
    await expect(page.getByText("Matriks Perbandingan Gabungan (AIJ)")).toBeVisible();
    await expect(page.getByTestId("weight-sensitivity-explorer")).toBeVisible();
    await page.getByTestId("sensitivity-cell-C2-20").click();
    await expect(page.getByTestId("sensitivity-active-winner")).toContainText("A29");
    await expect(page.getByText("https://doi.org/10.1504/IJSSCI.2008.017590")).toBeVisible();

    // Compare page
    await page.goto("/bandingkan");
    await expect(
      page.getByRole("heading", { name: "Bandingkan Alternatif Laptop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("rowheader", { name: "Skor SAW Resmi" }),
    ).toBeVisible();

    // E10: 360px mobile responsive check — zero page-level horizontal overflow
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of [
      "/",
      "/rekomendasi",
      "/laptop",
      "/laptop/A33",
      "/bandingkan",
      "/metodologi",
      "/tentang",
      "/admin/login",
    ]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `Overflow horizontal pada ${route} di 360px`).toBeLessThanOrEqual(2);
    }
  });
});
