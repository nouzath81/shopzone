import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  await requireSeller();
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <ProductForm categories={categories} />;
}
