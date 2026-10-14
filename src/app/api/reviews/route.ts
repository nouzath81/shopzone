import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const orderItemId = String(b?.orderItemId ?? "");
  const rating = Math.floor(Number(b?.rating));
  const comment = String(b?.comment ?? "").trim();

  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Choose 1 to 5 stars" }, { status: 400 });
  if (comment.length < 3 || comment.length > 1000) return NextResponse.json({ error: "Write a short comment (3–1000 characters)" }, { status: 400 });

  const item = await db.orderItem.findUnique({ where: { id: orderItemId }, include: { order: true, review: true } });
  // Only the buyer can review, and only what they actually received.
  if (!item || item.order.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "DELIVERED") return NextResponse.json({ error: "You can review an item after it is delivered" }, { status: 400 });
  if (item.review) return NextResponse.json({ error: "You already reviewed this item" }, { status: 409 });

  try {
    await db.$transaction(async (tx) => {
      await tx.review.create({
        data: { productId: item.productId, userId: user.id, orderItemId: item.id, rating, comment },
      });
      const agg = await tx.review.aggregate({ where: { productId: item.productId }, _avg: { rating: true }, _count: true });
      await tx.product.update({
        where: { id: item.productId },
        data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "You already reviewed this item" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
