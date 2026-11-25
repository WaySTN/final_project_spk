import ExcelJS from "exceljs";
import JSZip from "jszip";

function stripBom(xml: string): string {
  return xml.replace(/^\uFEFF/, "");
}

function stripSpreadsheetPrefix(xml: string): string {
  let out = stripBom(xml);
  if (out.includes('xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')) {
    out = out
      .replace(
        /xmlns:x="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/g,
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      )
      .replace(/<x:/g, "<")
      .replace(/<\/x:/g, "</");
  }
  return out;
}

function normalizeRootRels(xml: string): string {
  return stripBom(xml).replace(/Target="\/([^"]+)"/g, 'Target="$1"');
}

function normalizeWorkbookRels(xml: string): string {
  return stripBom(xml)
    .replace(/Target="\/xl\/([^"]+)"/g, 'Target="$1"')
    .replace(/Target="\/([^"]+)"/g, 'Target="$1"');
}

/**
 * Loads an .xlsx Buffer into ExcelJS safely, normalizing OpenXML relationship targets
 * produced by tools such as openpyxl (UTF-8 BOM and leading "/xl/" absolute paths)
 * in-memory without mutating the original source file.
 */
export async function loadExcelWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  try {
    // @ts-expect-error ExcelJS load signature lags behind Node 22 Buffer<ArrayBufferLike>
    await workbook.xlsx.load(buffer);
    if (workbook.worksheets.length > 0) {
      return workbook;
    }
  } catch {
    // Fall through to in-memory OpenXML relationship normalization
  }

  const zip = await JSZip.loadAsync(buffer);
  const rootRels = zip.file("_rels/.rels");
  if (rootRels) {
    const content = await rootRels.async("string");
    zip.file("_rels/.rels", normalizeRootRels(content));
  }

  const wbRels = zip.file("xl/_rels/workbook.xml.rels");
  if (wbRels) {
    const content = await wbRels.async("string");
    zip.file("xl/_rels/workbook.xml.rels", normalizeWorkbookRels(content));
  }

  // Strip UTF-8 BOM and redundant x: spreadsheetml prefix (from ClosedXML/OpenXML SDK)
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith(".xml") || name.endsWith(".rels")) {
      const file = zip.file(name);
      if (file && !file.dir) {
        const text = await file.async("string");
        const cleaned = name.endsWith(".xml")
          ? stripSpreadsheetPrefix(text)
          : stripBom(text);
        if (cleaned !== text) {
          zip.file(name, cleaned);
        }
      }
    }
  }

  const normalizedBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const normalizedWorkbook = new ExcelJS.Workbook();
  // @ts-expect-error ExcelJS load signature lags behind Node 22 Buffer<ArrayBufferLike>
  await normalizedWorkbook.xlsx.load(normalizedBuffer);
  return normalizedWorkbook;
}
