import { listWaitlist } from "@/lib/admin/data";

const csvCell = (v: string | null) => {
  const s = v ?? "";
  // Quote every cell and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const rows = await listWaitlist(); // requireAdmin() inside: 404 for non-admins
  const header = ["email", "source", "utm_source", "utm_medium", "utm_campaign", "created_at"];
  const lines = rows.map((r) =>
    [r.email, r.source, r.utm_source, r.utm_medium, r.utm_campaign, r.created_at].map(csvCell).join(","),
  );
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
