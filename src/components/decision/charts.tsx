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
          <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            unit="%"
            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 30]}
          />
          <Tooltip
            formatter={(val) => `${formatDecimal(Number(val ?? 0), 2)}%`}
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
            }}
          />
          {comparisonWeightsByCode && (
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                paddingTop: "8px",
                color: "#475569",
              }}
            />
          )}
          <Bar
            dataKey="primary"
            name={primaryLabel}
            fill="#1e3a5f"
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
          />
          {comparisonWeightsByCode && (
            <Bar
              dataKey="comparison"
              name={comparisonLabel}
              fill="#94a3b8"
              radius={[3, 3, 0, 0]}
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
  C1: "#1e3a5f",
  C2: "#2f557f",
  C3: "#4a739c",
  C4: "#6c91b4",
  C5: "#98b4cd",
  C6: "#cbd5e1",
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
          <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="code"
            width={36}
            tick={{
              fill: "#1e293b",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(val) => formatDecimal(Number(val ?? 0), 6)}
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
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
