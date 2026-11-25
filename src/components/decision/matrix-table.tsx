import { CRITERIA, type AhpMatrix } from "@/lib/decision";
import { formatDecimal } from "@/lib/formatting";

export function PairwiseMatrixTable({
  matrix,
  digits = 4,
  caption,
}: {
  matrix: AhpMatrix;
  digits?: number;
  caption?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between sm:hidden">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#787872]">
          Matriks 6×6 Resiprokal
        </span>
        <span className="font-mono text-[10px] text-[#787872]">
          Geser horizontal →
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e0] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-xs sm:text-[13px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#787872]">
              <th className="sticky left-0 z-10 border-r border-[#e5e5e0] bg-[#f7f7f5] px-3.5 py-2.5">
                Kriteria
              </th>
              {CRITERIA.map((c) => (
                <th key={c.code} className="px-3 py-2.5 text-right">
                  {c.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e0]/70">
            {CRITERIA.map((rowCrit, i) => (
              <tr key={rowCrit.code} className="hover:bg-[#f7f7f5]/60 transition-colors">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-[#e5e5e0] bg-white px-3.5 py-2.5 text-left font-medium text-[#111113] whitespace-nowrap"
                >
                  <span className="font-mono text-[11px] text-[#787872] mr-2">
                    {rowCrit.code}
                  </span>
                  {rowCrit.shortName}
                </th>
                {CRITERIA.map((colCrit, j) => {
                  const value = matrix[i]?.[j] ?? 0;
                  const isDiag = i === j;
                  return (
                    <td
                      key={colCrit.code}
                      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                        isDiag
                          ? "bg-[#f7f7f5] font-semibold text-[#111113]"
                          : "text-[#52524e]"
                      }`}
                    >
                      {formatDecimal(value, digits)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
