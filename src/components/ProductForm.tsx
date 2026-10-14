"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Initial = {
  id: string;
  title: string;
  description: string;
  price: number; // cents
  originalPrice: number | null; // cents
  stock: number;
  flashSale: boolean;
  active: boolean;
  images: string[];
  categoryId: string;
  weightGrams: number;
  variants: { id: string; name: string; stock: number }[];
};

export default function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<{ id?: string; name: string; stock: string }[]>(
    (initial?.variants ?? []).map((v) => ({ id: v.id, name: v.name, stock: String(v.stock) })),
  );
  const hasVariants = variants.length > 0;
  const variantTotal = variants.reduce((n, v) => n + (Math.floor(Number(v.stock)) || 0), 0);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`${file.name}: ${data.error ?? "upload failed"}`);
        break;
      }
      setImages((prev) => [...prev, data.url]);
    }
    setUploading(false);
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!/^https?:\/\//.test(u)) return setError("Image link must start with http:// or https://");
    setImages((prev) => [...prev, u]);
    setUrlInput("");
    setError("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      title: f.get("title"),
      description: f.get("description"),
      price: f.get("price"),
      originalPrice: f.get("originalPrice"),
      stock: f.get("stock"),
      weightGrams: f.get("weightGrams"),
      variants: variants.map((v) => ({ id: v.id, name: v.name, stock: v.stock })),
      categoryId: f.get("categoryId"),
      flashSale: f.get("flashSale") === "on",
      active: initial ? f.get("active") === "on" : undefined,
      images,
    };
    const res = await fetch(initial ? `/api/seller/products/${initial.id}` : "/api/seller/products", {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not save");
    router.push("/seller/products");
    router.refresh();
  }

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>{initial ? "Edit product" : "Add a new product"}</h2></div>
      <form className="form-grid" onSubmit={submit}>
        <label className="full">
          Title
          <input name="title" required minLength={3} maxLength={150} defaultValue={initial?.title} />
        </label>
        <label>
          Category
          <select name="categoryId" required defaultValue={initial?.categoryId ?? ""}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          Stock {hasVariants && <span className="hint">(total of the variants below)</span>}
          {hasVariants ? (
            <input name="stock" type="number" value={variantTotal} readOnly />
          ) : (
            <input name="stock" type="number" min={0} step={1} required defaultValue={initial?.stock ?? 10} />
          )}
        </label>
        <label>
          Weight in grams <span className="hint">(optional, used for weight-based shipping)</span>
          <input name="weightGrams" type="number" min={0} max={100000} step={1} defaultValue={initial?.weightGrams || ""} />
        </label>
        <label>
          Price
          <input name="price" type="number" min={0.01} step="0.01" required defaultValue={initial ? initial.price / 100 : ""} />
        </label>
        <label>
          Original price <span className="hint">(optional, shows a discount)</span>
          <input name="originalPrice" type="number" min={0} step="0.01" defaultValue={initial?.originalPrice ? initial.originalPrice / 100 : ""} />
        </label>
        <label className="full">
          Description
          <textarea name="description" rows={5} required minLength={10} defaultValue={initial?.description} />
        </label>

        <div className="full">
          <strong style={{ fontSize: 13 }}>Variants <span className="hint">(optional · e.g. sizes or colours, each with its own stock)</span></strong>
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input placeholder="Name, e.g. Red / M" maxLength={40} required value={v.name} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} style={{ flex: 2, minWidth: 0 }} />
              <input placeholder="Stock" type="number" min={0} step={1} required value={v.stock} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn-sm ghost" onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label="Remove variant">✕</button>
            </div>
          ))}
          {variants.length < 30 && (
            <button type="button" className="btn-sm ghost" style={{ marginTop: 6 }} onClick={() => setVariants([...variants, { name: "", stock: "10" }])}>+ Add a variant</button>
          )}
        </div>

        <div className="full" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Images <span className="hint">(first image is the main picture · JPG/PNG/WebP, max 3 MB each)</span></strong>
          <div className="img-list">
            {images.map((src, i) => (
              <div className="im" key={src + i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <button type="button" aria-label="Remove image" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {uploading && <div className="im" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>…</div>}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ flex: 1, padding: 10, border: "1px solid var(--line)", borderRadius: 3 }} placeholder="…or paste an image link" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            <button type="button" className="btn-sm ghost" onClick={addUrl}>Add link</button>
          </div>
        </div>

        <label className="full" style={{ flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" name="flashSale" defaultChecked={initial?.flashSale} style={{ width: "auto" }} /> Show in Flash Sale on the home page
        </label>
        {initial && (
          <label className="full" style={{ flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 400 }}>
            <input type="checkbox" name="active" defaultChecked={initial.active} style={{ width: "auto" }} /> Visible in the shop
          </label>
        )}

        {error && <p className="full" style={{ color: "var(--red)" }}>{error}</p>}
        <div className="full" style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" type="submit" disabled={busy || uploading}>{busy ? "Saving…" : "Save product"}</button>
          <button className="btn-ghost" type="button" onClick={() => router.push("/seller/products")}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
