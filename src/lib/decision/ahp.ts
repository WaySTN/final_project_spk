import {
  AHP_CR_FLOAT_EPSILON,
  AHP_CR_THRESHOLD,
  AHP_EIGEN_MAX_ITERATIONS,
  AHP_EIGEN_TOLERANCE,
  AHP_RI_6,
  ALGORITHM_VERSION,
  CRITERIA_COUNT,
  CRITERION_CODES,
  RESEARCH_TARGET_CONSISTENT_COUNT,
} from "./criteria";
import { PAIRWISE_DEFINITIONS } from "./pairs";
import type {
  AhpEigenResult,
  AhpGroupResult,
  AhpIndividualInput,
  AhpIndividualResult,
  AhpMatrix,
  AhpMode,
  CriterionCode,
} from "./types";

export class AhpComputationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AhpComputationError";
    this.code = code;
  }
}

/**
 * Builds a 6x6 positive reciprocal matrix from 15 upper-triangle pairwise ratios.
 */
export function buildPairwiseMatrix(upperTriangleValues: readonly number[]): AhpMatrix {
  if (upperTriangleValues.length !== PAIRWISE_DEFINITIONS.length) {
    throw new AhpComputationError(
      "INVALID_PAIR_COUNT",
      `Jumlah nilai perbandingan harus tepat ${PAIRWISE_DEFINITIONS.length}, diterima ${upperTriangleValues.length}.`,
    );
  }

  const matrix: AhpMatrix = Array.from({ length: CRITERIA_COUNT }, (_, i) =>
    Array.from({ length: CRITERIA_COUNT }, (__, j) => (i === j ? 1 : 0)),
  );

  for (let idx = 0; idx < PAIRWISE_DEFINITIONS.length; idx++) {
    const def = PAIRWISE_DEFINITIONS[idx]!;
    const value = upperTriangleValues[idx];

    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      throw new AhpComputationError(
        "INVALID_PAIR_VALUE",
        `Nilai perbandingan pada pasangan ${def.pairKey} harus bilangan positif berhingga.`,
      );
    }

    matrix[def.rowIndex]![def.colIndex] = value;
    matrix[def.colIndex]![def.rowIndex] = 1 / value;
  }

  return matrix;
}

function validateMatrix(matrix: AhpMatrix): void {
  if (matrix.length !== CRITERIA_COUNT) {
    throw new AhpComputationError(
      "INVALID_MATRIX_DIMENSION",
      `Dimensi matriks AHP harus ${CRITERIA_COUNT}x${CRITERIA_COUNT}.`,
    );
  }

  for (let i = 0; i < CRITERIA_COUNT; i++) {
    const row = matrix[i];
    if (!row || row.length !== CRITERIA_COUNT) {
      throw new AhpComputationError(
        "INVALID_MATRIX_DIMENSION",
        `Baris ${i + 1} matriks AHP tidak memiliki ${CRITERIA_COUNT} kolom.`,
      );
    }

    for (let j = 0; j < CRITERIA_COUNT; j++) {
      const val = row[j]!;
      if (!Number.isFinite(val) || val <= 0) {
        throw new AhpComputationError(
          "INVALID_MATRIX_ENTRY",
          `Elemen matriks (${i + 1}, ${j + 1}) harus positif berhingga.`,
        );
      }
      if (i === j && Math.abs(val - 1) > 1e-12) {
        throw new AhpComputationError(
          "INVALID_MATRIX_DIAGONAL",
          `Elemen diagonal (${i + 1}, ${i + 1}) harus bernilai 1.`,
        );
      }
    }
  }
}

/**
 * Computes the principal right eigenvector of a positive reciprocal 6x6 AHP matrix
 * using power iteration, plus lambdaMax, CI, RI (1.24), and CR without intermediate rounding.
 */
