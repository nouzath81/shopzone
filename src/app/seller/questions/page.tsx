import Link from "next/link";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { AnswerForm } from "@/components/QuestionForms";

export const dynamic = "force-dynamic";

export default async function SellerQuestions() {
  const { seller } = await requireSeller();
  const rows = await db.question.findMany({
    where: { product: { sellerId: seller.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { id: true, title: true } }, user: { select: { name: true } } },
  });
  const open = rows.filter((r) => !r.answer);
  const done = rows.filter((r) => r.answer);

  const card = (r: (typeof rows)[number]) => (
    <div className="pad order-card" key={r.id}>
      <Link href={`/product/${r.product.id}`} style={{ color: "var(--brand)" }}>{r.product.title}</Link>
      <p style={{ margin: "6px 0" }}><strong>{r.user.name.split(" ")[0]}</strong> asked: {r.text}</p>
      <small style={{ color: "var(--muted)" }}>{r.createdAt.toLocaleDateString("en-GB")}</small>
      <div style={{ marginTop: 8 }}><AnswerForm id={r.id} current={r.answer} /></div>
    </div>
  );

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Waiting for your answer ({open.length})</h2></div>
        {open.length === 0 ? <div className="empty">No open questions.</div> : open.map(card)}
      </section>
      {done.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Answered ({done.length})</h2></div>
          {done.map(card)}
        </section>
      )}
    </>
  );
}
