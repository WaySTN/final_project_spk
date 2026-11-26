export type CriterionCode = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export type CriterionAttribute = "cost" | "benefit";

export type C6MetricType = "battery_wh" | "battery_hours";

export type AllowedScaleToken =
  | "1"
  | "3"
  | "5"
  | "7"
  | "9"
  | "1/3"
  | "1/5"
  | "1/7"
  | "1/9";

export interface AcademicReference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi: string;
  usageContext: string;
}

export interface CriterionDefinition {
  code: CriterionCode;
  ordinal: number;
  name: string;
  shortName: string;
  unit: string;
  attribute: CriterionAttribute;
  definition: string;
  measurementSource: string;
  notes: string;
  referenceIds: string[];
}

export interface PairwiseDefinition {
  questionNo: number;
  pairKey: `${CriterionCode}:${CriterionCode}`;
  rowIndex: number;
  colIndex: number;
  leftCode: CriterionCode;
  rightCode: CriterionCode;
  leftLabel: string;
  rightLabel: string;
  expectedHeader: string;
}

export interface ParsedPairwiseAnswer {
  questionNo: number;
  pairKey: `${CriterionCode}:${CriterionCode}`;
  rawText: string;
  token: AllowedScaleToken;
  numericValue: number;
  labelWarning: string | null;
}

export type AhpMatrix = number[][];

export interface AhpIndividualInput {
  id: string;
  code: string;
  eligible: boolean;
  ineligibleReason?: string | null;
  values: number[];
}

export interface AhpEigenResult {
  weights: number[];
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  iterations: number;
}

export interface AhpIndividualResult {
  id: string;
  code: string;
  eligible: boolean;
  matrix: AhpMatrix | null;
  weights: number[] | null;
  lambdaMax: number | null;
  ci: number | null;
  ri: number;
  cr: number | null;
  passesCr: boolean;
  iterations: number | null;
  isAllEqual: boolean;
  nearZeroCrFlag: boolean;
  includedInMode: boolean;
  reason: string;
}

export type AhpMode = "consistent_only" | "all_eligible";

export interface AhpGroupResult {
  algorithmVersion: string;
  mode: AhpMode;
  totalCount: number;
  eligibleCount: number;
  consistentCount: number;
  inconsistentCount: number;
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
  targetConsistentCount: number;
  warnings: string[];
  individualResults: AhpIndividualResult[];
}

export interface CriteriaNumericVector {
  C1: number;
  C2: number;
  C3: number;
  C4: number;
  C5: number;
  C6: number;
}

export interface SawAlternativeMetricInput {
  id: string;
  code: string;
  model: string;
  sku?: string;
  criteria: CriteriaNumericVector;
}

export interface SawCriterionExtrema {
  code: CriterionCode;
  attribute: CriterionAttribute;
  extremaType: "min" | "max";
  value: number;
  minValue: number;
  maxValue: number;
  isConstant: boolean;
}

export type SawScenarioKey =
  | "primary_33_consistent"
  | "sensitivity_33_all"
  | "primary_7_consistent"
  | "sensitivity_7_all"
  | "sensitivity_5_no_a6_a7"
  | "custom";

export interface SawAlternativeResult {
  alternativeId: string;
  code: string;
  model: string;
  criteriaValues: CriteriaNumericVector;
  normalizedValues: CriteriaNumericVector;
  weightedValues: CriteriaNumericVector;
  score: number;
  rank: number;
  isTied: boolean;
}

export interface SawRunOutput {
  algorithmVersion: string;
  scenario: SawScenarioKey;
  c6Metric: C6MetricType;
  c6Unit: string;
  ahpMode?: AhpMode;
  alternativeCount: number;
  weights: number[];
  weightsByCode: Record<CriterionCode, number>;
  extrema: Record<CriterionCode, SawCriterionExtrema>;
  results: SawAlternativeResult[];
  topMargin: number | null;
  warnings: string[];
  caveats: string[];
}

export interface SensitivityRankRow {
  code: string;
  model: string;
  rankPrimary: number | null;
  scorePrimary: number | null;
  rankAllEligible: number | null;
  scoreAllEligible: number | null;
  rankWithoutA6A7: number | null;
  scoreWithoutA6A7: number | null;
}

export interface SensitivitySuiteResult {
  ahpPrimary: AhpGroupResult;
  ahpAllEligible: AhpGroupResult;
  sawPrimary: SawRunOutput;
  sawAllEligible: SawRunOutput;
  sawWithoutA6A7: SawRunOutput | null;
  rankComparison: SensitivityRankRow[];
  notes: string[];
}

export interface WeightSensitivityAlternativeEntry {
  code: string;
  model: string;
  score: number;
  rank: number;
  baselineScore: number;
  baselineRank: number;
  /** Positive means moved UP in rank (e.g., from #2 to #1 = +1). */
  rankDelta: number;
  scoreDelta: number;
  isTied: boolean;
}

export interface WeightSensitivityScenarioResult {
  label: string;
  criterion: CriterionCode | null;
  relativeDelta: number;
  baseWeights: number[];
  baseWeightsByCode: Record<CriterionCode, number>;
  weights: number[];
  weightsByCode: Record<CriterionCode, number>;
  weightSum: number;
  winnerCode: string;
  winnerModel: string;
  maxScore: number;
  winnerChangedFromBaseline: boolean;
  results: WeightSensitivityAlternativeEntry[];
}

export interface WeightSensitivitySuiteResult {
  baselineWinnerCode: string;
  baselineWinnerModel: string;
  baselineWinnerScore: number;
  deltas: readonly number[];
  totalScenarios: number;
  perturbedScenarioCount: number;
  baselineWinnerWinsCount: number;
  baselineWinnerStabilityPct: number;
  winnerCounts: Array<{ code: string; model: string; count: number; percentage: number }>;
  winnerChangeScenarios: Array<{
    label: string;
    criterion: CriterionCode;
    relativeDelta: number;
    winnerCode: string;
    winnerModel: string;
    maxScore: number;
  }>;
  scenarios: WeightSensitivityScenarioResult[];
}
