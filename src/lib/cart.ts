"use client";

import { useEffect, useState, useCallback } from "react";

export type CartLine = {
  key: string; // product id, or "productId:variantId" when a variant was chosen
  id: string;
  variantId?: string;
  variantName?: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
};

const KEY = "shopzone-cart";

export const lineKey = (id: string, variantId?: string) => (variantId ? `${id}:${variantId}` : id);

function read(): CartLine[] {
  try {
    // Carts saved before variants existed have no key: the product id is the key.
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartLine[]).map((l) => ({ ...l, key: l.key ?? lineKey(l.id, l.variantId) }));
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
    window.dispatchEvent(new Event("cart-changed"));
  } catch {
    /* storage unavailable */
  }
}

export function addToCart(line: Omit<CartLine, "quantity" | "key">, quantity = 1) {
  const lines = read();
  const key = lineKey(line.id, line.variantId);
  const found = lines.find((l) => l.key === key);
  if (found) found.quantity += quantity;
  else lines.push({ ...line, key, quantity });
  write(lines);
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(read());
    sync();
    window.addEventListener("cart-changed", sync);
    return () => window.removeEventListener("cart-changed", sync);
  }, []);

  const setQty = useCallback((key: string, quantity: number) => {
    const next = read()
      .map((l) => (l.key === key ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0);
    write(next);
  }, []);

  const remove = useCallback((key: string) => write(read().filter((l) => l.key !== key)), []);
  const clear = useCallback(() => write([]), []);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.quantity * l.price, 0);

  return { lines, count, total, setQty, remove, clear };
}
