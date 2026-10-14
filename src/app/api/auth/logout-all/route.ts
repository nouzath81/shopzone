import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearSession, getUser } from "@/lib/auth";

/** Signs the user out of every device, this one included. */
export async function POST() {
  const user = await getUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  clearSession();
  return NextResponse.json({ ok: true });
}