export function computePrincipalEigenvector(
  matrix: AhpMatrix,
  options?: { tolerance?: number; maxIterations?: number },
): AhpEigenResult {
  validateMatrix(matrix);

  const tolerance = options?.tolerance ?? AHP_EIGEN_TOLERANCE;
  const maxIterations = options?.maxIterations ?? AHP_EIGEN_MAX_ITERATIONS;
  const n = CRITERIA_COUNT;

  let weights: number[] = Array.from({ length: n }, () => 1 / n);
  let converged = false;
  let iterations = 0;

  for (let iter = 1; iter <= maxIterations; iter++) {
    iterations = iter;
    const product: number[] = new Array<number>(n).fill(0);
    let sum = 0;

    for (let i = 0; i < n; i++) {
      const row = matrix[i]!;
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += row[j]! * weights[j]!;
      }
      if (!Number.isFinite(rowSum) || rowSum <= 0) {
        throw new AhpComputationError(
          "EIGEN_NUMERIC_ERROR",
          "Hasil perkalian matriks tidak berhingga atau tidak positif pada power iteration.",
        );
      }
      product[i] = rowSum;
      sum += rowSum;
    }

    if (!Number.isFinite(sum) || sum <= 0) {
      throw new AhpComputationError(
        "EIGEN_NUMERIC_ERROR",
        "Jumlah komponen vektor tidak valid pada power iteration.",
      );
    }

    let maxDelta = 0;
    const nextWeights: number[] = new Array<number>(n);

    for (let i = 0; i < n; i++) {
      const nextVal = product[i]! / sum;
      if (!Number.isFinite(nextVal) || nextVal <= 0) {
        throw new AhpComputationError(
          "EIGEN_NUMERIC_ERROR",
          "Komponen vektor eigen tidak positif atau tidak berhingga.",
        );
      }
      nextWeights[i] = nextVal;
      const delta = Math.abs(nextVal - weights[i]!);
      if (delta > maxDelta) {
        maxDelta = delta;
      }
    }

    weights = nextWeights;

    if (maxDelta < tolerance) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    throw new AhpComputationError(
      "EIGEN_NON_CONVERGENT",
      `Power iteration tidak konvergen setelah ${maxIterations} iterasi (toleransi ${tolerance}).`,
    );
  }

  // Compute lambdaMax = mean((A * w)[i] / w[i])
  let ratioSum = 0;
  for (let i = 0; i < n; i++) {
    const row = matrix[i]!;
    let aw = 0;
    for (let j = 0; j < n; j++) {
      aw += row[j]! * weights[j]!;
    }
    const ratio = aw / weights[i]!;
    if (!Number.isFinite(ratio) || ratio <= 0) {
      throw new AhpComputationError(
        "LAMBDA_NUMERIC_ERROR",
        "Perhitungan lambda maksimum menghasilkan nilai tidak valid.",
      );
    }
    ratioSum += ratio;
  }

  const lambdaMax = ratioSum / n;
  const ciRaw = (lambdaMax - n) / (n - 1);

  let ci: number;
  if (ciRaw < 0) {
    if (Math.abs(ciRaw) < 1e-12) {
      ci = 0;
    } else {
      throw new AhpComputationError(
        "NEGATIVE_CI",
        `Consistency Index bernilai negatif signifikan (${ciRaw}). Periksa sifat resiprokal matriks.`,
      );
    }
  } else {
    ci = ciRaw;
  }

  const cr = ci / AHP_RI_6;

  return {
    weights,
    lambdaMax,
    ci,
    ri: AHP_RI_6,
    cr,
    iterations,
  };
}

/**
 * Evaluates a single respondent's 15 pairwise answers and checks CR <= 0.10.
 */
