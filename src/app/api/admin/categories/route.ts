import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const icon = String(b?.icon ?? "").trim() || "🛍️";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!name || !slug) return NextResponse.json({ error: "Enter a category name" }, { status: 400 });
  if (await db.category.findUnique({ where: { slug } })) {
    return NextResponse.json({ error: "That category already exists" }, { status: 409 });
  }

  await db.category.create({ data: { name, slug, icon } });
  return NextResponse.json({ ok: true });
}
