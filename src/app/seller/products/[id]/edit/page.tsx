import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const { seller } = await requireSeller();
  const product = await db.product.findUnique({ where: { id: params.id }, include: { variants: { orderBy: { sortOrder: "asc" } } } });
  // A seller can only edit their own products.
  if (!product || product.sellerId !== seller.id) notFound();

  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <ProductForm
      categories={categories}
      initial={{
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        stock: product.stock,
        flashSale: product.flashSale,
        active: product.active,
        images: product.images,
        categoryId: product.categoryId,
        weightGrams: product.weightGrams,
        variants: product.variants.map((v) => ({ id: v.id, name: v.name, stock: v.stock })),
      }}
    />
  );
}
