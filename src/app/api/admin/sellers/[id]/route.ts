import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const b = await req.json().catch(() => null);
  if (typeof b?.approved !== "boolean") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const res = await db.seller.updateMany({ where: { id: params.id }, data: { approved: b.approved } });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
