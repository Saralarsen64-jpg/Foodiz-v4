import { useEffect, useState } from "react";
import { AlertCircle, Bike, CheckCircle2, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type CourierApplicationRow = {
  id: string;
  user_id: string;
  city: string | null;
  vehicle_type: string | null;
  legal_name?: string | null;
  siret?: string | null;
  address?: string | null;
  postal_code?: string | null;
  status: string | null;
  created_at: string | null;
  profiles?: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
};

export default function AdminCourierApplicationsPage() {
  const [items, setItems] = useState<CourierApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courier_applications")
      .select("id,user_id,city,vehicle_type,legal_name,siret,address,postal_code,status,created_at,profiles:profiles!courier_applications_user_id_fkey(first_name,last_name,email,phone)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { void loadItems(); }, []);

  const update = async (item: CourierApplicationRow, status: "validated" | "missing_documents") => {
    setBusy(item.id);
    const { error } = await supabase.from("courier_applications").update({ status }).eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      const profileStatus = status === "validated" ? "validated" : "missing_documents";
      await supabase.from("profiles").update({ status: profileStatus }).eq("id", item.user_id);
      toast.success(status === "validated" ? "Livreur validé." : "Pièces manquantes signalées.");
      await loadItems();
    }
    setBusy("");
  };

  const stats = {
    pending: items.filter((item) => ["pending", "missing_documents"].includes(item.status || "pending")).length,
    validated: items.filter((item) => item.status === "validated").length,
    incomplete: items.filter((item) => !item.siret || !item.legal_name || !item.address || !item.postal_code).length,
  };
  const statCards = [
    { label: "À vérifier", value: stats.pending, Icon: AlertCircle, color: "text-foodiz-gold" },
    { label: "Validés", value: stats.validated, Icon: CheckCircle2, color: "text-foodiz-green" },
    { label: "Incomplets", value: stats.incomplete, Icon: FileText, color: "text-foodiz-red" },
  ];

  return <AdminShell title="Livreurs" subtitle="Validation des dossiers, identité légale et conformité des règlements">
    <section className="grid gap-4 md:grid-cols-3">{statCards.map(({ label, value, Icon, color }) => <article key={label} className="foodiz-card border-foodiz-gold/15 p-5"><Icon size={20} className={color}/><p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{label}</p><p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{value}</p></article>)}</section>
    <div className="flex justify-end"><button onClick={() => void loadItems()} className="flex items-center gap-2 text-xs text-foodiz-gold"><RefreshCw size={15}/>Actualiser</button></div>
    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement des dossiers...</div> : items.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune demande livreur.</div> : <section className="grid gap-4 xl:grid-cols-2">{items.map((item) => {
      const fullName = [item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(" ");
      const complete = Boolean(item.legal_name && item.siret && item.address && item.postal_code);
      return <article key={item.id} className="foodiz-card border-foodiz-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.10),transparent_40%)] p-5">
        <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Bike size={18} className="text-foodiz-gold"/><h2 className="font-semibold text-foodiz-cream">{fullName || item.profiles?.email || "Livreur"}</h2></div><p className="mt-1 text-xs text-foodiz-gray">{item.city || "Ville non précisée"} · {item.vehicle_type || "Véhicule non précisé"} · {item.profiles?.phone || "Téléphone non précisé"}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${item.status === "validated" ? "border-foodiz-green/20 bg-foodiz-green/5 text-foodiz-green" : "border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"}`}>{item.status || "pending"}</span></div>
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-foodiz-gray"><p className="flex items-center gap-2 text-foodiz-cream"><ShieldCheck size={14} className={complete ? "text-foodiz-green" : "text-foodiz-red"}/>{item.legal_name || "Identité légale manquante"}</p><p className="mt-2">SIRET : {item.siret || "manquant"}</p><p className="mt-1">Adresse : {[item.address, item.postal_code, item.city].filter(Boolean).join(", ") || "manquante"}</p></div>
        <div className="mt-4 flex gap-2"><button disabled={busy === item.id || !complete} onClick={() => void update(item, "validated")} className="foodiz-btn flex flex-1 items-center justify-center gap-2 py-3 text-xs disabled:opacity-40"><CheckCircle2 size={15}/>Valider</button><button disabled={busy === item.id} onClick={() => void update(item, "missing_documents")} className="rounded-xl border border-foodiz-gold/20 px-4 py-3 text-xs text-foodiz-gold disabled:opacity-40">Pièces manquantes</button></div>
      </article>;
    })}</section>}
  </AdminShell>;
}
