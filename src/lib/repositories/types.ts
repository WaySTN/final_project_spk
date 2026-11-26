import type {
  AhpMatrix,
  AhpMode,
  C6MetricType,
  CriteriaNumericVector,
  CriterionCode,
  ParsedPairwiseAnswer,
  SawCriterionExtrema,
  SawScenarioKey,
  SensitivityRankRow,
  WeightSensitivitySuiteResult,
} from "@/lib/decision";
import type {
  AlternativeSourceType,
  EvidenceLevel,
  EvidenceStatus,
  ExcludedCandidateRecord,
  ParsedLaptopAlternative,
  ParsedSurveyRow,
  StockStatus,
  SurveyAuditFlag,
} from "@/lib/import";

export interface ResponseBatchRecord {
  id: string;
  filename: string;
  sheetName: string;
  sha256: string;
  importedBy: string | null;
  importedAt: string;
  rowCount: number;
  eligibleCount: number;
  parentBatchId: string | null;
  status: "active" | "superseded" | "archived";
  notes: string;
}

export interface SurveyResponseRecord {
  id: string;
  batchId: string;
  rowNo: number;
  code: string;
  rawTimestamp: string;
  submittedAt: string | null;
  consent: boolean;
  activeStudent: boolean;
  programStudy: string | null;
  useCase: string;
  suggestion: string | null;
  rawAnswers: Record<string, string>;
  parsedAnswers: ParsedPairwiseAnswer[];
  validationStatus: "eligible" | "ineligible_screening" | "invalid_answers";
  validationErrors: string[];
  auditFlags: SurveyAuditFlag[];
}

export interface AlternativeDatasetRecord {
  id: string;
  version: number;
  label: string;
  sourceFilename: string | null;
  sourceHash: string | null;
  observedAt: string;
  c6Metric: C6MetricType;
  c6Unit: "Wh" | "jam";
  c6Definition: string;
  candidateCount: number | null;
  excludedCandidates: ExcludedCandidateRecord[];
  createdBy: string | null;
  createdAt: string;
  status: "draft" | "sealed";
  notes: string;
}

export interface AlternativeSourceRecord {
  id: string;
  alternativeId: string;
  sourceType: AlternativeSourceType;
  url: string;
  observedAt: string;
  evidenceLevel: EvidenceLevel;
  notes: string;
}

export interface AlternativeRecord {
  id: string;
  datasetId: string;
  code: string;
  brand: string;
  model: string;
  sku: string;
  cpuName: string;
  priceIdr: number;
  cpuMark: number;
  ramGb: number;
  ssdGb: number;
  weightKg: number;
  batteryHours: number | null;
  batteryWh: number | null;
  seller: string;
  active: boolean;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
  sourceDateRecorded: string;
  sourceStatusRecorded: string;
  selectionReason: string;
  createdAt: string;
  sources: AlternativeSourceRecord[];
}

export interface AhpRunRecord {
  id: string;
  batchId: string;
  mode: AhpMode;
  algorithmVersion: string;
  includedIds: string[];
  excludedIds: string[];
  aggregateMatrix: AhpMatrix;
  weights: number[];
  weightsByCode: Record<CriterionCode, number>;
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  passesCr: boolean;
  iterations: number;
  targetCount: number;
  warnings: string[];
  createdAt: string;
  createdBy: string | null;
  status: "completed" | "failed";
}

export interface AhpIndividualResultRecord {
  id: string;
  runId: string;
  responseId: string;
  responseCode: string;
  matrix: AhpMatrix | null;
  weights: number[] | null;
  lambdaMax: number | null;
  ci: number | null;
  ri: number;
  cr: number | null;
  passesCr: boolean;
  eligible: boolean;
  isAllEqual: boolean;
  nearZeroCrFlag: boolean;
  includedInMode: boolean;
  reason: string;
}

export interface SawRunRecord {
  id: string;
  ahpRunId: string;
  datasetId: string;
  scenario: SawScenarioKey;
  c6Metric: C6MetricType;
  c6Unit: "Wh" | "jam";
  algorithmVersion: string;
  inputSnapshot: {
    ahpMode: AhpMode;
    weights: number[];
    weightsByCode: Record<CriterionCode, number>;
    alternativeIds: string[];
    alternativeCodes: string[];
    observedAt: string;
    datasetVersion: number;
    c6Metric?: C6MetricType;
    c6Unit?: "Wh" | "jam";
  };
  normalizationExtrema: Record<CriterionCode, SawCriterionExtrema>;
  weightSensitivity?: WeightSensitivitySuiteResult | null;
  topMargin: number | null;
  warnings: string[];
  caveats: string[];
  createdAt: string;
  createdBy: string | null;
  status: "completed" | "failed";
}

