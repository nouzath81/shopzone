import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { visible } from "@/lib/visible";
import { isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";
import { notifyQuestion } from "@/lib/notify";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in to ask a question" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const productId = String(b?.productId ?? "");
  const text = String(b?.text ?? "").trim();
  if (text.length < 5 || text.length > 300) return NextResponse.json({ error: "Please write 5–300 characters" }, { status: 400 });

  const product = await db.product.findFirst({ where: { id: productId, ...visible }, include: { seller: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.seller.userId === user.id) return NextResponse.json({ error: "You cannot ask about your own product" }, { status: 400 });

  const key = `question:${user.id}`;
  if (await isLimited(key, 10, 60 * MINUTE)) return NextResponse.json({ error: "Too many questions. Please try again later." }, { status: 429 });
  await recordAttempt(key);

  const q = await db.question.create({ data: { productId, userId: user.id, text } });
  await notifyQuestion(q.id, "asked");
  return NextResponse.json({ ok: true });
}
