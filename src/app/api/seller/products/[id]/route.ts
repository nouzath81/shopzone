import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { parseProduct } from "@/lib/productInput";
import { syncVariants } from "@/lib/variants";

/** Loads the product only if it belongs to the logged-in seller. */
async function ownProduct(id: string) {
  const user = await getUser();
  if (!user?.seller || user.role !== "SELLER") return null;
  const product = await db.product.findUnique({ where: { id } });
  return product && product.sellerId === user.seller.id ? product : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const product = await ownProduct(params.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = await parseProduct(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { ...parsed.data, ...(typeof body?.active === "boolean" ? { active: body.active } : {}) },
    });
    await syncVariants(tx, product.id, parsed.variants);
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const product = await ownProduct(params.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Products that were ordered can't be removed (order history needs them), so they are hidden instead.
  const ordered = await db.orderItem.count({ where: { productId: product.id } });
  if (ordered > 0) {
    await db.product.update({ where: { id: product.id }, data: { active: false } });
    return NextResponse.json({ hidden: true });
  }
  await db.product.delete({ where: { id: product.id } });
  return NextResponse.json({ deleted: true });
}
