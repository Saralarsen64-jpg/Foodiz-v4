import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, RefreshCw, Search, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type PartnerRow = {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  siret: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  owner?: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
  application?: any;
  subscription?: any;
};

const statusLabel: Record<string, string> = {
  active: "Actif", pending: "En attente", suspended: "Suspendu", rejected: "Refusé",
};

export default function AdminPartnerApplicationsPage() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: restaurants, error }, { data: applications }, { data: subscriptions }] = await Promise.all([
      supabase.from("restaurants").select("id,owner_id,name,city,siret,status,is_active,latitude,longitude,created_at,owner:profiles!restaurants_owner_id_fkey(first_name,last_name,email,phone)").order("created_at", { ascending: false }),
      supabase.from("partner_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_subscriptions").select("*,plan:foodiz_plus_plans(name)").order("created_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    const appByOwner = new Map((applications || []).map((row: any) => [row.user_id, row]));
    const subscriptionByRestaurant = new Map<string, any>();
    for (const row of subscriptions || []) if (!subscriptionByRestaurant.has(row.restaurant_id)) subscriptionByRestaurant.set(row.restaurant_id, row);
    setPartners((restaurants || []).map((row: any) => ({ ...row, application: appByOwner.get(row.owner_id), subscription: subscriptionByRestaurant.get(row.id) })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (partner: PartnerRow, status: string) => {
    let reason = "";
    if (["missing_documents", "suspended", "rejected"].includes(status)) {
      reason = window.prompt("Motif obligatoire, conservé dans le journal d’audit :")?.trim() || "";
      if (!reason) return;
    }
    setBusy(partner.id);
    const { error } = await supabase.rpc("admin_set_partner_status", { target_restaurant_id: partner.id, target_status: status, target_reason: reason || null });
    if (error) toast.error(error.message); else { toast.success("Statut partenaire mis à jour."); await load(); }
    setBusy("");
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return partners;
    return partners.filter((partner) => [partner.name, partner.city, partner.siret, partner.owner?.email, partner.owner?.first_name, partner.owner?.last_name].some((value) => value?.toLowerCase().includes(query)));
  }, [partners, search]);

  return <AdminShell title="Partenaires" subtitle="Validation, conformité, abonnement et vue opérationnelle 360°">
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <label className="foodiz-card flex flex-1 items-center gap-3 px-4 py-3"><Search size={17} className="text-foodiz-gold"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, ville, email ou SIRET" className="w-full bg-transparent text-sm outline-none placeholder:text-foodiz-gray"/></label>
      <button onClick={() => void load()} className="rounded-xl border border-foodiz-gold/20 px-4 py-3 text-foodiz-gold"><RefreshCw size={17}/></button>
    </div>

    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement des partenaires...</div> : filtered.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucun partenaire correspondant.</div> : <div className="grid gap-4 xl:grid-cols-2">{filtered.map((partner) => {
      const ownerName = [partner.owner?.first_name, partner.owner?.last_name].filter(Boolean).join(" ");
      return <article key={partner.id} className="foodiz-card p-5">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-foodiz-cream">{partner.name}</h2><p className="mt-1 text-xs text-foodiz-gray">{ownerName || partner.owner?.email || "Responsable non renseigné"} · {partner.city || "Ville non renseignée"}</p><p className="mt-1 text-[10px] text-foodiz-gray">SIRET {partner.siret || "manquant"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] uppercase ${partner.status === "active" ? "bg-foodiz-green/10 text-foodiz-green" : partner.status === "suspended" || partner.status === "rejected" ? "bg-foodiz-red/10 text-foodiz-red" : "bg-foodiz-gold/10 text-foodiz-gold"}`}>{statusLabel[partner.status] || partner.status}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.02] p-3 text-xs"><div><p className="text-[9px] uppercase text-foodiz-gray">Dossier</p><p className="mt-1 text-foodiz-cream">{partner.application?.status || "Non retrouvé"}</p></div><div><p className="text-[9px] uppercase text-foodiz-gray">Localisation</p><p className={`mt-1 ${Number.isFinite(Number(partner.latitude)) && Number.isFinite(Number(partner.longitude)) ? "text-foodiz-green" : "text-foodiz-red"}`}>{Number.isFinite(Number(partner.latitude)) && Number.isFinite(Number(partner.longitude)) ? "Vérifiée" : "Manquante"}</p></div><div><p className="text-[9px] uppercase text-foodiz-gray">Foodiz+</p><p className="mt-1 text-foodiz-cream">{partner.subscription?.plan?.name || "Aucun forfait"}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => navigate(`/admin/partners/${partner.id}`)} className="flex items-center gap-2 rounded-xl bg-foodiz-gold px-4 py-2 text-xs font-semibold text-foodiz-black"><Eye size={15}/>Vue 360°</button>{partner.status !== "active" && <button disabled={busy === partner.id || !Number.isFinite(Number(partner.latitude)) || !Number.isFinite(Number(partner.longitude))} title={!Number.isFinite(Number(partner.latitude)) ? "Adresse vérifiée obligatoire" : undefined} onClick={() => void updateStatus(partner, "active")} className="flex items-center gap-2 rounded-xl border border-foodiz-green/30 bg-foodiz-green/10 px-3 py-2 text-xs text-foodiz-green disabled:opacity-30"><CheckCircle2 size={15}/>Valider</button>}<button disabled={busy === partner.id} onClick={() => void updateStatus(partner, "missing_documents")} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-foodiz-gray disabled:opacity-50"><AlertCircle size={15}/>Pièces manquantes</button>{partner.status === "active" && <button disabled={busy === partner.id} onClick={() => void updateStatus(partner, "suspended")} className="flex items-center gap-2 rounded-xl border border-foodiz-red/20 px-3 py-2 text-xs text-foodiz-red disabled:opacity-50"><ShieldOff size={15}/>Suspendre</button>}</div>
      </article>;
    })}</div>}
  </AdminShell>;
}
