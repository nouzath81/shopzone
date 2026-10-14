import Link from "next/link";
import { discountPct, money } from "@/lib/format";

type P = {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  rating: number;
  sold: number;
};

export default function ProductCard({ p }: { p: P }) {
  const off = discountPct(p.price, p.originalPrice);
  return (
    <Link href={`/product/${p.id}`} className="card">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.images[0]} alt={p.title} loading="lazy" />
        {off > 0 && <span className="tag">-{off}%</span>}
      </div>
      <div className="info">
        <div className="title">{p.title}</div>
        <div className="price">{money(p.price)}</div>
        {off > 0 && p.originalPrice && (
          <div>
            <span className="old">{money(p.originalPrice)}</span>
            <span className="disc">-{off}%</span>
          </div>
        )}
        <div className="meta">
          <span className="stars">★ {p.rating.toFixed(1)}</span>
          <span>{p.sold.toLocaleString()} sold</span>
        </div>
      </div>
    </Link>
  );
}
