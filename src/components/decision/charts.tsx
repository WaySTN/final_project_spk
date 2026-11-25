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
  primaryLabel = "17 Konsisten (Utama)",
  comparisonLabel = "33 Eligible (Sensitivitas)",
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
        <BarChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e5e5e0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#52524e", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#d0d0c8" }}
            tickLine={false}
          />
          <YAxis
            unit="%"
            tick={{ fill: "#787872", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 30]}
          />
          <Tooltip
            formatter={(val) => `${formatDecimal(Number(val ?? 0), 2)}%`}
            cursor={{ fill: "#f7f7f5" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d0d0c8",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(17,17,19,0.06)",
            }}
          />
          {comparisonWeightsByCode && (
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                paddingTop: "8px",
                color: "#52524e",
              }}
            />
          )}
          <Bar
            dataKey="primary"
            name={primaryLabel}
            fill="#111113"
            radius={[2, 2, 0, 0]}
            maxBarSize={36}
          />
          {comparisonWeightsByCode && (
            <Bar
              dataKey="comparison"
              name={comparisonLabel}
              fill="#b8b8b0"
              radius={[2, 2, 0, 0]}
              maxBarSize={36}
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
  C1: "#111113",
  C2: "#3a3a3d",
  C3: "#5c5c58",
  C4: "#82827c",
  C5: "#abab9f",
  C6: "#d4d4cc",
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
          margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#e5e5e0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: "#787872", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#d0d0c8" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="code"
            width={36}
            tick={{
              fill: "#111113",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(val) => formatDecimal(Number(val ?? 0), 6)}
            cursor={{ fill: "#f7f7f5" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d0d0c8",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(17,17,19,0.06)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
          {CRITERIA.map((c) => (
            <Bar
              key={c.code}
              dataKey={c.code}
              name={`${c.code} ${c.shortName}`}
              stackId="saw"
              fill={CRITERION_SHADES[c.code]}
              barSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
