import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Listing from "@/components/Listing";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sort?: string; min?: string; max?: string };
}) {
  const category = await db.category.findUnique({ where: { slug: params.slug } });
  if (!category) notFound();

  return (
    <Listing
      basePath={`/category/${category.slug}`}
      where={{ categoryId: category.id }}
      sort={searchParams.sort}
      min={searchParams.min}
      max={searchParams.max}
      title={`${category.icon} ${category.name}`}
    />
  );
}
