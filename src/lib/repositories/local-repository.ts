import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  RepositoryError,
  type AdminOverviewStats,
  type AhpIndividualResultRecord,
  type AhpRunRecord,
  type AlternativeDatasetRecord,
  type AlternativeRecord,
  type AuditLogRecord,
  type CreateAlternativeDatasetInput,
  type CreateResponseBatchInput,
  type DataRepository,
  type PublicationRecord,
  type PublicRecommendationPayload,
  type QualityReviewChecklist,
  type ResponseBatchRecord,
  type SawResultRecord,
  type SawRunRecord,
  type SurveyResponseRecord,
  type UpsertAlternativeInput,
} from "./types";

interface LocalStoreData {
  responseBatches: ResponseBatchRecord[];
  surveyResponses: SurveyResponseRecord[];
  alternativeDatasets: AlternativeDatasetRecord[];
  alternatives: AlternativeRecord[];
  ahpRuns: AhpRunRecord[];
  ahpIndividualResults: AhpIndividualResultRecord[];
  sawRuns: SawRunRecord[];
  sawResults: SawResultRecord[];
  publications: PublicationRecord[];
  auditLogs: AuditLogRecord[];
}

function emptyStore(): LocalStoreData {
  return {
    responseBatches: [],
    surveyResponses: [],
    alternativeDatasets: [],
    alternatives: [],
    ahpRuns: [],
    ahpIndividualResults: [],
    sawRuns: [],
    sawResults: [],
    publications: [],
    auditLogs: [],
  };
}

/**
 * Isolated file-backed repository strictly for local development & Playwright E2E testing
 * when Supabase credentials are not yet configured. Enforces identical immutability,
 * deduplication, and single-current-publication constraints as the PostgreSQL schema.
 */
