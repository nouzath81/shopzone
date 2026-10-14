/** Download links for the orders spreadsheet (plain links, so the browser saves the file). */
export default function ExportLinks() {
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      Download CSV:
      {[7, 30, 90, 365].map((d) => (
        <a key={d} className="btn-sm ghost" href={`/api/export/orders?days=${d}`} download>{d === 365 ? "1 year" : `${d} days`}</a>
      ))}
    </span>
  );
}
