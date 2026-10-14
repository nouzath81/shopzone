import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { parseProduct } from "@/lib/productInput";
import { syncVariants } from "@/lib/variants";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user?.seller || user.role !== "SELLER") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const parsed = await parseProduct(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...parsed.data, sellerId: user.seller!.id } });
    await syncVariants(tx, created.id, parsed.variants);
    return created;
  });
  return NextResponse.json({ id: product.id });
}
