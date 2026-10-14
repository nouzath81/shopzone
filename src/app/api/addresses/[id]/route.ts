import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

/** PATCH makes this address the default. DELETE removes it. Both only work on the user's own addresses. */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const found = await db.address.findFirst({ where: { id: params.id, userId: user.id } });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: found.id }, data: { isDefault: true } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const found = await db.address.findFirst({ where: { id: params.id, userId: user.id } });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.address.delete({ where: { id: found.id } });
  // If the default was removed, the newest remaining address becomes the default.
  if (found.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return NextResponse.json({ ok: true });
}
