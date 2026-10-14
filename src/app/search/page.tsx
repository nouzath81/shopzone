import Listing from "@/components/Listing";

export const dynamic = "force-dynamic";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; min?: string; max?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  return (
    <Listing
      basePath="/search"
      q={q}
      where={q ? { title: { contains: q, mode: "insensitive" } } : {}}
      sort={searchParams.sort}
      min={searchParams.min}
      max={searchParams.max}
      title={q ? `Results for "${q}"` : "All products"}
    />
  );
}
