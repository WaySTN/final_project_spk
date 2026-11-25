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
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
            <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2.5">Kriteria</th>
            {CRITERIA.map((c) => (
              <th key={c.code} className="px-3 py-2.5 text-right">
                {c.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {CRITERIA.map((rowCrit, i) => (
            <tr key={rowCrit.code} className="hover:bg-zinc-50/70">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left font-medium text-zinc-900 whitespace-nowrap"
              >
                <span className="font-mono text-xs text-zinc-500 mr-1.5">
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
                    className={`px-3 py-2.5 text-right tabular-nums ${
                      isDiag ? "bg-zinc-50 font-semibold text-zinc-900" : "text-zinc-700"
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
  );
}