export function evaluateIndividualAhp(
  input: AhpIndividualInput,
  mode: AhpMode = "consistent_only",
): AhpIndividualResult {
  if (!input.eligible) {
    return {
      id: input.id,
      code: input.code,
      eligible: false,
      matrix: null,
      weights: null,
      lambdaMax: null,
      ci: null,
      ri: AHP_RI_6,
      cr: null,
      passesCr: false,
      iterations: null,
      isAllEqual: false,
      nearZeroCrFlag: false,
      includedInMode: false,
      reason: input.ineligibleReason ?? "Tidak memenuhi syarat kelayakan responden.",
    };
  }

  const matrix = buildPairwiseMatrix(input.values);
  const eigen = computePrincipalEigenvector(matrix);
  const passesCr = eigen.cr <= AHP_CR_THRESHOLD + AHP_CR_FLOAT_EPSILON;
  const isAllEqual = input.values.every((v) => Math.abs(v - 1) <= 1e-12);
  const nearZeroCrFlag = eigen.cr < 1e-9 && !isAllEqual;

  const includedInMode = mode === "all_eligible" ? true : passesCr;
  let reason: string;
  if (passesCr) {
    if (isAllEqual) {
      reason = "Lolos CR ≤ 0,10 (seluruh perbandingan bernilai 1 / sama penting; sah secara matematis).";
    } else if (nearZeroCrFlag) {
      reason = "Lolos CR ≤ 0,10 (CR mendekati 0; disarankan verifikasi independensi respons).";
    } else {
      reason = "Lolos CR ≤ 0,10.";
    }
  } else if (mode === "all_eligible") {
    reason = `CR > 0,10 (${eigen.cr.toFixed(6)}); tetap disertakan hanya pada skenario sensitivitas seluruh respons.`;
  } else {
    reason = `CR melebihi ambang 0,10 (${eigen.cr.toFixed(6)}); tidak disertakan pada skenario utama.`;
  }

  return {
    id: input.id,
    code: input.code,
    eligible: true,
    matrix,
    weights: eigen.weights,
    lambdaMax: eigen.lambdaMax,
    ci: eigen.ci,
    ri: eigen.ri,
    cr: eigen.cr,
    passesCr,
    iterations: eigen.iterations,
    isAllEqual,
    nearZeroCrFlag,
    includedInMode,
    reason,
  };
}

/**
 * Aggregates individual pairwise matrices using Aggregation of Individual Judgments (AIJ)
 * via geometric mean exp(mean(log(a_ij))), preserving exact diagonal = 1 and reciprocity.
 */
export function aggregateMatricesAIJ(matrices: readonly AhpMatrix[]): AhpMatrix {
  if (matrices.length === 0) {
    throw new AhpComputationError(
      "EMPTY_AGGREGATION_SET",
      "Tidak dapat menghitung matriks gabungan karena tidak ada matriks responden yang dipilih.",
    );
  }

  for (const m of matrices) {
    validateMatrix(m);
  }

  const n = CRITERIA_COUNT;
  const aggregate: AhpMatrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)),
  );

  const count = matrices.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let logSum = 0;
      for (let k = 0; k < count; k++) {
        const val = matrices[k]![i]![j]!;
        logSum += Math.log(val);
      }
      const geoMean = Math.exp(logSum / count);
      aggregate[i]![j] = geoMean;
      aggregate[j]![i] = 1 / geoMean;
    }
  }

  return aggregate;
}

export function weightsArrayToRecord(weights: readonly number[]): Record<CriterionCode, number> {
  if (weights.length !== CRITERIA_COUNT) {
    throw new AhpComputationError(
      "INVALID_WEIGHT_LENGTH",
      `Jumlah bobot harus ${CRITERIA_COUNT}, diterima ${weights.length}.`,
    );
  }

  const record = {} as Record<CriterionCode, number>;
  for (let i = 0; i < CRITERIA_COUNT; i++) {
    record[CRITERION_CODES[i]!] = weights[i]!;
  }
  return record;
}

/**
 * Executes complete AHP pipeline: individual evaluation, mode filtering, AIJ geometric aggregation,
 * group principal eigenvector, and group CR verification.
 */
