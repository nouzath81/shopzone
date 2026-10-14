/**
 * One CSV cell. Quotes are doubled, and a cell starting with = + - @ gets a leading apostrophe,
 * because Excel would otherwise run it as a formula (customer names and addresses are typed by strangers).
 */
export function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  // BOM so Excel opens non-English names correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
