import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, FileText, Landmark, RefreshCw, ShieldCheck, Store, WalletCards } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";
import { emailFinancialDocument } from "../../lib/financialDocuments";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;
const compactDate = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString("fr-FR") : "—";
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [payables, setPayables] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "partner" | "courier">("all");
  const [cityFilter, setCityFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [{ data: payableRows }, { data: statementRows }] = await Promise.all([
      supabase.from("admin_weekly_payables").select("*").order("amount_cents", { ascending: false }),
      supabase.from("settlement_statements").select("*").order("generated_at", { ascending: false }).limit(100),
    ]);
    const rawPayables = payableRows || [];
    const partnerIds = [...new Set(rawPayables.filter((row) => row.beneficiary_type === "partner").map((row) => row.beneficiary_id))];
    const courierIds = [...new Set(rawPayables.filter((row) => row.beneficiary_type === "courier").map((row) => row.beneficiary_id))];

    const [{ data: partnerRows }, { data: courierRows }] = await Promise.all([
      partnerIds.length > 0
        ? supabase.from("restaurants").select("owner_id,city").in("owner_id", partnerIds)
        : Promise.resolve({ data: [] as any[] }),
      courierIds.length > 0
        ? supabase.from("courier_applications").select("user_id,city").in("user_id", courierIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const partnerCityByUser = new Map((partnerRows || []).map((row: any) => [row.owner_id, row.city]));
    const courierCityByUser = new Map((courierRows || []).map((row: any) => [row.user_id, row.city]));
    setPayables(rawPayables.map((row) => ({
      ...row,
      city: row.beneficiary_type === "partner" ? partnerCityByUser.get(row.beneficiary_id) : courierCityByUser.get(row.beneficiary_id),
    })));
    setStatements(statementRows || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createStatement = async (row: any) => {
    setBusy(`${row.beneficiary_type}:${row.beneficiary_id}`);
    const { data, error } = await supabase.rpc("create_weekly_settlement", {
      target_beneficiary_id: row.beneficiary_id,
      target_beneficiary_type: row.beneficiary_type,
      target_period_start: row.first_delivery_date,
      target_period_end: row.last_delivery_date,
    });
    if (error) toast.error(error.message); else { toast.success("Bordereau créé."); navigate(`/admin/payouts/${data}`); }
    setBusy("");
  };

  const markPaid = async (statement: any) => {
    const reference = window.prompt("Référence du virement bancaire effectué :");
    if (!reference) return;
    setBusy(statement.id);
    const { error } = await supabase.rpc("mark_settlement_paid", { target_statement_id: statement.id, target_payment_reference: reference });
    if (error) toast.error(error.message); else {
      const { data: document } = await supabase.from("financial_documents").select("id").eq("settlement_id", statement.id).maybeSingle();
      if (document) {
        try { await emailFinancialDocument(document.id); toast.success("Paiement enregistré et bordereau envoyé."); }
        catch (emailError: any) { toast.error(`Paiement enregistré, mais email non envoyé : ${emailError.message}`); }
      } else toast.success("Paiement enregistré.");
      await load();
    }
    setBusy("");
  };

  const filteredPayables = payables.filter((row) => {
    const matchesType = typeFilter === "all" || row.beneficiary_type === typeFilter;
    const matchesCity = cityFilter === "all" || (row.city || "Ville non renseignée") === cityFilter;
    return matchesType && matchesCity;
  });
  const payableTotal = filteredPayables.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const partnerTotal = filteredPayables.filter((row) => row.beneficiary_type === "partner").reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const courierTotal = filteredPayables.filter((row) => row.beneficiary_type === "courier").reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const totalOrders = filteredPayables.reduce((sum, row) => sum + Number(row.order_count || 0), 0);
  const cities = ["all", ...Array.from(new Set(payables.map((row) => row.city || "Ville non renseignée"))).sort((a, b) => a.localeCompare(b, "fr"))];
  const draftStatements = statements.filter((statement) => statement.status === "draft");
  const paidStatements = statements.filter((statement) => statement.status === "paid");

  const exportPayablesCsv = () => {
    if (filteredPayables.length === 0) {
      toast.error("Aucune ligne à exporter.");
      return;
    }

    const rows = [
      ["Type", "Ville", "Bénéficiaire", "SIRET", "Commandes", "Période début", "Période fin", "Montant EUR"],
      ...filteredPayables.map((row) => [
        row.beneficiary_type === "partner" ? "Partenaire" : "Livreur",
        row.city || "Ville non renseignée",
        row.beneficiary_name,
        row.legal_identifier || "",
        row.order_count,
        compactDate(row.first_delivery_date),
        compactDate(row.last_delivery_date),
        ((Number(row.amount_cents || 0)) / 100).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weello-virements-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export CSV généré.");
  };

  return <AdminShell title="Règlements hebdomadaires" subtitle="Préparation des bordereaux et traçabilité des virements manuels">
    <section className="rounded-2xl border border-weello-gold/20 bg-weello-gold/5 p-4 text-xs leading-relaxed text-weello-gray">Weello ne déclenche pas encore le virement bancaire. Le bouton « Marquer payé » doit être utilisé uniquement après avoir réellement effectué le virement, avec sa référence bancaire.</section>
    {loading ? <div className="weello-card p-8 text-center text-weello-gray animate-pulse">Calcul des montants à payer...</div> : <>
      <section className="grid gap-4 lg:grid-cols-4">
        <article className="weello-card p-5"><WalletCards size={20} className="text-weello-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">À virer</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{euros(payableTotal)}</p><p className="mt-2 text-[10px] text-weello-gray">{filteredPayables.length} bénéficiaire(s), {totalOrders} commande(s)</p></article>
        <article className="weello-card p-5"><Store size={20} className="text-weello-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">Partenaires</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{euros(partnerTotal)}</p><p className="mt-2 text-[10px] text-weello-gray">Prix produits à reverser.</p></article>
        <article className="weello-card p-5"><Landmark size={20} className="text-weello-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">Livreurs</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{euros(courierTotal)}</p><p className="mt-2 text-[10px] text-weello-gray">Livraison + primes - pénalités.</p></article>
        <article className="weello-card p-5"><ShieldCheck size={20} className="text-weello-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">Bordereaux</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{draftStatements.length}</p><p className="mt-2 text-[10px] text-weello-gray">{paidStatements.length} déjà marqué(s) payé(s).</p></article>
      </section>

      <section className="weello-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-weello-gold">Mode coût zéro</p>
            <h2 className="weello-title mt-1 text-lg">Préparer les virements manuels</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-weello-gray">Filtre par ville ou rôle, exporte le CSV, fais les virements depuis ta banque, puis reviens marquer chaque bordereau payé avec la référence bancaire.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "partner", "courier"] as const).map((type) => <button key={type} onClick={() => setTypeFilter(type)} className={`rounded-full border px-4 py-2 text-xs ${typeFilter === type ? "border-weello-gold bg-weello-gold text-black" : "border-white/10 text-weello-gray hover:border-weello-gold/40"}`}>{type === "all" ? "Tous" : type === "partner" ? "Partenaires" : "Livreurs"}</button>)}
            <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="rounded-full border border-white/10 bg-black px-4 py-2 text-xs text-weello-cream outline-none">
              {cities.map((city) => <option key={city} value={city}>{city === "all" ? "Toutes les villes" : city}</option>)}
            </select>
            <button onClick={exportPayablesCsv} className="rounded-full border border-weello-gold/40 px-4 py-2 text-xs text-weello-gold hover:bg-weello-gold/10"><Download size={14} className="mr-1 inline"/>Exporter CSV</button>
            <button onClick={() => void load()} className="rounded-full border border-white/10 px-4 py-2 text-xs text-weello-gray hover:border-weello-gold/40"><RefreshCw size={14} className="mr-1 inline"/>Actualiser</button>
          </div>
        </div>
      </section>

      <section><div className="mb-3 flex items-center justify-between"><h2 className="weello-title text-lg">À payer</h2><span className="text-[10px] uppercase tracking-widest text-weello-gray">{filteredPayables.length} ligne(s)</span></div>{filteredPayables.length === 0 ? <div className="weello-card p-5 text-sm text-weello-gray">Aucune commande livrée non réglée pour ce filtre.</div> : <div className="grid gap-3 lg:grid-cols-2">{filteredPayables.map((row) => { const key = `${row.beneficiary_type}:${row.beneficiary_id}`; return <article key={key} className="weello-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-weello-cream">{row.beneficiary_name}</p><p className="mt-1 text-[10px] uppercase text-weello-gray">{row.beneficiary_type === "partner" ? "Partenaire" : "Livreur"} · {row.city || "Ville non renseignée"} · {row.order_count} commande(s)</p>{row.legal_identifier && <p className="mt-1 text-[10px] text-weello-gray">SIRET {row.legal_identifier}</p>}</div><p className="text-2xl font-serif italic text-weello-gold">{euros(row.amount_cents)}</p></div><p className="mt-4 text-[10px] text-weello-gray">Livraisons du {compactDate(row.first_delivery_date)} au {compactDate(row.last_delivery_date)}</p><button disabled={busy === key} onClick={() => void createStatement(row)} className="weello-btn mt-4 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"><FileText size={16}/>Créer le bordereau</button></article>; })}</div>}</section>

      <section><h2 className="weello-title mb-3 text-lg">Bordereaux</h2><div className="space-y-3">{statements.map((statement) => <article key={statement.id} className="weello-card flex flex-col gap-4 p-4 md:flex-row md:items-center"><div className="flex flex-1 items-center gap-3"><Landmark size={19} className="text-weello-gold"/><div><button onClick={() => navigate(`/admin/payouts/${statement.id}`)} className="font-mono text-sm text-weello-cream hover:text-weello-gold">{statement.document_number}</button><p className="mt-1 text-[10px] text-weello-gray">{statement.beneficiary_name} · {new Date(statement.period_start).toLocaleDateString("fr-FR")} au {new Date(statement.period_end).toLocaleDateString("fr-FR")}</p></div></div><p className="font-semibold text-weello-gold">{euros(statement.amount_cents)}</p><span className={`text-[10px] uppercase ${statement.status === "paid" ? "text-weello-green" : "text-weello-gold"}`}>{statement.status}</span>{statement.status === "draft" && <button disabled={busy === statement.id} onClick={() => void markPaid(statement)} className="rounded-xl border border-weello-green/30 bg-weello-green/10 px-4 py-2 text-xs text-weello-green disabled:opacity-50"><CheckCircle2 size={14} className="mr-1 inline"/>Marquer payé</button>}</article>)}</div></section>
    </>}
  </AdminShell>;
}
