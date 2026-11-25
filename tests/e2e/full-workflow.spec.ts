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

function getLaptopFilePath(): string {
  const target = path.join(PRIVATE_DIR, "SPK_Kelompok_13_Audit_SAW_Revisi.xlsx");
  if (!fs.existsSync(target)) {
    throw new Error("Audit SAW Revisi XLSX not found in research/private/");
  }
  return target;
}

test.describe.serial("LaptopMatch End-to-End Acceptance Suite (E01–E12)", () => {
  test("E01 & E12: anonymous blocked from admin, and public shows honest empty state before publication", async ({
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
    await expect(page.getByText("0,953349")).toHaveCount(0);

    await page.goto("/rekomendasi");
    await expect(
      page.getByText("Belum ada snapshot rekomendasi yang dipublikasikan"),
    ).toBeVisible();
  });

  test("E02–E09: full admin workflow (login, bad file rejection, real XLSX import, AHP, SAW S1/S2/S3, sealed immutability, final gate block, provisional publish, XLSX export, logout)", async ({
    page,
  }) => {
    test.setTimeout(60_000);
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

    // Import real audit laptop workbook (7 alternatives)
    await page.goto("/admin/alternatif");
    const laptopPath = getLaptopFilePath();
    await page.locator("#laptop-file").setInputFiles(laptopPath);
    await page.getByRole("button", { name: "1. Preview Alternatif" }).click();
    await expect(page.getByText("Lolos Validasi")).toBeVisible();
    await page.getByRole("button", { name: "2. Simpan sebagai Draft Baru" }).click();
    await expect(page.getByText(/berhasil diimpor sebagai draft/i)).toBeVisible();
    await expect(page.getByText("Lenovo IdeaPad Slim 3 14IAH8 83EQ0077ID")).toBeVisible();

    // E05a: Compute AHP S1 (consistent_only -> 17) & AHP S2 (all_eligible -> 33)
    await page.goto("/admin/perhitungan/ahp");
    await page.getByRole("button", { name: "Hitung AHP Sekarang" }).click();
    await expect(page.getByText("0,00127449").first()).toBeVisible();
    await expect(page.getByText("21,32%").first()).toBeVisible();

    await page.locator("#ahp-mode").selectOption("all_eligible");
    await page.getByRole("button", { name: "Hitung AHP Sekarang" }).click();
    await expect(page.getByText("0,01233169").first()).toBeVisible();

    // E05b: Compute SAW S1 (7 alt, 17 consistent), S2 (7 alt, 33 resp), S3 (5 alt no A6/A7)
    await page.goto("/admin/perhitungan/saw");
    await page.locator("#saw-scenario").selectOption("primary_7_consistent");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText("0,953349").first()).toBeVisible();
    await expect(page.getByText("0,953327").first()).toBeVisible();

    // Compute S3 (5 alternatives without A6/A7 -> A2 #1 0,979739)
    await page.locator("#saw-scenario").selectOption("sensitivity_5_no_a6_a7");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText("0,979739").first()).toBeVisible();

    // Compute S2 using the 33-response AHP run
    const ahpSelect = page.locator("#saw-ahp");
    const allAhpOpt = await ahpSelect
      .locator("option", { hasText: "Semua" })
      .first()
      .getAttribute("value");
    expect(allAhpOpt).toBeTruthy();
    await ahpSelect.selectOption(allAhpOpt!);
    await page.locator("#saw-scenario").selectOption("sensitivity_7_all");
    await page.getByRole("button", { name: "Hitung SAW Sekarang" }).click();
    await expect(page.getByText("0,963921").first()).toBeVisible();

    // E06: Verify dataset v1 is now sealed; duplicating to draft v2 preserves immutability
    await page.goto("/admin/alternatif");
    await expect(page.getByText("Dataset berstatus Sealed (Immutable)")).toBeVisible();
    await page.getByRole("button", { name: "Gandakan ke Draft" }).click();
    await expect(page.getByText(/Draft baru v2 berhasil dibuat/i)).toBeVisible();

    // E08: Attempt final publish before completing human review -> blocked with explicit reasons
    await page.goto("/admin/riwayat");
    await page.locator("#pub-status").selectOption("final");
    await page.getByRole("button", { name: /Publikasikan sebagai FINAL/i }).click();
    await expect(page.getByText("Gerbang Publikasi Memblokir Permintaan")).toBeVisible();
    await expect(
      page.getByText(/Konfirmasi independensi & keaslian respons kuesioner tambahan/i),
    ).toBeVisible();

    // E07: Publish S1 as provisional
    await page.locator("#pub-status").selectOption("provisional");
    await page
      .getByRole("button", { name: /Publikasikan sebagai PROVISIONAL/i })
      .click();
    await expect(page.getByText(/berhasil dipublikasikan dengan status PROVISIONAL/i)).toBeVisible();

    // E09: Export XLSX via authenticated session
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

  test("E07, E10 & E11: public website renders published provisional snapshot, filters without altering global rank, leaks zero raw rows, and passes 360px mobile overflow check", async ({
    page,
    request,
  }) => {
    // Public API check: sanitized payload only, zero private survey leakage
    const pubApi = await request.get("/api/public/recommendation");
    expect(pubApi.status()).toBe(200);
    const pubText = await pubApi.text();
    expect(pubText).toContain("Lenovo IdeaPad Slim 3 14IAH8");
    expect(pubText).not.toContain("bebas kak manut aja");
    expect(pubText).not.toContain("Sastra mesin");
    expect(pubText).not.toContain("46337.422259");

    // Home page
    await page.goto("/");
    await expect(
      page.getByText(/Validasi respons\/sumber belum seluruhnya dikonfirmasi/i),
    ).toBeVisible();
    await expect(page.getByText("0,953349").first()).toBeVisible();

    // E11: Public search/filter on /rekomendasi keeps global rank & score intact
    await page.goto("/rekomendasi");
    await expect(page.getByText("Filter tampilan, bukan perhitungan ulang")).toBeVisible();
    await expect(page.getByTestId("ranking-row-A7")).toContainText("#1");
    await expect(page.getByTestId("ranking-row-A2")).toContainText("#3");

    await page.locator("#rec-ram").selectOption("8");
    await expect(page.getByTestId("ranking-row-A7")).toHaveCount(0);
    // A2 MUST retain global rank #3 and score 0,887581 when filtered!
    await expect(page.getByTestId("ranking-row-A2")).toContainText("#3");
    await expect(page.getByTestId("ranking-score-A2")).toContainText("0,887581");

    // Detail page with 4 sources
    await page.goto("/laptop/A7");
    await expect(page.getByText("Peringkat #1 dari 7")).toBeVisible();
    await expect(page.getByText("Sumber Harga Penawaran")).toBeVisible();
    await expect(page.getByText("Sumber Durasi Baterai (Lenovo PSREF)")).toBeVisible();

    // Methodology page with matrices, sensitivity & DOIs
    await page.goto("/metodologi");
    await expect(page.getByText("Matriks Perbandingan Gabungan (AIJ)")).toBeVisible();
    await expect(page.getByText("Analisis Sensitivitas Lintas Skenario")).toBeVisible();
    await expect(page.getByText("https://doi.org/10.1504/IJSSCI.2008.017590")).toBeVisible();

    // Compare page (P1)
    await page.goto("/bandingkan");
    await expect(
      page.getByRole("heading", { name: "Bandingkan Alternatif Laptop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("rowheader", { name: "Skor SAW Resmi" }),
    ).toBeVisible();

    // E10: 360px mobile responsive check — zero page-level horizontal overflow
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of ["/", "/rekomendasi", "/laptop", "/laptop/A7", "/metodologi", "/tentang", "/admin/login"]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `Overflow horizontal pada ${route} di 360px`).toBeLessThanOrEqual(2);
    }
  });
});
