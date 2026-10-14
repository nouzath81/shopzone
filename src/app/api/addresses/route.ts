import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cleanAddress, MAX_ADDRESSES } from "@/lib/address";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const a = cleanAddress(await req.json().catch(() => null));
  if (!a) return NextResponse.json({ error: "Please fill in all fields" }, { status: 400 });

  const mine = await db.address.findMany({ where: { userId: user.id } });
  // Saving the same address twice (for example from checkout) is quietly accepted.
  const same = mine.find((m) => m.address.toLowerCase() === a.address.toLowerCase() && m.city.toLowerCase() === a.city.toLowerCase() && m.phone === a.phone);
  if (same) return NextResponse.json({ ok: true, id: same.id });
  if (mine.length >= MAX_ADDRESSES) return NextResponse.json({ error: `You can save up to ${MAX_ADDRESSES} addresses` }, { status: 400 });

  const created = await db.address.create({ data: { ...a, userId: user.id, isDefault: mine.length === 0 } });
  return NextResponse.json({ ok: true, id: created.id });
}
