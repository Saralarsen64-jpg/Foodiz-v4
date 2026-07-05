import { useEffect, useMemo, useState } from "react";
import { Bike, RefreshCw, Search, ShieldOff, Store, UserRound, UserRoundCheck } from "lucide-react";
import toast from "react-hot-toast";

import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,role,email,full_name,first_name,last_name,phone,city,status,created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.full_name, user.first_name, user.last_name, user.email, user.phone, user.city, user.role]
        .some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [search, users]);

  const updateClientStatus = async (user: any, status: "active" | "suspended") => {
    const reason = status === "suspended"
      ? window.prompt("Motif obligatoire de la suspension :")?.trim()
      : "Réactivation validée par l'administration";
    if (!reason) return;
    setBusy(user.id);
    const { error } = await supabase.rpc("admin_set_client_status", {
      target_user_id: user.id,
      target_status: status,
      target_reason: reason,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(status === "suspended" ? "Compte client suspendu." : "Compte client réactivé.");
      await load();
    }
    setBusy("");
  };

  const iconFor = (role: string) => role === "partner" ? Store : role === "courier" ? Bike : UserRound;

  return <AdminShell title="Utilisateurs" subtitle="Recherche, contrôle des comptes clients et orientation vers les validations métier">
    <div className="flex gap-3">
      <label className="foodiz-card flex flex-1 items-center gap-3 px-4 py-3"><Search size={17} className="text-foodiz-gold"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, email, téléphone, ville ou rôle" className="w-full bg-transparent text-sm outline-none placeholder:text-foodiz-gray"/></label>
      <button onClick={() => void load()} className="rounded-xl border border-foodiz-gold/20 px-4 text-foodiz-gold"><RefreshCw size={17}/></button>
    </div>
    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement des utilisateurs...</div> : <div className="grid gap-3 xl:grid-cols-2">{filtered.map((user) => {
      const Icon = iconFor(user.role);
      const name = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Utilisateur Weello";
      return <article key={user.id} className="foodiz-card p-5">
        <div className="flex items-start gap-4"><div className="rounded-2xl bg-foodiz-gold/10 p-3 text-foodiz-gold"><Icon size={20}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate font-semibold text-foodiz-cream">{name}</p><span className={`rounded-full px-2 py-1 text-[9px] uppercase ${user.status === "suspended" ? "bg-foodiz-red/10 text-foodiz-red" : "bg-foodiz-green/10 text-foodiz-green"}`}>{user.status || "active"}</span></div><p className="mt-1 truncate text-xs text-foodiz-gray">{user.email || "Email absent"} · {user.phone || "Téléphone absent"}</p><p className="mt-1 text-[10px] uppercase text-foodiz-gray">{user.role} · {user.city || "Ville absente"} · inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}</p></div></div>
        <div className="mt-4 flex justify-end gap-2">{user.role === "client" ? user.status === "suspended" ? <button disabled={busy === user.id} onClick={() => void updateClientStatus(user, "active")} className="flex items-center gap-2 rounded-xl border border-foodiz-green/30 px-3 py-2 text-xs text-foodiz-green disabled:opacity-50"><UserRoundCheck size={14}/>Réactiver</button> : <button disabled={busy === user.id} onClick={() => void updateClientStatus(user, "suspended")} className="flex items-center gap-2 rounded-xl border border-foodiz-red/25 px-3 py-2 text-xs text-foodiz-red disabled:opacity-50"><ShieldOff size={14}/>Suspendre</button> : <span className="text-[10px] text-foodiz-gray">Gestion depuis l'espace {user.role === "partner" ? "Partenaires" : "Livreurs"}</span>}</div>
      </article>;
    })}</div>}
  </AdminShell>;
}
