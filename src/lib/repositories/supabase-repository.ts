import type { SupabaseClient } from "@supabase/supabase-js";
import { weightsArrayToRecord, type AhpMatrix, type CriteriaNumericVector, type CriterionCode, type SawCriterionExtrema } from "@/lib/decision";
import {
  RepositoryError,
  type AdminOverviewStats,
  type AhpIndividualResultRecord,
  type AhpRunRecord,
  type AlternativeDatasetRecord,
  type AlternativeRecord,
  type AlternativeSourceRecord,
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

function mapBatch(row: Record<string, unknown>): ResponseBatchRecord {
  return {
    id: String(row.id),
    filename: String(row.filename),
    sheetName: String(row.sheet_name ?? ""),
    sha256: String(row.sha256),
    importedBy: row.imported_by ? String(row.imported_by) : null,
    importedAt: String(row.imported_at),
    rowCount: Number(row.row_count),
    eligibleCount: Number(row.eligible_count ?? 0),
    parentBatchId: row.parent_batch_id ? String(row.parent_batch_id) : null,
    status: row.status as ResponseBatchRecord["status"],
    notes: String(row.notes ?? ""),
  };
}

function mapSurveyResponse(row: Record<string, unknown>): SurveyResponseRecord {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    rowNo: Number(row.row_no),
    code: String(row.code),
    rawTimestamp: String(row.raw_timestamp ?? ""),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    consent: Boolean(row.consent),
    activeStudent: Boolean(row.active_student),
    programStudy: row.program_study ? String(row.program_study) : null,
    useCase: String(row.use_case ?? ""),
    suggestion: row.suggestion ? String(row.suggestion) : null,
    rawAnswers: (row.raw_answers ?? {}) as Record<string, string>,
    parsedAnswers: (row.parsed_answers ?? []) as SurveyResponseRecord["parsedAnswers"],
    validationStatus: row.validation_status as SurveyResponseRecord["validationStatus"],
    validationErrors: (row.validation_errors ?? []) as string[],
    auditFlags: (row.audit_flags ?? []) as SurveyResponseRecord["auditFlags"],
  };
}

