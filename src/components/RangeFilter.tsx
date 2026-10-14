import Link from "next/link";
import { RANGES } from "@/lib/sales";

/** One row above the charts: the date range every chart and number below it follows. */
export default function RangeFilter({ basePath, days }: { basePath: string; days: number }) {
  return (
    <div className="sortbar" style={{ background: "var(--card)", borderRadius: 4 }}>
      <span>Show:</span>
      {RANGES.map((d) => (
        <Link key={d} href={`${basePath}?days=${d}`} className={d === days ? "active" : ""}>
          Last {d} days
        </Link>
      ))}
    </div>
  );
}
