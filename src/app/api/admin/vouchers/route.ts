import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { normalizeCode } from "@/lib/voucher";

async function adminOnly() {
  const user = await getUser();
  return user?.role === "ADMIN";
}

export async function POST(req: Request) {
  if (!(await adminOnly())) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const code = normalizeCode(b?.code);
  const kind = b?.kind === "AMOUNT" ? "AMOUNT" : "PERCENT";
  const value = Number(b?.value);
  const minSpend = b?.minSpend === "" || b?.minSpend == null ? 0 : Math.round(Number(b.minSpend) * 100);
  const maxUses = b?.maxUses === "" || b?.maxUses == null ? null : Math.floor(Number(b.maxUses));
  const expiresAt = b?.expiresAt ? new Date(`${b.expiresAt}T23:59:59`) : null;

  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return NextResponse.json({ error: "Code: 3–20 letters, numbers, - or _" }, { status: 400 });
  if (!(value > 0)) return NextResponse.json({ error: "Enter a discount value above 0" }, { status: 400 });
  if (kind === "PERCENT" && value > 100) return NextResponse.json({ error: "Percent can't be above 100" }, { status: 400 });
  if (!(minSpend >= 0)) return NextResponse.json({ error: "Invalid minimum spend" }, { status: 400 });
  if (maxUses !== null && !(maxUses > 0)) return NextResponse.json({ error: "Max uses must be above 0" }, { status: 400 });
  if (expiresAt && isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  if (await db.voucher.findUnique({ where: { code } })) return NextResponse.json({ error: "That code already exists" }, { status: 409 });

  await db.voucher.create({
    data: {
      code,
      percentOff: kind === "PERCENT" ? Math.floor(value) : null,
      amountOff: kind === "AMOUNT" ? Math.round(value * 100) : null,
      minSpend,
      maxUses,
      expiresAt,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!(await adminOnly())) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const b = await req.json().catch(() => null);
  if (typeof b?.id !== "string" || typeof b?.active !== "boolean") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const res = await db.voucher.updateMany({ where: { id: b.id }, data: { active: b.active } });
  return res.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
