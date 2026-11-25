"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CRITERIA,
  type CriteriaNumericVector,
  type CriterionCode,
} from "@/lib/decision";
import { formatDecimal } from "@/lib/formatting";

export interface WeightChartProps {
  weightsByCode: Record<CriterionCode, number>;
  comparisonWeightsByCode?: Record<CriterionCode, number> | null;
  primaryLabel?: string;
  comparisonLabel?: string;
}

export function CriteriaWeightsChart({
  weightsByCode,
  comparisonWeightsByCode,
  primaryLabel = "17 Responden Konsisten (Utama)",
  comparisonLabel = "33 Responden Eligible (Sensitivitas)",
}: WeightChartProps) {
  const data = CRITERIA.map((c) => ({
    code: c.code,
    label: `${c.code} ${c.shortName}`,
    primary: Number((weightsByCode[c.code] * 100).toFixed(2)),
    ...(comparisonWeightsByCode
      ? { comparison: Number((comparisonWeightsByCode[c.code] * 100).toFixed(2)) }
      : {}),
  }));

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Grafik batang perbandingan bobot kriteria AHP dalam persentase"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#52525b", fontSize: 12 }}
            axisLine={{ stroke: "#d4d4d8" }}
            tickLine={false}
          />
          <YAxis
            unit="%"
            tick={{ fill: "#52525b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 30]}
          />
          <Tooltip
            formatter={(val) => `${formatDecimal(Number(val ?? 0), 2)}%`}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          {comparisonWeightsByCode && <Legend wrapperStyle={{ fontSize: "12px" }} />}
          <Bar
            dataKey="primary"
            name={primaryLabel}
            fill="#18181b"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
          {comparisonWeightsByCode && (
            <Bar
              dataKey="comparison"
              name={comparisonLabel}
              fill="#a1a1aa"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface SawContributionItem {
  code: string;
  model: string;
  score: number;
  weightedValues: CriteriaNumericVector;
}

const CRITERION_SHADES: Record<CriterionCode, string> = {
  C1: "#18181b",
  C2: "#3f3f46",
  C3: "#52525b",
  C4: "#71717a",
  C5: "#a1a1aa",
  C6: "#d4d4d8",
};

export function SawContributionChart({ items }: { items: SawContributionItem[] }) {
  const data = items.map((item) => ({
    code: item.code,
    C1: Number(item.weightedValues.C1.toFixed(6)),
    C2: Number(item.weightedValues.C2.toFixed(6)),
    C3: Number(item.weightedValues.C3.toFixed(6)),
    C4: Number(item.weightedValues.C4.toFixed(6)),
    C5: Number(item.weightedValues.C5.toFixed(6)),
    C6: Number(item.weightedValues.C6.toFixed(6)),
  }));

  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label="Grafik kontribusi berbobot tiap kriteria terhadap nilai preferensi SAW laptop"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 20, left: 10, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: "#52525b", fontSize: 12 }}
            axisLine={{ stroke: "#d4d4d8" }}
          />
          <YAxis
            type="category"
            dataKey="code"
            width={40}
            tick={{ fill: "#18181b", fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(val) => formatDecimal(Number(val ?? 0), 6)}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {CRITERIA.map((c) => (
            <Bar
              key={c.code}
              dataKey={c.code}
              name={`${c.code} ${c.shortName}`}
              stackId="saw"
              fill={CRITERION_SHADES[c.code]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
