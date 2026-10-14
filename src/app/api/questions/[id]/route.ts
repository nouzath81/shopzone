import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { notifyQuestion } from "@/lib/notify";

async function load(id: string) {
  return db.question.findUnique({ where: { id }, include: { product: true } });
}

/** The product's seller (or an admin) writes or edits the answer. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const q = await load(params.id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && !(user.seller && q.product.sellerId === user.seller.id)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const b = await req.json().catch(() => null);
  const answer = String(b?.answer ?? "").trim();
  if (answer.length < 2 || answer.length > 500) return NextResponse.json({ error: "Please write 2–500 characters" }, { status: 400 });

  await db.question.update({ where: { id: q.id }, data: { answer, answeredAt: new Date() } });
  if (!q.answer) await notifyQuestion(q.id, "answered"); // email only for the first answer, not for edits
  return NextResponse.json({ ok: true });
}

/** The asker can withdraw a question that has no answer yet. An admin can delete any question. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const q = await load(params.id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const own = q.userId === user.id && !q.answer;
  if (user.role !== "ADMIN" && !own) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await db.question.delete({ where: { id: q.id } });
  return NextResponse.json({ ok: true });
}
