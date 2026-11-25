import { describe, expect, it } from "vitest";
import {
  alternativeDraftSchema,
  parseSurveyFile,
  sanitizeSpreadsheetText,
  validateUploadedFile,
} from "@/lib/import";

describe("Import validation & security checks (synthetic unit tests)", () => {
  it("rejects macro-enabled files, old xls, corrupt zip, and encrypted OLE2 headers", () => {
    expect(validateUploadedFile("malware.xlsm", Buffer.from("PK\x03\x04test")).ok).toBe(false);
    expect(validateUploadedFile("legacy.xls", Buffer.from("PK\x03\x04test")).ok).toBe(false);
    expect(validateUploadedFile("corrupt.xlsx", Buffer.from("not-a-zip")).ok).toBe(false);
    expect(
      validateUploadedFile("encrypted.xlsx", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00])).ok,
    ).toBe(false);
    expect(
      validateUploadedFile("sneaky.xlsx", Buffer.from("PK\x03\x04...vbaProject.bin...")).ok,
    ).toBe(false);
  });

  it("rejects CSV with missing or unknown headers cleanly without partial commit", async () => {
    const badCsv = Buffer.from("Cap waktu,Kolom Salah\n2026-11-25 10:00:00,foo\n", "utf-8");
    const preview = await parseSurveyFile("bad.csv", badCsv);
    expect(preview.ok).toBe(false);
    expect(preview.errors.length).toBeGreaterThan(0);
    expect(preview.headerMapping.missingHeaders.length).toBeGreaterThan(0);
    expect(preview.headerMapping.unknownHeaders).toContain("Kolom Salah");
  });

  it("sanitizes spreadsheet formula injection characters", () => {
    expect(sanitizeSpreadsheetText("=SUM(A1:A5)")).toBe("'=SUM(A1:A5)");
    expect(sanitizeSpreadsheetText("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeSpreadsheetText("-1+1")).toBe("'-1+1");
    expect(sanitizeSpreadsheetText("@HYPERLINK")).toBe("'@HYPERLINK");
    expect(sanitizeSpreadsheetText("Lenovo IdeaPad")).toBe("Lenovo IdeaPad");
  });

  it("validates alternative draft schema including all 4 required safe http/https sources", () => {
    const valid = alternativeDraftSchema.safeParse({
      code: "A1",
      brand: "Lenovo",
      model: "Lenovo V14 G4 ABP 20ID",
      sku: "20ID",
      cpuName: "Ryzen 5 7530U",
      priceIdr: 9_399_000,
      cpuMark: 14_847,
      ramGb: 8,
      ssdGb: 512,
      weightKg: 1.43,
      batteryHours: 12.5,
      batteryWh: 38,
      seller: "Kharisma Kencana",
      active: true,
      stockStatus: "indexed_in_stock",
      evidenceStatus: "provisional_unconfirmed",
      batteryProtocol: "Lenovo PSREF 1080p @ 150 nit",
      evidenceNotes: "Test",
      sources: [
        { sourceType: "price", url: "https://example.com/p", observedAt: "2026-11-25", evidenceLevel: "listing", notes: "" },
        { sourceType: "spec", url: "https://example.com/s", observedAt: "2026-11-25", evidenceLevel: "sku", notes: "" },
        { sourceType: "benchmark", url: "https://example.com/b", observedAt: "2026-11-25", evidenceLevel: "series", notes: "" },
        { sourceType: "battery", url: "https://example.com/bat", observedAt: "2026-11-25", evidenceLevel: "series", notes: "" },
      ],
    });
    expect(valid.success).toBe(true);

    const badProtocol = alternativeDraftSchema.safeParse({
      ...(valid.success ? valid.data : {}),
      sources: [
        { sourceType: "price", url: "javascript:alert(1)", observedAt: "2026-11-25", evidenceLevel: "listing", notes: "" },
        { sourceType: "spec", url: "https://example.com/s", observedAt: "2026-11-25", evidenceLevel: "sku", notes: "" },
        { sourceType: "benchmark", url: "https://example.com/b", observedAt: "2026-11-25", evidenceLevel: "series", notes: "" },
        { sourceType: "battery", url: "https://example.com/bat", observedAt: "2026-11-25", evidenceLevel: "series", notes: "" },
      ],
    });
    expect(badProtocol.success).toBe(false);
  });
});