function mapDataset(row: Record<string, unknown>): AlternativeDatasetRecord {
  return {
    id: String(row.id),
    version: Number(row.version),
    label: String(row.label ?? ""),
    sourceFilename: row.source_filename ? String(row.source_filename) : null,
    sourceHash: row.source_hash ? String(row.source_hash) : null,
    observedAt: String(row.observed_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    status: row.status as AlternativeDatasetRecord["status"],
    notes: String(row.notes ?? ""),
  };
}

function mapSource(row: Record<string, unknown>): AlternativeSourceRecord {
  return {
    id: String(row.id),
    alternativeId: String(row.alternative_id),
    sourceType: row.source_type as AlternativeSourceRecord["sourceType"],
    url: String(row.url),
    observedAt: String(row.observed_at),
    evidenceLevel: row.evidence_level as AlternativeSourceRecord["evidenceLevel"],
    notes: String(row.notes ?? ""),
  };
}

function mapAlternative(
  row: Record<string, unknown>,
  sources: AlternativeSourceRecord[],
): AlternativeRecord {
  return {
    id: String(row.id),
    datasetId: String(row.dataset_id),
    code: String(row.code),
    brand: String(row.brand),
    model: String(row.model),
    sku: String(row.sku),
    cpuName: String(row.cpu_name),
    priceIdr: Number(row.price_idr),
    cpuMark: Number(row.cpu_mark),
    ramGb: Number(row.ram_gb),
    ssdGb: Number(row.ssd_gb),
    weightKg: Number(row.weight_kg),
    batteryHours: Number(row.battery_hours),
    batteryWh: row.battery_wh === null || row.battery_wh === undefined ? null : Number(row.battery_wh),
    seller: String(row.seller),
    active: Boolean(row.active),
    stockStatus: row.stock_status as AlternativeRecord["stockStatus"],
    evidenceStatus: row.evidence_status as AlternativeRecord["evidenceStatus"],
    batteryProtocol: String(row.battery_protocol),
    evidenceNotes: String(row.evidence_notes ?? ""),
    createdAt: String(row.created_at),
    sources,
  };
}

function mapAhpRun(row: Record<string, unknown>): AhpRunRecord {
  const weights = (row.weights ?? []) as number[];
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    mode: row.mode as AhpRunRecord["mode"],
    algorithmVersion: String(row.algorithm_version),
    includedIds: (row.included_ids ?? []) as string[],
    excludedIds: (row.excluded_ids ?? []) as string[],
    aggregateMatrix: (row.aggregate_matrix ?? []) as AhpMatrix,
    weights,
    weightsByCode: weightsArrayToRecord(weights),
    lambdaMax: Number(row.lambda_max),
    ci: Number(row.ci),
    ri: Number(row.ri),
    cr: Number(row.cr),
    passesCr: Boolean(row.passes_cr),
    iterations: Number(row.iterations),
    targetCount: Number(row.target_count ?? 12),
    warnings: (row.warnings ?? []) as string[],
    createdAt: String(row.created_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    status: row.status as AhpRunRecord["status"],
  };
}

function mapSawRun(row: Record<string, unknown>): SawRunRecord {
  return {
    id: String(row.id),
    ahpRunId: String(row.ahp_run_id),
    datasetId: String(row.dataset_id),
    scenario: row.scenario as SawRunRecord["scenario"],
    algorithmVersion: String(row.algorithm_version),
    inputSnapshot: row.input_snapshot as SawRunRecord["inputSnapshot"],
    normalizationExtrema: row.normalization_extrema as Record<
      CriterionCode,
      SawCriterionExtrema
    >,
    topMargin:
      row.top_margin === null || row.top_margin === undefined
        ? null
        : Number(row.top_margin),
    warnings: (row.warnings ?? []) as string[],
    caveats: (row.caveats ?? []) as string[],
    createdAt: String(row.created_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    status: row.status as SawRunRecord["status"],
  };
}

function mapPublication(row: Record<string, unknown>): PublicationRecord {
  return {
    id: String(row.id),
    sawRunId: String(row.saw_run_id ?? ""),
    sensitivityRunIds: (row.sensitivity_run_ids ?? []) as string[],
    publicPayload: row.public_payload as PublicRecommendationPayload,
    status: row.status as PublicationRecord["status"],
    isCurrent: Boolean(row.is_current ?? true),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    publishedAt: String(row.published_at),
    caveats: String(row.caveats ?? ""),
    qualityReview: (row.quality_review ?? {}) as QualityReviewChecklist,
  };
}

export class SupabaseRepository implements DataRepository {
  readonly mode = "supabase" as const;

  constructor(private readonly client: SupabaseClient) {}

  async getCurrentPublication(): Promise<PublicationRecord | null> {
    const { data, error } = await this.client
      .from("current_public_publication")
      .select("id, status, published_at, caveats, public_payload")
      .maybeSingle();

    if (error) {
      throw new RepositoryError(500, "DB_QUERY_FAILED", "Gagal memuat snapshot publikasi terkini.");
    }
    if (!data) return null;
    return mapPublication({ ...data, is_current: true });
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    const [batches, ahpRuns, datasets, sawRuns, pub, logsRes] = await Promise.all([
      this.listResponseBatches(),
      this.listAhpRuns(),
      this.listAlternativeDatasets(),
      this.listSawRuns(),
      this.getCurrentPublication(),
      this.client
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const latestBatch = batches[0] ?? null;
    const latestAhpPrimary = ahpRuns.find((r) => r.mode === "consistent_only") ?? null;
    const latestDataset = datasets[0] ?? null;

    let activeAlts: AlternativeRecord[] = [];
    if (latestDataset) {
      const detail = await this.getAlternativeDataset(latestDataset.id);
      activeAlts = (detail?.alternatives ?? []).filter((a) => a.active);
    }

    const totalResponses = latestBatch?.rowCount ?? 0;
    const eligibleResponses = latestBatch?.eligibleCount ?? 0;
    const consistentResponses = latestAhpPrimary?.includedIds.length ?? 0;
    const inconsistentResponses = Math.max(0, eligibleResponses - consistentResponses);

    const recentAuditLogs: AuditLogRecord[] = ((logsRes.data ?? []) as Record<string, unknown>[]).map(
      (row) => ({
        id: String(row.id),
        actorId: row.actor_id ? String(row.actor_id) : null,
        action: String(row.action),
        resourceType: String(row.resource_type),
        resourceId: row.resource_id ? String(row.resource_id) : null,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        createdAt: String(row.created_at),
      }),
    );

    return {
      storageMode: "supabase",
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
      currentPublication: pub,
      recentAuditLogs,
    };
  }

  async listResponseBatches(): Promise<ResponseBatchRecord[]> {
    const { data, error } = await this.client
      .from("response_batches")
      .select("*")
      .order("imported_at", { ascending: false });
    if (error) throw new RepositoryError(500, "DB_ERROR", error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapBatch);
  }

  async getResponseBatch(batchId: string) {
    const { data: batchRow, error: bErr } = await this.client
      .from("response_batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (bErr) throw new RepositoryError(500, "DB_ERROR", bErr.message);
    if (!batchRow) return null;

    const { data: respRows, error: rErr } = await this.client
      .from("survey_responses")
      .select("*")
      .eq("batch_id", batchId)
      .order("row_no", { ascending: true });

    if (rErr) throw new RepositoryError(500, "DB_ERROR", rErr.message);
    return {
      batch: mapBatch(batchRow as Record<string, unknown>),
      responses: ((respRows ?? []) as Record<string, unknown>[]).map(mapSurveyResponse),
    };
  }

  async createResponseBatch(input: CreateResponseBatchInput): Promise<ResponseBatchRecord> {
    const { data: dup } = await this.client
      .from("response_batches")
      .select("id, filename, imported_at")
      .eq("sha256", input.sha256)
      .maybeSingle();

    if (dup) {
      throw new RepositoryError(
        409,
        "DUPLICATE_BATCH_HASH",
        `Berkas dengan SHA-256 yang sama sudah pernah diimpor sebelumnya ("${dup.filename}").`,
      );
    }

    await this.client
      .from("response_batches")
      .update({ status: "superseded" })
      .eq("status", "active");

    const { data: batchRow, error: batchErr } = await this.client
      .from("response_batches")
      .insert({
        filename: input.filename,
        sheet_name: input.sheetName,
        sha256: input.sha256,
        imported_by: input.importedBy,
        row_count: input.rows.length,
        eligible_count: input.rows.filter((r) => r.eligible).length,
        parent_batch_id: input.parentBatchId ?? null,
        status: "active",
        notes: input.notes ?? "",
      })
      .select("*")
      .single();

    if (batchErr || !batchRow) {
      throw new RepositoryError(
        batchErr?.code === "23505" ? 409 : 500,
        "BATCH_INSERT_FAILED",
        batchErr?.message ?? "Gagal menyimpan batch respons.",
      );
    }

    const batchId = String(batchRow.id);
    const { error: rowsErr } = await this.client.from("survey_responses").insert(
      input.rows.map((r) => ({
        batch_id: batchId,
        row_no: r.rowNo,
        code: r.code,
        raw_timestamp: r.rawTimestamp,
        submitted_at: r.submittedAt,
        consent: r.consentValid,
        active_student: r.activeStudentValid,
        program_study: r.programStudy,
        use_case: r.useCase,
        suggestion: r.suggestion,
        raw_answers: r.rawAnswers,
        parsed_answers: r.parsedAnswers,
        validation_status: r.validationStatus,
        validation_errors: r.validationErrors,
        audit_flags: r.auditFlags,
      })),
    );

    if (rowsErr) {
      // Roll back header batch on partial insert failure
      await this.client.from("response_batches").delete().eq("id", batchId);
      throw new RepositoryError(500, "RESPONSES_INSERT_FAILED", rowsErr.message);
    }

    return mapBatch(batchRow as Record<string, unknown>);
  }

  async listAlternativeDatasets(): Promise<AlternativeDatasetRecord[]> {
    const { data, error } = await this.client
      .from("alternative_datasets")
      .select("*")
      .order("version", { ascending: false });
    if (error) throw new RepositoryError(500, "DB_ERROR", error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapDataset);
  }

  async getAlternativeDataset(datasetId: string) {
    const { data: dsRow, error: dsErr } = await this.client
      .from("alternative_datasets")
      .select("*")
      .eq("id", datasetId)
      .maybeSingle();

    if (dsErr) throw new RepositoryError(500, "DB_ERROR", dsErr.message);
    if (!dsRow) return null;

    const { data: altRows, error: altErr } = await this.client
      .from("alternatives")
      .select("*, alternative_sources(*)")
      .eq("dataset_id", datasetId)
      .order("code", { ascending: true });

    if (altErr) throw new RepositoryError(500, "DB_ERROR", altErr.message);

    const alternatives = ((altRows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const rawSources = (row.alternative_sources ?? []) as Record<string, unknown>[];
      return mapAlternative(row, rawSources.map(mapSource));
    });

    return {
      dataset: mapDataset(dsRow as Record<string, unknown>),
      alternatives,
    };
  }

  async createAlternativeDataset(
    input: CreateAlternativeDatasetInput,
  ): Promise<AlternativeDatasetRecord> {
    const existing = await this.listAlternativeDatasets();
    const nextVersion = existing.reduce((max, d) => Math.max(max, d.version), 0) + 1;

    const { data: dsRow, error: dsErr } = await this.client
      .from("alternative_datasets")
      .insert({
        version: nextVersion,
        label: input.label || `Dataset Alternatif v${nextVersion}`,
        source_filename: input.sourceFilename,
        source_hash: input.sourceHash,
        observed_at: input.observedAt,
        created_by: input.createdBy,
        status: "draft",
        notes: input.notes ?? "",
      })
      .select("*")
      .single();

    if (dsErr || !dsRow) {
      throw new RepositoryError(500, "DATASET_CREATE_FAILED", dsErr?.message ?? "Gagal membuat dataset.");
    }

    const datasetId = String(dsRow.id);

    for (const alt of input.alternatives) {
      const { data: altRow, error: altErr } = await this.client
        .from("alternatives")
        .insert({
          dataset_id: datasetId,
          code: alt.code,
          brand: alt.brand,
          model: alt.model,
          sku: alt.sku,
          cpu_name: alt.cpuName,
          price_idr: alt.priceIdr,
          cpu_mark: alt.cpuMark,
          ram_gb: alt.ramGb,
          ssd_gb: alt.ssdGb,
          weight_kg: alt.weightKg,
          battery_hours: alt.batteryHours,
          battery_wh: alt.batteryWh,
          seller: alt.seller,
          active: alt.active,
          stock_status: alt.stockStatus,
          evidence_status: alt.evidenceStatus,
          battery_protocol: alt.batteryProtocol,
          evidence_notes: alt.evidenceNotes,
        })
        .select("id")
        .single();

      if (altErr || !altRow) {
        throw new RepositoryError(500, "ALT_INSERT_FAILED", altErr?.message ?? "Gagal menyimpan alternatif.");
      }

      if (alt.sources.length > 0) {
        const { error: srcErr } = await this.client.from("alternative_sources").insert(
          alt.sources.map((s) => ({
            alternative_id: String(altRow.id),
            source_type: s.sourceType,
            url: s.url,
            observed_at: s.observedAt,
            evidence_level: s.evidenceLevel,
            notes: s.notes,
          })),
        );
        if (srcErr) {
          throw new RepositoryError(500, "SRC_INSERT_FAILED", srcErr.message);
        }
      }
    }

    return mapDataset(dsRow as Record<string, unknown>);
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
      notes: `Digandakan dari v${source.dataset.version}.`,
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
    const dsDetail = await this.getAlternativeDataset(input.datasetId);
    if (!dsDetail) {
      throw new RepositoryError(404, "DATASET_NOT_FOUND", "Dataset alternatif tidak ditemukan.");
    }
    if (dsDetail.dataset.status === "sealed") {
      throw new RepositoryError(
        409,
        "DATASET_SEALED",
        "Dataset berstatus sealed tidak dapat diubah. Gandakan menjadi draft baru terlebih dahulu.",
      );
    }

    let altId = input.id;
    const payload = {
      dataset_id: input.datasetId,
      code: input.code,
      brand: input.brand,
      model: input.model,
      sku: input.sku,
      cpu_name: input.cpuName,
      price_idr: input.priceIdr,
      cpu_mark: input.cpuMark,
      ram_gb: input.ramGb,
      ssd_gb: input.ssdGb,
      weight_kg: input.weightKg,
      battery_hours: input.batteryHours,
      battery_wh: input.batteryWh,
      seller: input.seller,
      active: input.active,
      stock_status: input.stockStatus,
      evidence_status: input.evidenceStatus,
      battery_protocol: input.batteryProtocol,
      evidence_notes: input.evidenceNotes,
    };

    if (altId) {
      const { error } = await this.client
        .from("alternatives")
        .update(payload)
        .eq("id", altId)
        .eq("dataset_id", input.datasetId);
      if (error) {
        throw new RepositoryError(error.code === "23505" ? 409 : 500, "ALT_UPDATE_FAILED", error.message);
      }
      await this.client.from("alternative_sources").delete().eq("alternative_id", altId);
    } else {
      const { data, error } = await this.client
        .from("alternatives")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        throw new RepositoryError(error?.code === "23505" ? 409 : 500, "ALT_INSERT_FAILED", error?.message ?? "Gagal menambah alternatif.");
      }
      altId = String(data.id);
    }

    const { error: srcErr } = await this.client.from("alternative_sources").insert(
      input.sources.map((s) => ({
        alternative_id: altId,
        source_type: s.sourceType,
        url: s.url,
        observed_at: s.observedAt,
        evidence_level: s.evidenceLevel,
        notes: s.notes,
      })),
    );
    if (srcErr) throw new RepositoryError(500, "SRC_INSERT_FAILED", srcErr.message);

    const { data: fullRow, error: fetchErr } = await this.client
      .from("alternatives")
      .select("*, alternative_sources(*)")
      .eq("id", altId)
      .single();

    if (fetchErr || !fullRow) {
      throw new RepositoryError(500, "ALT_FETCH_FAILED", fetchErr?.message ?? "Gagal membaca alternatif tersimpan.");
    }

    const rec = fullRow as Record<string, unknown>;
    return mapAlternative(
      rec,
      ((rec.alternative_sources ?? []) as Record<string, unknown>[]).map(mapSource),
    );
  }

  async toggleAlternativeActive(
    alternativeId: string,
    active: boolean,
  ): Promise<AlternativeRecord> {
    const { data, error } = await this.client
      .from("alternatives")
      .update({ active })
      .eq("id", alternativeId)
      .select("*, alternative_sources(*)")
      .single();

    if (error || !data) {
      const status = error?.message.includes("sealed") ? 409 : 500;
      throw new RepositoryError(status, "ALT_TOGGLE_FAILED", error?.message ?? "Gagal mengubah status aktif.");
    }
    const rec = data as Record<string, unknown>;
    return mapAlternative(
      rec,
      ((rec.alternative_sources ?? []) as Record<string, unknown>[]).map(mapSource),
    );
  }

  async sealDataset(datasetId: string): Promise<void> {
    await this.client
      .from("alternative_datasets")
      .update({ status: "sealed" })
      .eq("id", datasetId);
  }

  async listAhpRuns(): Promise<AhpRunRecord[]> {
    const { data, error } = await this.client
      .from("ahp_runs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new RepositoryError(500, "DB_ERROR", error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapAhpRun);
  }

  async getAhpRunDetail(runId: string) {
    const { data: runRow, error: rErr } = await this.client
      .from("ahp_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    if (rErr) throw new RepositoryError(500, "DB_ERROR", rErr.message);
    if (!runRow) return null;

    const { data: indRows, error: iErr } = await this.client
      .from("ahp_individual_results")
      .select("*, survey_responses(code)")
      .eq("run_id", runId);

    if (iErr) throw new RepositoryError(500, "DB_ERROR", iErr.message);

    const individualResults: AhpIndividualResultRecord[] = (
      (indRows ?? []) as Array<Record<string, unknown>>
    )
      .map((row) => {
        const sr = row.survey_responses as { code?: string } | null;
        return {
          id: String(row.id),
          runId: String(row.run_id),
          responseId: String(row.response_id),
          responseCode: String(sr?.code ?? ""),
          matrix: (row.matrix ?? null) as AhpMatrix | null,
          weights: (row.weights ?? null) as number[] | null,
          lambdaMax: row.lambda_max === null ? null : Number(row.lambda_max),
          ci: row.ci === null ? null : Number(row.ci),
          ri: Number(row.ri),
          cr: row.cr === null ? null : Number(row.cr),
          passesCr: Boolean(row.passes_cr),
          eligible: Boolean(row.eligible),
          isAllEqual: Boolean(row.is_all_equal),
          nearZeroCrFlag: Boolean(row.near_zero_cr_flag),
          includedInMode: Boolean(row.included_in_mode),
          reason: String(row.reason ?? ""),
        };
      })
      .sort((a, b) => a.responseCode.localeCompare(b.responseCode, "en"));

    return { run: mapAhpRun(runRow as Record<string, unknown>), individualResults };
  }

  async saveAhpRun(params: {
    run: Omit<AhpRunRecord, "id" | "createdAt">;
    individualResults: Array<Omit<AhpIndividualResultRecord, "id" | "runId">>;
  }): Promise<AhpRunRecord> {
    const { data: runRow, error: runErr } = await this.client
      .from("ahp_runs")
      .insert({
        batch_id: params.run.batchId,
        mode: params.run.mode,
        algorithm_version: params.run.algorithmVersion,
        included_ids: params.run.includedIds,
        excluded_ids: params.run.excludedIds,
        aggregate_matrix: params.run.aggregateMatrix,
        weights: params.run.weights,
        lambda_max: params.run.lambdaMax,
        ci: params.run.ci,
        ri: params.run.ri,
        cr: params.run.cr,
        passes_cr: params.run.passesCr,
        iterations: params.run.iterations,
        target_count: params.run.targetCount,
        warnings: params.run.warnings,
        created_by: params.run.createdBy,
        status: params.run.status,
      })
      .select("*")
      .single();

    if (runErr || !runRow) {
      throw new RepositoryError(500, "AHP_SAVE_FAILED", runErr?.message ?? "Gagal menyimpan hasil AHP.");
    }

    const runId = String(runRow.id);
    const { error: indErr } = await this.client.from("ahp_individual_results").insert(
      params.individualResults.map((ir) => ({
        run_id: runId,
        response_id: ir.responseId,
        matrix: ir.matrix,
        weights: ir.weights,
        lambda_max: ir.lambdaMax,
        ci: ir.ci,
        ri: ir.ri,
        cr: ir.cr,
        passes_cr: ir.passesCr,
        eligible: ir.eligible,
        is_all_equal: ir.isAllEqual,
        near_zero_cr_flag: ir.nearZeroCrFlag,
        included_in_mode: ir.includedInMode,
        reason: ir.reason,
      })),
    );

    if (indErr) {
      await this.client.from("ahp_runs").delete().eq("id", runId);
      throw new RepositoryError(500, "AHP_IND_SAVE_FAILED", indErr.message);
    }

    return mapAhpRun(runRow as Record<string, unknown>);
  }

  async listSawRuns(): Promise<SawRunRecord[]> {
    const { data, error } = await this.client
      .from("saw_runs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new RepositoryError(500, "DB_ERROR", error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapSawRun);
  }

  async getSawRunDetail(runId: string) {
    const { data: runRow, error: rErr } = await this.client
      .from("saw_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (rErr) throw new RepositoryError(500, "DB_ERROR", rErr.message);
    if (!runRow) return null;

    const run = mapSawRun(runRow as Record<string, unknown>);
    const [ahpDetail, dsDetail, resQuery] = await Promise.all([
      this.getAhpRunDetail(run.ahpRunId),
      this.getAlternativeDataset(run.datasetId),
      this.client
        .from("saw_results")
        .select("*, alternatives(code, model)")
        .eq("run_id", runId)
        .order("rank", { ascending: true }),
    ]);

    if (!ahpDetail || !dsDetail || resQuery.error) return null;

    const results: SawResultRecord[] = (
      (resQuery.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const altRef = row.alternatives as { code?: string; model?: string } | null;
      return {
        id: String(row.id),
        runId: String(row.run_id),
        alternativeId: String(row.alternative_id),
        alternativeCode: String(altRef?.code ?? ""),
        alternativeModel: String(altRef?.model ?? ""),
        criteriaValues: row.criteria_values as CriteriaNumericVector,
        normalizedValues: row.normalized_values as CriteriaNumericVector,
        weightedValues: row.weighted_values as CriteriaNumericVector,
        score: Number(row.score),
        rank: Number(row.rank),
        isTied: Boolean(row.is_tied),
      };
    });

    return {
      run,
      results,
      ahpRun: ahpDetail.run,
      dataset: dsDetail.dataset,
      alternatives: dsDetail.alternatives,
    };
  }

  async saveSawRun(params: {
    run: Omit<SawRunRecord, "id" | "createdAt">;
    results: Array<Omit<SawResultRecord, "id" | "runId">>;
  }): Promise<SawRunRecord> {
    const { data: runRow, error: runErr } = await this.client
      .from("saw_runs")
      .insert({
        ahp_run_id: params.run.ahpRunId,
        dataset_id: params.run.datasetId,
        scenario: params.run.scenario,
        algorithm_version: params.run.algorithmVersion,
        input_snapshot: params.run.inputSnapshot,
        normalization_extrema: params.run.normalizationExtrema,
        top_margin: params.run.topMargin,
        warnings: params.run.warnings,
        caveats: params.run.caveats,
        created_by: params.run.createdBy,
        status: params.run.status,
      })
      .select("*")
      .single();

    if (runErr || !runRow) {
      throw new RepositoryError(500, "SAW_SAVE_FAILED", runErr?.message ?? "Gagal menyimpan hasil SAW.");
    }

    const runId = String(runRow.id);
    const { error: resErr } = await this.client.from("saw_results").insert(
      params.results.map((r) => ({
        run_id: runId,
        alternative_id: r.alternativeId,
        criteria_values: r.criteriaValues,
        normalized_values: r.normalizedValues,
        weighted_values: r.weightedValues,
        score: r.score,
        rank: r.rank,
        is_tied: r.isTied,
      })),
    );

    if (resErr) {
      await this.client.from("saw_runs").delete().eq("id", runId);
      throw new RepositoryError(500, "SAW_RES_SAVE_FAILED", resErr.message);
    }

    await this.sealDataset(params.run.datasetId);
    return mapSawRun(runRow as Record<string, unknown>);
  }

  async listPublications(): Promise<PublicationRecord[]> {
    const { data, error } = await this.client
      .from("publications")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) throw new RepositoryError(500, "DB_ERROR", error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapPublication);
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
    const { data: pubId, error } = await this.client.rpc("publish_snapshot_atomic", {
      p_saw_run_id: params.sawRunId,
      p_sensitivity_run_ids: params.sensitivityRunIds,
      p_public_payload: params.publicPayload,
      p_status: params.status,
      p_reviewed_by: params.reviewedBy,
      p_caveats: params.caveats,
      p_quality_review: params.qualityReview,
    });

    if (error || !pubId) {
      throw new RepositoryError(
        500,
        "PUBLISH_FAILED",
        error?.message ?? "Gagal mempublikasikan snapshot.",
      );
    }

    const { data: row } = await this.client
      .from("publications")
      .select("*")
      .eq("id", pubId)
      .single();

    return mapPublication(row as Record<string, unknown>);
  }

  async writeAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    await this.client.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      metadata: entry.metadata,
    });
  }
}
