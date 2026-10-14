import type { Prisma } from "@prisma/client";
import type { VariantInput } from "./productInput";

/**
 * Makes the product's variants match what the seller submitted: update the ones that still exist,
 * add the new ones, remove the ones that are gone. Past orders keep the variant's name (OrderItem.variantName).
 */
export async function syncVariants(tx: Prisma.TransactionClient, productId: string, submitted: VariantInput[]) {
  const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
  const have = new Set(existing.map((e) => e.id));
  const keep = new Set<string>();
  for (const [i, v] of submitted.entries()) {
    if (v.id && have.has(v.id)) {
      keep.add(v.id);
      await tx.productVariant.update({ where: { id: v.id }, data: { name: v.name, stock: v.stock, sortOrder: i } });
    } else {
      await tx.productVariant.create({ data: { productId, name: v.name, stock: v.stock, sortOrder: i } });
    }
  }
  const gone = existing.map((e) => e.id).filter((id) => !keep.has(id));
  if (gone.length) await tx.productVariant.deleteMany({ where: { id: { in: gone } } });
}