export interface SawResultRecord {
  id: string;
  runId: string;
  alternativeId: string;
  alternativeCode: string;
  alternativeModel: string;
  criteriaValues: CriteriaNumericVector;
  normalizedValues: CriteriaNumericVector;
  weightedValues: CriteriaNumericVector;
  score: number;
  rank: number;
  isTied: boolean;
}

export interface QualityReviewChecklist {
  primaryRuleVerified: boolean;
  sourcesAndSkuReviewed: boolean;
  responseIndependenceConfirmed: boolean;
  stockOrArchivalScopeRecorded: boolean;
  caveatsAcknowledged: boolean;
  methodologyExceptionNote?: string;
}

export interface PublicLaptopRankingItem {
  code: string;
  brand: string;
  model: string;
  sku: string;
  cpuName: string;
  priceIdr: number;
  cpuMark: number;
  ramGb: number;
  ssdGb: number;
  weightKg: number;
  batteryHours: number | null;
  batteryWh: number | null;
  seller: string;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
  sourceDateRecorded?: string;
  sourceStatusRecorded?: string;
  sources: Array<{
    sourceType: AlternativeSourceType;
    url: string;
    observedAt: string;
    evidenceLevel: EvidenceLevel;
    notes: string;
  }>;
  criteriaValues: CriteriaNumericVector;
  normalizedValues: CriteriaNumericVector;
  weightedValues: CriteriaNumericVector;
  score: number;
  rank: number;
  isTied: boolean;
}

export interface PublicRecommendationPayload {
  schemaVersion: "1.0" | "2.0";
  publicationStatus: "provisional" | "final";
  observedAt: string;
  publishedAt: string;
  bannerText: string;
  caveats: string;
  scenario: SawScenarioKey;
  scenarioLabel: string;
  c6Metric?: C6MetricType;
  c6Unit?: "Wh" | "jam";
  researchSummary: {
    totalResponses: number;
    eligibleResponses: number;
    consistentResponses: number;
    inconsistentResponses: number;
    alternativeCount: number;
    brandCount?: number;
    brands?: string[];
    candidateCount?: number;
    excludedCandidateCount?: number;
    useCaseBreakdown: Array<{ label: string; count: number; percentage: number }>;
  };
  ahp: {
    algorithmVersion: string;
    mode: AhpMode;
    lambdaMax: number;
    ci: number;
    ri: number;
    cr: number;
    passesCr: boolean;
    aggregateMatrix: AhpMatrix;
    weights: number[];
    weightsByCode: Record<CriterionCode, number>;
    warnings: string[];
  };
  saw: {
    runId: string;
    algorithmVersion: string;
    c6Metric?: C6MetricType;
    c6Unit?: "Wh" | "jam";
    extrema: Record<CriterionCode, SawCriterionExtrema>;
    topMargin: number | null;
    warnings: string[];
    caveats: string[];
    items: PublicLaptopRankingItem[];
  };
  sensitivity: {
    allEligibleCr: number | null;
    allEligibleWeightsByCode: Record<CriterionCode, number> | null;
    rankComparison: SensitivityRankRow[];
    notes: string[];
  };
  weightSensitivity?: WeightSensitivitySuiteResult | null;
}

