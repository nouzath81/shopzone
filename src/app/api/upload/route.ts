import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

/** Decide the real image type from the file's first bytes (never trust the browser's file name or MIME type). */
function sniff(b: Buffer): { ext: string; type: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", type: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 3 MB" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed" }, { status: 400 });

  const name = `${user.id}/${Date.now()}-${randomBytes(4).toString("hex")}.${kind.ext}`;

  const supaUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supaUrl && supaKey) {
    const res = await fetch(`${supaUrl}/storage/v1/object/products/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${supaKey}`, "Content-Type": kind.type },
      body: buf,
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Storage upload failed. Check the 'products' bucket exists and is Public." }, { status: 502 });
    }
    return NextResponse.json({ url: `${supaUrl}/storage/v1/object/public/products/${name}` });
  }

  // Local fallback for development.
  try {
    const dest = path.join(process.cwd(), "public", "uploads", name);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "Cannot save files here. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }
}
