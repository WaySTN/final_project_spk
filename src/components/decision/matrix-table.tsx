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
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
          Matriks 6×6 Resiprokal
        </span>
        <span className="font-mono text-[10px] text-[#64748b]">
          Geser horizontal →
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-xs sm:text-[13px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
              <th className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5">
                Kriteria
              </th>
              {CRITERIA.map((c) => (
                <th key={c.code} className="px-3 py-2.5 text-right">
                  {c.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]/75">
            {CRITERIA.map((rowCrit, i) => (
              <tr key={rowCrit.code} className="hover:bg-[#f8fafc] transition-colors">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-3.5 py-2.5 text-left font-medium text-[#1e293b] whitespace-nowrap"
                >
                  <span className="font-mono text-[11px] text-[#64748b] mr-2">
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
                          ? "bg-[#eff4fa]/60 font-semibold text-[#1e3a5f]"
                          : "text-[#475569]"
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