export interface PublicationRecord {
  id: string;
  sawRunId: string;
  sensitivityRunIds: string[];
  publicPayload: PublicRecommendationPayload;
  status: "provisional" | "final" | "archived";
  isCurrent: boolean;
  reviewedBy: string | null;
  publishedAt: string;
  caveats: string;
  qualityReview: QualityReviewChecklist;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminOverviewStats {
  storageMode: "supabase" | "local_test" | "unconfigured";
  latestBatch: ResponseBatchRecord | null;
  totalResponses: number;
  eligibleResponses: number;
  consistentResponses: number;
  inconsistentResponses: number;
  latestAhpPrimary: AhpRunRecord | null;
  latestDataset: AlternativeDatasetRecord | null;
  activeAlternativesCount: number;
  verifiedEvidenceCount: number;
  withdrawnCount: number;
  latestSawRun: SawRunRecord | null;
  currentPublication: PublicationRecord | null;
  recentAuditLogs: AuditLogRecord[];
}

export interface CreateResponseBatchInput {
  filename: string;
  sheetName: string;
  sha256: string;
  importedBy: string | null;
  parentBatchId?: string | null;
  notes?: string;
  rows: ParsedSurveyRow[];
}

export interface CreateAlternativeDatasetInput {
  label: string;
  sourceFilename: string | null;
  sourceHash: string | null;
  observedAt: string;
  c6Metric?: C6MetricType;
  c6Unit?: "Wh" | "jam";
  c6Definition?: string;
  candidateCount?: number | null;
  excludedCandidates?: ExcludedCandidateRecord[];
  createdBy: string | null;
  notes?: string;
  alternatives: Array<
    Omit<
      ParsedLaptopAlternative,
      | "rowNo"
      | "validationErrors"
      | "eligible"
      | "sourceDateRecorded"
      | "sourceStatusRecorded"
      | "selectionReason"
    > & {
      sourceDateRecorded?: string;
      sourceStatusRecorded?: string;
      selectionReason?: string;
    }
  >;
}

export interface UpsertAlternativeInput {
  id?: string;
  datasetId: string;
  code: string;
  brand: string;
  model: string;
  sku: string;
  cpuName: string;
  priceIdr: number;
  cpuMark: number;
  ramGb: number;
  ssdGb: number;
  weightKg: number;
  batteryHours: number | null;
  batteryWh: number | null;
  seller: string;
  active: boolean;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
  sourceDateRecorded?: string;
  sourceStatusRecorded?: string;
  selectionReason?: string;
  sources: Array<{
    sourceType: AlternativeSourceType;
    url: string;
    observedAt: string;
    evidenceLevel: EvidenceLevel;
    notes: string;
  }>;
}

export class RepositoryError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "RepositoryError";
    this.status = status;
    this.code = code;
  }
}

export interface DataRepository {
  readonly mode: "supabase" | "local_test" | "unconfigured";

  // Public read
  getCurrentPublication(): Promise<PublicationRecord | null>;

  // Overview
  getAdminOverview(): Promise<AdminOverviewStats>;

  // Survey batches & responses
  listResponseBatches(): Promise<ResponseBatchRecord[]>;
  getResponseBatch(batchId: string): Promise<{
    batch: ResponseBatchRecord;
    responses: SurveyResponseRecord[];
  } | null>;
  createResponseBatch(input: CreateResponseBatchInput): Promise<ResponseBatchRecord>;

  // Alternative datasets & alternatives
  listAlternativeDatasets(): Promise<AlternativeDatasetRecord[]>;
  getAlternativeDataset(datasetId: string): Promise<{
    dataset: AlternativeDatasetRecord;
    alternatives: AlternativeRecord[];
  } | null>;
  createAlternativeDataset(input: CreateAlternativeDatasetInput): Promise<AlternativeDatasetRecord>;
  duplicateDatasetToDraft(
    sourceDatasetId: string,
    actorId: string | null,
    label?: string,
  ): Promise<AlternativeDatasetRecord>;
  upsertDraftAlternative(input: UpsertAlternativeInput): Promise<AlternativeRecord>;
  toggleAlternativeActive(
    alternativeId: string,
    active: boolean,
  ): Promise<AlternativeRecord>;
  sealDataset(datasetId: string): Promise<void>;

  // AHP runs
  listAhpRuns(): Promise<AhpRunRecord[]>;
  getAhpRunDetail(runId: string): Promise<{
    run: AhpRunRecord;
    individualResults: AhpIndividualResultRecord[];
  } | null>;
  saveAhpRun(params: {
    run: Omit<AhpRunRecord, "id" | "createdAt">;
    individualResults: Array<Omit<AhpIndividualResultRecord, "id" | "runId">>;
  }): Promise<AhpRunRecord>;

  // SAW runs
  listSawRuns(): Promise<SawRunRecord[]>;
  getSawRunDetail(runId: string): Promise<{
    run: SawRunRecord;
    results: SawResultRecord[];
    ahpRun: AhpRunRecord;
    dataset: AlternativeDatasetRecord;
    alternatives: AlternativeRecord[];
  } | null>;
  saveSawRun(params: {
    run: Omit<SawRunRecord, "id" | "createdAt">;
    results: Array<Omit<SawResultRecord, "id" | "runId">>;
  }): Promise<SawRunRecord>;

  // Publications
  listPublications(): Promise<PublicationRecord[]>;
  publishSnapshot(params: {
    sawRunId: string;
    sensitivityRunIds: string[];
    publicPayload: PublicRecommendationPayload;
    status: "provisional" | "final";
    reviewedBy: string | null;
    caveats: string;
    qualityReview: QualityReviewChecklist;
  }): Promise<PublicationRecord>;

  // Audit logs
  writeAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void>;
}