export class LocalJsonRepository implements DataRepository {
  readonly mode = "local_test" as const;
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  private read(): LocalStoreData {
    if (!fs.existsSync(this.filePath)) {
      return emptyStore();
    }
    const raw = fs.readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) return emptyStore();
    return JSON.parse(raw) as LocalStoreData;
  }

  private write(data: LocalStoreData): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, this.filePath);
  }

  async getCurrentPublication(): Promise<PublicationRecord | null> {
    const store = this.read();
    return (
      store.publications.find(
        (p) => p.isCurrent && (p.status === "provisional" || p.status === "final"),
      ) ?? null
    );
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    const store = this.read();
    const batches = [...store.responseBatches].sort((a, b) =>
      b.importedAt.localeCompare(a.importedAt),
    );
    const latestBatch = batches[0] ?? null;

    const ahpPrimaryRuns = store.ahpRuns
      .filter((r) => r.mode === "consistent_only")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestAhpPrimary = ahpPrimaryRuns[0] ?? null;

    const datasets = [...store.alternativeDatasets].sort((a, b) => b.version - a.version);
    const latestDataset = datasets[0] ?? null;

    const alts = latestDataset
      ? store.alternatives.filter((a) => a.datasetId === latestDataset.id)
      : [];

    const activeAlts = alts.filter((a) => a.active);
    const sawRuns = [...store.sawRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const currentPublication = await this.getCurrentPublication();

    const totalResponses = latestBatch?.rowCount ?? 0;
    const eligibleResponses = latestBatch?.eligibleCount ?? 0;
    const consistentResponses = latestAhpPrimary?.includedIds.length ?? 0;
    const inconsistentResponses = Math.max(0, eligibleResponses - consistentResponses);

    return {
      storageMode: "local_test",
      latestBatch,
      totalResponses,
      eligibleResponses,
      consistentResponses,
      inconsistentResponses,
      latestAhpPrimary,
      latestDataset,
      activeAlternativesCount: activeAlts.length,
      verifiedEvidenceCount: activeAlts.filter(
        (a) => a.evidenceStatus === "verified_by_researcher",
      ).length,
      withdrawnCount: activeAlts.filter((a) => a.stockStatus === "withdrawn_series").length,
      latestSawRun: sawRuns[0] ?? null,
      currentPublication,
      recentAuditLogs: [...store.auditLogs]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12),
    };
  }

  async listResponseBatches(): Promise<ResponseBatchRecord[]> {
    const store = this.read();
    return [...store.responseBatches].sort((a, b) =>
      b.importedAt.localeCompare(a.importedAt),
    );
  }

  async getResponseBatch(batchId: string) {
    const store = this.read();
    const batch = store.responseBatches.find((b) => b.id === batchId);
    if (!batch) return null;
    const responses = store.surveyResponses
      .filter((r) => r.batchId === batchId)
      .sort((a, b) => a.rowNo - b.rowNo);
    return { batch, responses };
  }

  async createResponseBatch(input: CreateResponseBatchInput): Promise<ResponseBatchRecord> {
    const store = this.read();
    const dup = store.responseBatches.find((b) => b.sha256 === input.sha256);
    if (dup) {
      throw new RepositoryError(
        409,
        "DUPLICATE_BATCH_HASH",
        `Berkas dengan SHA-256 yang sama sudah pernah diimpor sebelumnya pada batch "${dup.filename}" (${dup.importedAt}).`,
      );
    }

    // Supersede previous active batch when a new replacement full-export arrives
    for (const existing of store.responseBatches) {
      if (existing.status === "active") {
        existing.status = "superseded";
      }
    }

    const batchId = crypto.randomUUID();
    const batch: ResponseBatchRecord = {
      id: batchId,
      filename: input.filename,
      sheetName: input.sheetName,
      sha256: input.sha256,
      importedBy: input.importedBy,
      importedAt: new Date().toISOString(),
      rowCount: input.rows.length,
      eligibleCount: input.rows.filter((r) => r.eligible).length,
      parentBatchId: input.parentBatchId ?? null,
      status: "active",
      notes: input.notes ?? "",
    };

    const records: SurveyResponseRecord[] = input.rows.map((r) => ({
      id: crypto.randomUUID(),
      batchId,
      rowNo: r.rowNo,
      code: r.code,
      rawTimestamp: r.rawTimestamp,
      submittedAt: r.submittedAt,
      consent: r.consentValid,
      activeStudent: r.activeStudentValid,
      programStudy: r.programStudy,
      useCase: r.useCase,
      suggestion: r.suggestion,
      rawAnswers: r.rawAnswers,
      parsedAnswers: r.parsedAnswers,
      validationStatus: r.validationStatus,
      validationErrors: r.validationErrors,
      auditFlags: r.auditFlags,
    }));

    store.responseBatches.push(batch);
    store.surveyResponses.push(...records);
    this.write(store);
    return batch;
  }

  async listAlternativeDatasets(): Promise<AlternativeDatasetRecord[]> {
    const store = this.read();
    return [...store.alternativeDatasets].sort((a, b) => b.version - a.version);
  }

  async getAlternativeDataset(datasetId: string) {
    const store = this.read();
    const dataset = store.alternativeDatasets.find((d) => d.id === datasetId);
    if (!dataset) return null;
    const alternatives = store.alternatives
      .filter((a) => a.datasetId === datasetId)
      .sort((a, b) => a.code.localeCompare(b.code, "en"));
    return { dataset, alternatives };
  }

  async createAlternativeDataset(
    input: CreateAlternativeDatasetInput,
  ): Promise<AlternativeDatasetRecord> {
    const store = this.read();
    const nextVersion =
      store.alternativeDatasets.reduce((max, d) => Math.max(max, d.version), 0) + 1;

    const datasetId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dataset: AlternativeDatasetRecord = {
      id: datasetId,
      version: nextVersion,
      label: input.label || `Dataset Alternatif v${nextVersion}`,
      sourceFilename: input.sourceFilename,
      sourceHash: input.sourceHash,
      observedAt: input.observedAt,
      createdBy: input.createdBy,
      createdAt: now,
      status: "draft",
      notes: input.notes ?? "",
    };

    const altRecords: AlternativeRecord[] = input.alternatives.map((alt) => {
      const altId = crypto.randomUUID();
      return {
        id: altId,
        datasetId,
        code: alt.code,
        brand: alt.brand,
        model: alt.model,
        sku: alt.sku,
        cpuName: alt.cpuName,
        priceIdr: alt.priceIdr,
        cpuMark: alt.cpuMark,
        ramGb: alt.ramGb,
        ssdGb: alt.ssdGb,
        weightKg: alt.weightKg,
        batteryHours: alt.batteryHours,
        batteryWh: alt.batteryWh,
        seller: alt.seller,
        active: alt.active,
        stockStatus: alt.stockStatus,
        evidenceStatus: alt.evidenceStatus,
        batteryProtocol: alt.batteryProtocol,
        evidenceNotes: alt.evidenceNotes,
        createdAt: now,
        sources: alt.sources.map((s) => ({
          id: crypto.randomUUID(),
          alternativeId: altId,
          sourceType: s.sourceType,
          url: s.url,
          observedAt: s.observedAt,
          evidenceLevel: s.evidenceLevel,
          notes: s.notes,
        })),
      };
    });

    store.alternativeDatasets.push(dataset);
    store.alternatives.push(...altRecords);
    this.write(store);
    return dataset;
  }

  async duplicateDatasetToDraft(
    sourceDatasetId: string,
    actorId: string | null,
    label?: string,
  ): Promise<AlternativeDatasetRecord> {
    const source = await this.getAlternativeDataset(sourceDatasetId);
    if (!source) {
      throw new RepositoryError(404, "DATASET_NOT_FOUND", "Dataset sumber tidak ditemukan.");
    }

    return this.createAlternativeDataset({
      label: label || `Draft salinan dari v${source.dataset.version}`,
      sourceFilename: source.dataset.sourceFilename,
      sourceHash: source.dataset.sourceHash,
      observedAt: source.dataset.observedAt,
      createdBy: actorId,
      notes: `Digandakan dari dataset v${source.dataset.version} (${source.dataset.id}).`,
      alternatives: source.alternatives.map((a) => ({
        code: a.code,
        brand: a.brand,
        model: a.model,
        sku: a.sku,
        cpuName: a.cpuName,
        priceIdr: a.priceIdr,
        cpuMark: a.cpuMark,
        ramGb: a.ramGb,
        ssdGb: a.ssdGb,
        weightKg: a.weightKg,
        batteryHours: a.batteryHours,
        batteryWh: a.batteryWh,
        seller: a.seller,
        active: a.active,
        stockStatus: a.stockStatus,
        evidenceStatus: a.evidenceStatus,
        batteryProtocol: a.batteryProtocol,
        evidenceNotes: a.evidenceNotes,
        sources: a.sources.map((s) => ({
          sourceType: s.sourceType,
          url: s.url,
          observedAt: s.observedAt,
          evidenceLevel: s.evidenceLevel,
          notes: s.notes,
        })),
      })),
    });
  }

  async upsertDraftAlternative(input: UpsertAlternativeInput): Promise<AlternativeRecord> {
    const store = this.read();
    const dataset = store.alternativeDatasets.find((d) => d.id === input.datasetId);
    if (!dataset) {
      throw new RepositoryError(404, "DATASET_NOT_FOUND", "Dataset alternatif tidak ditemukan.");
    }
    if (dataset.status === "sealed") {
      throw new RepositoryError(
        409,
        "DATASET_SEALED",
        "Dataset berstatus sealed tidak dapat diubah. Gandakan menjadi draft baru terlebih dahulu.",
      );
    }

    const now = new Date().toISOString();
    if (input.id) {
      const idx = store.alternatives.findIndex(
        (a) => a.id === input.id && a.datasetId === input.datasetId,
      );
      if (idx < 0) {
        throw new RepositoryError(404, "ALTERNATIVE_NOT_FOUND", "Alternatif tidak ditemukan.");
      }

      const duplicateCode = store.alternatives.find(
        (a) =>
          a.datasetId === input.datasetId &&
          a.code === input.code &&
          a.id !== input.id,
      );
      if (duplicateCode) {
        throw new RepositoryError(
          409,
          "DUPLICATE_CODE",
          `Kode alternatif ${input.code} sudah digunakan pada dataset ini.`,
        );
      }

      const existing = store.alternatives[idx]!;
      const updated: AlternativeRecord = {
        ...existing,
        code: input.code,
        brand: input.brand,
        model: input.model,
        sku: input.sku,
        cpuName: input.cpuName,
        priceIdr: input.priceIdr,
        cpuMark: input.cpuMark,
        ramGb: input.ramGb,
        ssdGb: input.ssdGb,
        weightKg: input.weightKg,
        batteryHours: input.batteryHours,
        batteryWh: input.batteryWh,
        seller: input.seller,
        active: input.active,
        stockStatus: input.stockStatus,
        evidenceStatus: input.evidenceStatus,
        batteryProtocol: input.batteryProtocol,
        evidenceNotes: input.evidenceNotes,
        sources: input.sources.map((s) => ({
          id: crypto.randomUUID(),
          alternativeId: existing.id,
          sourceType: s.sourceType,
          url: s.url,
          observedAt: s.observedAt,
          evidenceLevel: s.evidenceLevel,
          notes: s.notes,
        })),
      };
      store.alternatives[idx] = updated;
      this.write(store);
      return updated;
    }

    const dupCode = store.alternatives.find(
      (a) => a.datasetId === input.datasetId && a.code === input.code,
    );
    if (dupCode) {
      throw new RepositoryError(
        409,
        "DUPLICATE_CODE",
        `Kode alternatif ${input.code} sudah digunakan pada dataset ini.`,
      );
    }

    const altId = crypto.randomUUID();
    const created: AlternativeRecord = {
      id: altId,
      datasetId: input.datasetId,
      code: input.code,
      brand: input.brand,
      model: input.model,
      sku: input.sku,
      cpuName: input.cpuName,
      priceIdr: input.priceIdr,
      cpuMark: input.cpuMark,
      ramGb: input.ramGb,
      ssdGb: input.ssdGb,
      weightKg: input.weightKg,
      batteryHours: input.batteryHours,
      batteryWh: input.batteryWh,
      seller: input.seller,
      active: input.active,
      stockStatus: input.stockStatus,
      evidenceStatus: input.evidenceStatus,
      batteryProtocol: input.batteryProtocol,
      evidenceNotes: input.evidenceNotes,
      createdAt: now,
      sources: input.sources.map((s) => ({
        id: crypto.randomUUID(),
        alternativeId: altId,
        sourceType: s.sourceType,
        url: s.url,
        observedAt: s.observedAt,
        evidenceLevel: s.evidenceLevel,
        notes: s.notes,
      })),
    };

    store.alternatives.push(created);
    this.write(store);
    return created;
  }

  async toggleAlternativeActive(
    alternativeId: string,
    active: boolean,
  ): Promise<AlternativeRecord> {
    const store = this.read();
    const alt = store.alternatives.find((a) => a.id === alternativeId);
    if (!alt) {
      throw new RepositoryError(404, "ALTERNATIVE_NOT_FOUND", "Alternatif tidak ditemukan.");
    }
    const dataset = store.alternativeDatasets.find((d) => d.id === alt.datasetId);
    if (dataset?.status === "sealed") {
      throw new RepositoryError(
        409,
        "DATASET_SEALED",
        "Dataset berstatus sealed tidak dapat diubah. Gandakan menjadi draft baru terlebih dahulu.",
      );
    }
    alt.active = active;
    this.write(store);
    return alt;
  }

  async sealDataset(datasetId: string): Promise<void> {
    const store = this.read();
    const ds = store.alternativeDatasets.find((d) => d.id === datasetId);
    if (ds && ds.status !== "sealed") {
      ds.status = "sealed";
      this.write(store);
    }
  }

  async listAhpRuns(): Promise<AhpRunRecord[]> {
    const store = this.read();
    return [...store.ahpRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAhpRunDetail(runId: string) {
    const store = this.read();
    const run = store.ahpRuns.find((r) => r.id === runId);
    if (!run) return null;
    const individualResults = store.ahpIndividualResults
      .filter((ir) => ir.runId === runId)
      .sort((a, b) => a.responseCode.localeCompare(b.responseCode, "en"));
    return { run, individualResults };
  }

  async saveAhpRun(params: {
    run: Omit<AhpRunRecord, "id" | "createdAt">;
    individualResults: Array<Omit<AhpIndividualResultRecord, "id" | "runId">>;
  }): Promise<AhpRunRecord> {
    const store = this.read();
    const runId = crypto.randomUUID();
    const record: AhpRunRecord = {
      ...params.run,
      id: runId,
      createdAt: new Date().toISOString(),
    };
    const indRecords: AhpIndividualResultRecord[] = params.individualResults.map((ir) => ({
      ...ir,
      id: crypto.randomUUID(),
      runId,
    }));

    store.ahpRuns.push(record);
    store.ahpIndividualResults.push(...indRecords);
    this.write(store);
    return record;
  }

  async listSawRuns(): Promise<SawRunRecord[]> {
    const store = this.read();
    return [...store.sawRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getSawRunDetail(runId: string) {
    const store = this.read();
    const run = store.sawRuns.find((r) => r.id === runId);
    if (!run) return null;
    const results = store.sawResults
      .filter((r) => r.runId === runId)
      .sort((a, b) =>
        a.rank !== b.rank
          ? a.rank - b.rank
          : a.alternativeCode.localeCompare(b.alternativeCode, "en"),
      );
    const ahpRun = store.ahpRuns.find((a) => a.id === run.ahpRunId);
    const dataset = store.alternativeDatasets.find((d) => d.id === run.datasetId);
    if (!ahpRun || !dataset) return null;
    const alternatives = store.alternatives
      .filter((a) => a.datasetId === dataset.id)
      .sort((a, b) => a.code.localeCompare(b.code, "en"));
    return { run, results, ahpRun, dataset, alternatives };
  }

  async saveSawRun(params: {
    run: Omit<SawRunRecord, "id" | "createdAt">;
    results: Array<Omit<SawResultRecord, "id" | "runId">>;
  }): Promise<SawRunRecord> {
    const store = this.read();
    const runId = crypto.randomUUID();
    const record: SawRunRecord = {
      ...params.run,
      id: runId,
      createdAt: new Date().toISOString(),
    };
    const resultRecords: SawResultRecord[] = params.results.map((r) => ({
      ...r,
      id: crypto.randomUUID(),
      runId,
    }));

    // Seal dataset automatically once used in a persisted SAW run
    const ds = store.alternativeDatasets.find((d) => d.id === record.datasetId);
    if (ds) ds.status = "sealed";

    store.sawRuns.push(record);
    store.sawResults.push(...resultRecords);
    this.write(store);
    return record;
  }

  async listPublications(): Promise<PublicationRecord[]> {
    const store = this.read();
    return [...store.publications].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  }

  async publishSnapshot(params: {
    sawRunId: string;
    sensitivityRunIds: string[];
    publicPayload: PublicRecommendationPayload;
    status: "provisional" | "final";
    reviewedBy: string | null;
    caveats: string;
    qualityReview: QualityReviewChecklist;
  }): Promise<PublicationRecord> {
    const store = this.read();
    for (const pub of store.publications) {
      if (pub.isCurrent) {
        pub.isCurrent = false;
        pub.status = "archived";
      }
    }

    const record: PublicationRecord = {
      id: crypto.randomUUID(),
      sawRunId: params.sawRunId,
      sensitivityRunIds: params.sensitivityRunIds,
      publicPayload: params.publicPayload,
      status: params.status,
      isCurrent: true,
      reviewedBy: params.reviewedBy,
      publishedAt: params.publicPayload.publishedAt,
      caveats: params.caveats,
      qualityReview: params.qualityReview,
    };

    store.publications.push(record);
    this.write(store);
    return record;
  }

  async writeAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    const store = this.read();
    store.auditLogs.push({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    this.write(store);
  }
}
