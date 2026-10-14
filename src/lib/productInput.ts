import { db } from "./db";

export type ProductData = {
  title: string;
  description: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  flashSale: boolean;
  images: string[];
  categoryId: string;
  weightGrams: number;
};

export type VariantInput = { id?: string; name: string; stock: number };

const toCents = (v: unknown) => Math.round(Number(v) * 100);

/** Validates the product form. Prices arrive in normal currency units (49.90) and are stored in cents. */
export async function parseProduct(b: any): Promise<{ error: string } | { data: ProductData; variants: VariantInput[] }> {
  const title = String(b?.title ?? "").trim();
  const description = String(b?.description ?? "").trim();
  const price = toCents(b?.price);
  const original = b?.originalPrice === "" || b?.originalPrice == null ? null : toCents(b.originalPrice);
  const stock = variants.length > 0 ? variants.reduce((n, v) => n + v.stock, 0) : Math.floor(Number(b?.stock));
  const images: string[] = Array.isArray(b?.images) ? b.images.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
  const categoryId = String(b?.categoryId ?? "");
  const weightGrams = b?.weightGrams === "" || b?.weightGrams == null ? 0 : Math.floor(Number(b.weightGrams));

  // Variants (size, colour…): each has its own stock, and the product's stock becomes their sum.
  const variants: VariantInput[] = [];
  const rawVariants: unknown[] = Array.isArray(b?.variants) ? b.variants : [];
  if (rawVariants.length > 30) return { error: "Maximum 30 variants" };
  const seen = new Set<string>();
  for (const v of rawVariants as { id?: unknown; name?: unknown; stock?: unknown }[]) {
    const name = String(v?.name ?? "").trim();
    const vs = Math.floor(Number(v?.stock));
    if (!name || name.length > 40) return { error: "Each variant needs a name of up to 40 characters" };
    if (!(vs >= 0) || !Number.isFinite(vs) || vs > 1_000_000) return { error: `Stock for "${name}" must be 0 or more` };
    if (seen.has(name.toLowerCase())) return { error: `The variant "${name}" is listed twice` };
    seen.add(name.toLowerCase());
    variants.push({ id: typeof v?.id === "string" && v.id ? v.id : undefined, name, stock: vs });
  }

  if (title.length < 3 || title.length > 150) return { error: "Title must be 3–150 characters" };
  if (description.length < 10) return { error: "Please write a longer description" };
  if (!(price > 0)) return { error: "Enter a price above 0" };
  if (original !== null && !(original > price)) return { error: "Original price must be higher than the price (or leave it empty)" };
  if (!(stock >= 0) || !Number.isFinite(stock)) return { error: "Stock must be 0 or more" };
  if (!Number.isInteger(weightGrams) || weightGrams < 0 || weightGrams > 100_000) return { error: "Weight must be 0–100,000 grams" };
  if (images.length < 1) return { error: "Add at least one image" };
  if (images.length > 8) return { error: "Maximum 8 images" };
  if (!images.every((u) => /^https?:\/\//.test(u) || u.startsWith("/uploads/"))) return { error: "Images must be uploaded files or http(s) links" };
  if (!(await db.category.findUnique({ where: { id: categoryId } }))) return { error: "Choose a category" };

  return {
    data: { title, description, price, originalPrice: original, stock, flashSale: !!b?.flashSale, images, categoryId, weightGrams },
    variants,
  };
}