export function runAhpGroup(
  inputs: readonly AhpIndividualInput[],
  mode: AhpMode = "consistent_only",
): AhpGroupResult {
  if (inputs.length === 0) {
    throw new AhpComputationError(
      "EMPTY_RESPONSES",
      "Tidak ada data responden untuk dihitung.",
    );
  }

  const individualResults = inputs.map((item) => evaluateIndividualAhp(item, mode));

  const eligibleResults = individualResults.filter((r) => r.eligible);
  const consistentResults = eligibleResults.filter((r) => r.passesCr);
  const inconsistentResults = eligibleResults.filter((r) => !r.passesCr);
  const selectedResults = individualResults.filter(
    (r): r is AhpIndividualResult & { matrix: AhpMatrix } =>
      r.includedInMode && r.matrix !== null,
  );

  if (selectedResults.length === 0) {
    throw new AhpComputationError(
      "NO_QUALIFYING_RESPONSES",
      mode === "consistent_only"
        ? "Tidak ada responden eligible yang memenuhi ambang konsistensi CR ≤ 0,10. Perhitungan SAW diblokir."
        : "Tidak ada responden eligible untuk dihitung.",
    );
  }

  const aggregateMatrix = aggregateMatricesAIJ(selectedResults.map((r) => r.matrix));
  const groupEigen = computePrincipalEigenvector(aggregateMatrix);
  const passesCr = groupEigen.cr <= AHP_CR_THRESHOLD + AHP_CR_FLOAT_EPSILON;

  const warnings: string[] = [];

  if (mode === "all_eligible" && inconsistentResults.length > 0) {
    warnings.push(
      `Skenario sensitivitas ini menyertakan ${inconsistentResults.length} respons dengan CR individual > 0,10; hanya digunakan sebagai pembanding, bukan bobot utama.`,
    );
  }

  if (mode === "consistent_only" && selectedResults.length < RESEARCH_TARGET_CONSISTENT_COUNT) {
    warnings.push(
      `Jumlah respons konsisten (${selectedResults.length}) di bawah target praktis panel penelitian (${RESEARCH_TARGET_CONSISTENT_COUNT}). Dokumentasikan pengecualian metodologi secara eksplisit.`,
    );
  }

  if (!passesCr) {
    warnings.push(
      `Matriks gabungan tidak konsisten (CR = ${groupEigen.cr.toFixed(6)} > 0,10). Publikasi rekomendasi utama harus diblokir.`,
    );
  }

  const nearZeroCount = selectedResults.filter((r) => r.nearZeroCrFlag).length;
  if (nearZeroCount > 0) {
    warnings.push(
      `Terdapat ${nearZeroCount} respons terpilih dengan CR mendekati nol. Nilai CR rendah hanya menunjukkan konsistensi matematis, bukan bukti keaslian/independensi respons.`,
    );
  }

  const allEqualCount = selectedResults.filter((r) => r.isAllEqual).length;
  if (allEqualCount > 0) {
    warnings.push(
      `Terdapat ${allEqualCount} respons bernilai sama penting di seluruh 15 pasangan (all-equal); tetap dipertahankan karena sah secara matematis.`,
    );
  }

  const includedSet = new Set(selectedResults.map((r) => r.id));
  const includedIds = selectedResults.map((r) => r.id);
  const excludedIds = individualResults
    .filter((r) => !includedSet.has(r.id))
    .map((r) => r.id);

  return {
    algorithmVersion: ALGORITHM_VERSION,
    mode,
    totalCount: inputs.length,
    eligibleCount: eligibleResults.length,
    consistentCount: consistentResults.length,
    inconsistentCount: inconsistentResults.length,
    includedIds,
    excludedIds,
    aggregateMatrix,
    weights: groupEigen.weights,
    weightsByCode: weightsArrayToRecord(groupEigen.weights),
    lambdaMax: groupEigen.lambdaMax,
    ci: groupEigen.ci,
    ri: groupEigen.ri,
    cr: groupEigen.cr,
    passesCr,
    iterations: groupEigen.iterations,
    targetConsistentCount: RESEARCH_TARGET_CONSISTENT_COUNT,
    warnings,
    individualResults,
  };
}
