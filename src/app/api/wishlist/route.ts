import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { visible } from "@/lib/visible";

/** Add (on: true) or remove (on: false) a product from the logged-in user's wishlist. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const productId = String(b?.productId ?? "");
  if (typeof b?.on !== "boolean" || !productId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (b.on) {
    const product = await db.product.findFirst({ where: { id: productId, ...visible }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    // upsert keeps this safe if the heart is clicked twice quickly
    await db.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
  } else {
    await db.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  }
  return NextResponse.json({ ok: true });
}
